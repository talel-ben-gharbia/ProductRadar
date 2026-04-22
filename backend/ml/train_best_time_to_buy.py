from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error

from best_time_to_buy_model import BestTimeToBuyModel, ModelConfig


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train the Best Time To Buy model.")
    parser.add_argument("--data", required=True, help="Path to the exported CSV file.")
    parser.add_argument(
        "--output",
        default="artifacts/best_time_to_buy_model.joblib",
        help="Where to save the trained model.",
    )
    parser.add_argument("--lookback", type=int, default=3, help="How many past prices to use.")
    parser.add_argument(
        "--drop-threshold",
        type=float,
        default=0.02,
        help="Minimum expected drop ratio to recommend waiting.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    history_df = pd.read_csv(args.data)
    config = ModelConfig(
        lookback_days=args.lookback,
        horizon_days=7,
        min_drop_ratio_to_wait=args.drop_threshold,
    )
    model = BestTimeToBuyModel(config)

    # Build one training row for each point where the next price is known.
    X, y = model.make_training_samples(history_df)

    if len(X) < 20:
        model.fit(X, y)
        model.save(args.output)
        print(f"Trained on {len(X)} samples and saved model to {Path(args.output).resolve()}")
        return

    split_idx = int(len(X) * 0.8)
    X_train, X_val = X[:split_idx], X[split_idx:]
    y_train, y_val = y[:split_idx], y[split_idx:]

    model.fit(X_train, y_train)
    linear_pred = model.linear_model.predict(X_val)
    rf_pred = model.random_forest.predict(X_val)
    xgb_pred = model.xgboost_model.predict(X_val)
    blended_pred = (linear_pred + rf_pred + xgb_pred) / 3.0

    mae = mean_absolute_error(y_val, blended_pred)
    print(f"Validation MAE: {mae:.4f}")

    # Refit on all samples before saving.
    model.fit(X, y)
    model.save(args.output)
    print(f"Saved model to: {Path(args.output).resolve()}")


if __name__ == "__main__":
    main()
