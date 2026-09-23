"""Training script for telemetry anomaly detection using RandomForestClassifier."""
import json
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, f1_score, precision_score, recall_score
from sklearn.model_selection import train_test_split

MODEL_DIR = Path(__file__).resolve().parent.parent / "models"
MODEL_DIR.mkdir(parents=True, exist_ok=True)


def generate_anomaly_dataset(n_samples: int = 2000, random_state: int = 42) -> pd.DataFrame:
    np.random.seed(random_state)
    rows = []
    for _ in range(n_samples):
        baseline_idle = np.random.uniform(15, 25)
        # Normal vs Anomaly (70% normal, 30% anomaly)
        is_anomaly = np.random.rand() < 0.3

        if is_anomaly:
            # Excessive idle anomaly
            idle_time = baseline_idle * np.random.uniform(1.6, 2.8)
            engine_load = np.random.uniform(20, 50)
            fuel_used = np.random.uniform(18, 30)
            load_cycles = np.random.randint(10, 20)
        else:
            idle_time = baseline_idle * np.random.uniform(0.7, 1.3)
            engine_load = np.random.uniform(50, 85)
            fuel_used = np.random.uniform(12, 22)
            load_cycles = np.random.randint(20, 35)

        idle_ratio = idle_time / baseline_idle
        rows.append({
            "idle_time": round(idle_time, 1),
            "baseline_idle": round(baseline_idle, 1),
            "idle_ratio": round(idle_ratio, 2),
            "engine_load": round(engine_load, 1),
            "fuel_used": round(fuel_used, 1),
            "load_cycles": load_cycles,
            "is_anomaly": int(is_anomaly),
        })

    return pd.DataFrame(rows)


def train():
    df = generate_anomaly_dataset()
    features = ["idle_time", "baseline_idle", "idle_ratio", "engine_load", "fuel_used", "load_cycles"]
    X = df[features]
    y = df["is_anomaly"]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = RandomForestClassifier(n_estimators=100, max_depth=6, random_state=42)
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    prec = precision_score(y_test, y_pred)
    rec = recall_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)

    print(f"Anomaly Classifier Trained:")
    print(f"  Precision: {prec:.4f}")
    print(f"  Recall:    {rec:.4f}")
    print(f"  F1-Score:  {f1:.4f}")

    model_path = MODEL_DIR / "anomaly_detector_rf.joblib"
    joblib.dump({"model": model, "feature_cols": features}, model_path)

    metadata = {
        "model_version": "RandomForestClassifier-v1.1",
        "algorithm": "RandomForestClassifier",
        "features": features,
        "metrics": {"precision": round(prec, 4), "recall": round(rec, 4), "f1": round(f1, 4)},
        "trained_samples": len(df),
    }
    with open(MODEL_DIR / "anomaly_metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"Saved model to {model_path}")


if __name__ == "__main__":
    train()
