from __future__ import annotations

from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Iterable

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression
from xgboost import XGBRegressor


@dataclass(frozen=True)
class ModelConfig:
    lookback_days: int = 3
    horizon_days: int = 7
    min_drop_ratio_to_wait: float = 0.02


class BestTimeToBuyModel:
    def __init__(self, config: ModelConfig | None = None) -> None:
        self.config = config or ModelConfig()

        # Three simple regressors. The final prediction is the average of them.
        self.linear_model = LinearRegression()
        self.random_forest = RandomForestRegressor(
            n_estimators=200,
            max_depth=8,
            random_state=42,
            n_jobs=-1,
        )
        self.xgboost_model = XGBRegressor(
            n_estimators=200,
            learning_rate=0.05,
            max_depth=4,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42,
            objective="reg:squarederror",
            n_jobs=-1,
        )
        self.is_fitted = False

    @staticmethod
    def _linear_slope(values: np.ndarray) -> float:
        # Small helper to measure the direction of recent prices.
        if len(values) < 2:
            return 0.0

        x = np.arange(len(values), dtype=float)
        x_centered = x - x.mean()
        y_centered = values - values.mean()
        denominator = float(np.dot(x_centered, x_centered))
        if denominator <= 1e-9:
            return 0.0

        return float(np.dot(x_centered, y_centered) / denominator)

    @classmethod
    def _build_features(
        cls,
        prices: np.ndarray,
        anomaly_rate: float,
        out_of_stock_rate: float,
        trust_score: float,
    ) -> np.ndarray:
        # Keep the features small and easy to understand.
        current_price = float(prices[-1])
        previous_1 = float(prices[-2]) if len(prices) >= 2 else current_price
        previous_2 = float(prices[-3]) if len(prices) >= 3 else previous_1
        previous_3 = float(prices[-4]) if len(prices) >= 4 else previous_2

        recent = prices[-3:]
        mean_3 = float(np.mean(recent))
        std_3 = float(np.std(recent))
        min_3 = float(np.min(recent))
        max_3 = float(np.max(recent))
        slope_3 = cls._linear_slope(recent)
        momentum_3 = 0.0 if mean_3 <= 0 else (current_price - mean_3) / mean_3
        trust_normalized = max(0.0, min(100.0, trust_score)) / 100.0

        return np.array(
            [
                current_price,
                previous_1,
                previous_2,
                previous_3,
                mean_3,
                std_3,
                min_3,
                max_3,
                slope_3,
                momentum_3,
                float(anomaly_rate),
                float(out_of_stock_rate),
                trust_normalized,
            ],
            dtype=float,
        )

    @staticmethod
    def _ensure_required_columns(df: pd.DataFrame) -> None:
        required = {"listing_id", "recorded_at", "recorded_price"}
        missing = [column for column in required if column not in df.columns]
        if missing:
            raise ValueError(f"Missing required columns: {', '.join(missing)}")

    def make_training_samples(self, history_df: pd.DataFrame) -> tuple[np.ndarray, np.ndarray]:
        # Convert the exported CSV into supervised learning samples.
        self._ensure_required_columns(history_df)

        df = history_df.copy()
        df["recorded_at"] = pd.to_datetime(df["recorded_at"], errors="coerce", utc=True)
        df = df.dropna(subset=["recorded_at", "recorded_price"])

        if "anomaly" not in df.columns:
            df["anomaly"] = 0
        if "out_of_stock" not in df.columns:
            df["out_of_stock"] = 0
        if "trust_score" not in df.columns:
            df["trust_score"] = 50.0

        df = df.sort_values(["listing_id", "recorded_at"]).reset_index(drop=True)

        feature_rows: list[np.ndarray] = []
        labels: list[float] = []

        for _, listing_rows in df.groupby("listing_id", sort=False):
            prices = listing_rows["recorded_price"].astype(float).to_numpy()
            anomalies = listing_rows["anomaly"].astype(float).to_numpy()
            out_of_stock = listing_rows["out_of_stock"].astype(float).to_numpy()
            trust_scores = listing_rows["trust_score"].astype(float).to_numpy()

            if len(prices) < self.config.lookback_days + 1:
                continue

            for i in range(self.config.lookback_days, len(prices)):
                past_prices = prices[i - self.config.lookback_days : i + 1]
                if len(past_prices) < self.config.lookback_days + 1:
                    continue

                anomaly_rate = float(np.mean(anomalies[max(0, i - self.config.lookback_days) : i + 1]))
                out_of_stock_rate = float(np.mean(out_of_stock[max(0, i - self.config.lookback_days) : i + 1]))
                trust_score = float(trust_scores[i])

                feature_rows.append(
                    self._build_features(
                        past_prices,
                        anomaly_rate=anomaly_rate,
                        out_of_stock_rate=out_of_stock_rate,
                        trust_score=trust_score,
                    )
                )
                labels.append(float(prices[i]))

        if not feature_rows:
            raise ValueError("No training samples built. Need enough listings with at least 4 rows.")

        return np.vstack(feature_rows), np.array(labels)

    def fit(self, X: np.ndarray, y: np.ndarray) -> None:
        # Fit all three models on the same target.
        self.linear_model.fit(X, y)
        self.random_forest.fit(X, y)
        self.xgboost_model.fit(X, y)
        self.is_fitted = True

    def _predict_next_price(self, features: np.ndarray) -> float:
        # Blend the three predictions with a simple average.
        predictions = [
            float(self.linear_model.predict(features)[0]),
            float(self.random_forest.predict(features)[0]),
            float(self.xgboost_model.predict(features)[0]),
        ]
        return float(np.mean(predictions))

    def predict(self, history_rows: Iterable[dict[str, object]], trust_score: float | None = None) -> dict[str, float | int | str]:
        # Use the last rows from the listing to predict the next few prices.
        rows = list(history_rows)
        if len(rows) < 4:
            raise ValueError("At least 4 history rows are required for prediction.")

        prices = np.array(
            [float(row["recorded_price"]) for row in rows if row.get("recorded_price") is not None],
            dtype=float,
        )
        if len(prices) < 4:
            raise ValueError("Not enough valid recorded_price values for prediction.")

        anomaly_values = np.array([float(bool(row.get("anomaly", False))) for row in rows], dtype=float)
        out_of_stock_values = np.array([float(bool(row.get("out_of_stock", False))) for row in rows], dtype=float)

        resolved_trust_score = trust_score
        if resolved_trust_score is None:
            for row in reversed(rows):
                row_score = row.get("trust_score")
                if isinstance(row_score, (int, float)):
                    resolved_trust_score = float(row_score)
                    break
        if resolved_trust_score is None:
            resolved_trust_score = 50.0

        lookback = min(self.config.lookback_days, len(prices) - 1)
        recent_prices = prices[-(lookback + 1) :]
        recent_anomalies = anomaly_values[-(lookback + 1) :]
        recent_out_of_stock = out_of_stock_values[-(lookback + 1) :]

        features = self._build_features(
            recent_prices,
            anomaly_rate=float(np.mean(recent_anomalies)),
            out_of_stock_rate=float(np.mean(recent_out_of_stock)),
            trust_score=float(resolved_trust_score),
        ).reshape(1, -1)

        current_price = float(prices[-1])
        horizon_days = self.config.horizon_days

        # Forecast forward by repeating the next prediction.
        next_price = self._predict_next_price(features) if self.is_fitted else current_price
        next_price = max(0.01, next_price)

        forecast: list[float] = []
        for _ in range(horizon_days):
            forecast.append(next_price)

        predicted_best_price = float(min(forecast))
        best_day_offset = int(np.argmin(forecast)) + 1

        expected_drop_ratio = 0.0
        if current_price > 0:
            expected_drop_ratio = max(0.0, (current_price - predicted_best_price) / current_price)

        action = "WAIT" if expected_drop_ratio >= self.config.min_drop_ratio_to_wait else "BUY_NOW"
        confidence = float(max(0.0, min(1.0, 1.0 - abs(expected_drop_ratio - 0.05))))

        return {
            "action": action,
            "wait_probability": round(min(0.99, max(0.01, expected_drop_ratio)), 4),
            "best_day_offset": best_day_offset,
            "predicted_best_price": round(predicted_best_price, 2),
            "current_price": round(current_price, 2),
            "expected_drop_percent": round(expected_drop_ratio * 100.0, 2),
            "confidence": round(confidence, 4),
            "horizon_days": horizon_days,
            "min_drop_ratio_to_wait": self.config.min_drop_ratio_to_wait,
        }

    def save(self, output_path: str | Path) -> None:
        # Save the fitted model.
        path = Path(output_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(
            {
                "config": asdict(self.config),
                "linear_model": self.linear_model,
                "random_forest": self.random_forest,
                "xgboost_model": self.xgboost_model,
                "is_fitted": self.is_fitted,
            },
            path,
        )

    @classmethod
    def load(cls, model_path: str | Path) -> "BestTimeToBuyModel":
        # Load the saved model file.
        payload = joblib.load(Path(model_path))
        model = cls(ModelConfig(**payload["config"]))
        model.linear_model = payload["linear_model"]
        model.random_forest = payload["random_forest"]
        model.xgboost_model = payload["xgboost_model"]
        model.is_fitted = bool(payload.get("is_fitted", True))
        return model