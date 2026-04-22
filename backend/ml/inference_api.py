from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from best_time_to_buy_model import BestTimeToBuyModel


MODEL_PATH = Path(
    os.getenv(
        "BEST_TIME_TO_BUY_MODEL_PATH",
        str(Path(__file__).resolve().parent / "artifacts" / "best_time_to_buy_model.joblib"),
    )
)

app = FastAPI(title="ProductRdar Best Time To Buy API", version="1.0.0")
_model: BestTimeToBuyModel | None = None


class HistoryRow(BaseModel):
    recorded_price: float = Field(..., gt=0)
    anomaly: bool = False
    out_of_stock: bool = False
    trust_score: float | None = Field(default=None, ge=0, le=100)


class PredictionRequest(BaseModel):
    rows: list[HistoryRow] = Field(..., min_length=4)
    trust_score: float | None = Field(default=None, ge=0, le=100)


@app.on_event("startup")
def load_model_on_startup() -> None:
    global _model
    if MODEL_PATH.exists():
        _model = BestTimeToBuyModel.load(MODEL_PATH)


@app.get("/health")
def health() -> dict[str, str]:
    return {
        "status": "ok" if _model is not None else "model_not_loaded",
        "model_path": str(MODEL_PATH),
    }


@app.post("/predict")
def predict(payload: PredictionRequest) -> dict[str, float | int | str]:
    if _model is None:
        raise HTTPException(
            status_code=503,
            detail="Model is not loaded. Train and save the model first.",
        )

    try:
        rows = [row.model_dump() for row in payload.rows]
        return _model.predict(rows, trust_score=payload.trust_score)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
