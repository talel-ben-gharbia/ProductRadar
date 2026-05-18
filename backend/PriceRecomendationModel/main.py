"""
FastAPI — Price Recommendation microservice
Run: uvicorn main:app --host 0.0.0.0 --port 8002

Compatible with Symfony BestTimeToBuyApiClient input format
and PriceHistoryController + frontend expected output format.
"""
from __future__ import annotations

import json
from datetime import datetime
from functools import lru_cache
from pathlib import Path
from typing import Any

import numpy as np
import xgboost as xgb
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, field_validator

# ── Config ────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent

with (BASE_DIR / "model_meta.json").open() as f:
    META = json.load(f)

FEATURES  : list[str] = META["features"]
THRESHOLD : float     = float(META["threshold"])
VERSION   : str       = META["version"]
HORIZON_DAYS: int     = 14
MIN_DROP_RATIO: float = THRESHOLD


# ── Model (loaded once, reused for every request) ─────────────
@lru_cache(maxsize=1)
def get_model() -> xgb.Booster:
    booster = xgb.Booster()
    booster.load_model(str(BASE_DIR / META["model_file"]))  # model.xgb
    return booster


# ═════════════════════════════════════════════════════════════
# Schemas — compatible with Symfony BestTimeToBuyApiClient
# ═════════════════════════════════════════════════════════════
class PriceRecord(BaseModel):
    recorded_price : float
    anomaly        : bool = False
    out_of_stock   : bool = False
    recorded_at    : str | None = None   # ISO 8601 optional for backward compat

    @field_validator("recorded_price")
    @classmethod
    def must_be_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("recorded_price must be > 0")
        return v


class PredictRequest(BaseModel):
    rows       : list[PriceRecord]
    trust_score: float | None = None

    @field_validator("rows")
    @classmethod
    def min_two_records(cls, v: list) -> list:
        if len(v) < 2:
            raise ValueError("rows must contain at least 2 records")
        return v


class PredictionPayload(BaseModel):
    action        : str    # "BUY_NOW" | "WAIT"
    current_price : float
    confidence    : float  # 0.0–1.0


class PredictResponse(BaseModel):
    prediction     : PredictionPayload
    model_version  : str
    prediction_source: str  # "model" | "fallback"


# ═════════════════════════════════════════════════════════════
# Feature computation
# ═════════════════════════════════════════════════════════════
def _safe(v: Any, fallback: float = 0.0) -> float:
    """Cast to float and replace NaN/Inf with fallback."""
    try:
        f = float(v)
        return f if np.isfinite(f) else fallback
    except (TypeError, ValueError):
        return fallback


def build_features(history: list[PriceRecord]) -> dict[str, float]:
    """
    Compute all features for the LAST (most recent) record.
    Uses only past data at each step — no future leakage.
    """
    rows   = sorted(history, key=lambda r: r.recorded_at or "")
    prices = [r.recorded_price for r in rows]
    n      = len(prices)
    p      = prices[-1]   # current price

    p_min  = min(prices)
    p_max  = max(prices)
    p_mean = float(np.mean(prices))
    p_std  = float(np.std(prices, ddof=1)) if n > 1 else 0.0

    percentile_rank = sum(1 for x in prices if x <= p) / n

    oos_flags     = [int(r.out_of_stock) for r in rows]
    anomaly_flags = [int(r.anomaly)      for r in rows]

    return {
        "price_percentile_rank" : _safe(percentile_rank),
        "pct_above_min"         : _safe((p - p_min) / p_min if p_min > 0 else 0),
        "pct_below_max"         : _safe((p_max - p) / p_max if p_max > 0 else 0),
        "price_zscore"          : _safe((p - p_mean) / p_std if p_std > 0 else 0),
        "price_change_pct"      : _safe((p - prices[-2]) / prices[-2] if n >= 2 and prices[-2] > 0 else 0),
        "price_lag1"            : _safe(prices[-2] if n >= 2 else p),
        "price_lag2"            : _safe(prices[-3] if n >= 3 else p),
        "price_lag3"            : _safe(prices[-4] if n >= 4 else p),
        "oos_rate_hist"         : _safe(sum(oos_flags) / n),
        "was_oos_last"          : _safe(oos_flags[-2] if n >= 2 else 0),
        "n_records_so_far"      : _safe(n),
        "price_range_pct"       : _safe((p_max - p_min) / p_min if p_min > 0 else 0),
        "is_new_low"            : _safe(int(p <= p_min)),
        "is_new_high"           : _safe(int(p >= p_max)),
        "is_anomaly"            : _safe(anomaly_flags[-1]),
        "anomaly_rate_hist"     : _safe(sum(anomaly_flags) / n),
    }


def _forecast_best_price(prices: list[float], horizon_days: int = HORIZON_DAYS) -> tuple[int, float, float]:
    """
    Linear regression forecast over the given horizon.
    Returns (best_day_offset, predicted_best_price, expected_drop_percent).
    """
    n = len(prices)
    if n < 2:
        return 0, prices[-1], 0.0

    x = np.arange(n, dtype=float)
    y = np.array(prices, dtype=float)
    A = np.vstack([x, np.ones(n)]).T
    slope, intercept = np.linalg.lstsq(A, y, rcond=None)[0]

    current_price = prices[-1]
    best_price = current_price
    best_day = 0

    for day in range(1, horizon_days + 1):
        predicted = max(0.01, intercept + slope * (n - 1 + day))
        if predicted < best_price:
            best_price = predicted
            best_day = day

    drop_percent = max(0.0, ((current_price - best_price) / current_price) * 100) if current_price > 0 else 0.0
    return best_day, round(best_price, 2), round(drop_percent, 2)


def _price_position(rank: float) -> str:
    if rank < 0.3:
        return "LOW"
    if rank < 0.7:
        return "MEDIUM"
    return "HIGH"


# ═════════════════════════════════════════════════════════════
# App & endpoints
# ═════════════════════════════════════════════════════════════
app = FastAPI(title="Price Recommendation API", version=VERSION)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "model_version": VERSION}


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest) -> PredictResponse:
    rows = req.rows
    prices = [r.recorded_price for r in rows]
    current_price = prices[-1]
    n = len(prices)

    # 1. Compute features
    try:
        feat = build_features(rows)
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))

    # 2. Validate all expected features are present
    missing = [f for f in FEATURES if f not in feat]
    if missing:
        raise HTTPException(status_code=500, detail=f"Missing features: {missing}")

    # 3. Price forecast (always computed)
    best_day_offset, predicted_best_price, expected_drop_percent = _forecast_best_price(prices)

    prediction_source = "model"
    try:
        # 4. Build DMatrix — XGBoost's native input format
        X    = np.array([[feat[f] for f in FEATURES]], dtype=np.float32)
        dmat = xgb.DMatrix(X, feature_names=FEATURES)

        # 5. Predict
        raw  = get_model().predict(dmat)
        prob = float(raw[0]) if raw.ndim == 1 else float(raw[0][1])
        wait_probability = prob

    except Exception:
        # XGBoost fallback — use heuristic
        wait_probability = min(0.95, max(0.05, expected_drop_percent / 12.0))
        prediction_source = "fallback"

    # 6. Decision
    should_wait = wait_probability >= THRESHOLD and predicted_best_price < current_price
    action = "WAIT" if should_wait else "BUY_NOW"

    # 7. Confidence: blend wait_probability (70%) and data volume (30%)
    confidence = round(
        wait_probability * 0.7 + min(1.0, n / 10) * 0.3,
        4,
    )

    # 8. Trust score boost
    if req.trust_score is not None and req.trust_score > 0:
        confidence = min(1.0, confidence + (req.trust_score / 100.0) * 0.1)

    return PredictResponse(
        prediction=PredictionPayload(
            action=action,
            current_price=round(current_price, 2),
            confidence=confidence,
        ),
        model_version=VERSION,
        prediction_source=prediction_source,
    )


@app.post("/predict/batch", response_model=list[PredictResponse])
def predict_batch(requests: list[PredictRequest]) -> list[PredictResponse]:
    """Predict for multiple products in one call."""
    return [predict(req) for req in requests]
