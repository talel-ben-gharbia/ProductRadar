# Best Time To Buy ML Model

## What it does
This version is simple and easy to read.

It uses 3 models:
- Linear Regression
- Random Forest Regressor
- XGBoost Regressor

The 3 predictions are averaged together.

It predicts the next likely price from recent history and turns that into:
- `action`: `BUY_NOW` or `WAIT`
- `best_day_offset`: best day in the forecast window
- `predicted_best_price`: expected next price
- `current_price`: latest known price
- `expected_drop_percent`: estimated drop from now
- `confidence`: simple confidence score

## Features used
The code uses only easy features:
- current price
- previous 1, 2, 3 prices
- mean of recent prices
- standard deviation
- min and max of recent prices
- slope of the recent trend
- momentum
- anomaly rate
- out-of-stock rate
- trust score

## Training data
The CSV must contain:
- `listing_id`
- `recorded_at`
- `recorded_price`

Optional:
- `anomaly`
- `out_of_stock`
- `trust_score`

## Train it
From `backend/ml`:

```bash
python train_best_time_to_buy.py --data data/best_time_to_buy_training.csv --output artifacts/best_time_to_buy_model.joblib
```

## Run inference API
```bash
uvicorn inference_api:app --host 0.0.0.0 --port 8010 --reload
```

## Why this version
It is easy to read, still simple enough to debug, and trained on your actual database export.
