"""Training script for task duration prediction using RandomForestRegressor."""
import json
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split

MODEL_DIR = Path(__file__).resolve().parent.parent / "models"
MODEL_DIR.mkdir(parents=True, exist_ok=True)


def generate_task_dataset(n_samples: int = 1500, random_state: int = 42) -> pd.DataFrame:
    np.random.seed(random_state)
    task_types = ["Excavation", "Loading", "Grading", "Material movement"]
    weathers = ["Clear", "Sunny", "Cloudy", "Rain", "Windy"]
    skills = ["Beginner", "Intermediate", "Expert"]

    task_base_duration = {"Excavation": 70, "Loading": 45, "Grading": 52, "Material movement": 58}
    weather_impact = {"Clear": 0, "Sunny": -1, "Cloudy": 1, "Rain": 8, "Windy": 4}
    skill_impact = {"Beginner": 8, "Intermediate": 0, "Expert": -6}

    rows = []
    for _ in range(n_samples):
        tt = np.random.choice(task_types)
        wt = np.random.choice(weathers)
        sk = np.random.choice(skills)
        machine_age = np.random.randint(1, 10)
        baseline = task_base_duration[tt] + np.random.normal(0, 3)
        idle_reduction = np.random.uniform(0, 30)

        # Target duration
        duration = (
            baseline
            + weather_impact[wt]
            + skill_impact[sk]
            + machine_age * 0.85
            - (idle_reduction * 0.35)
            + np.random.normal(0, 2)
        )
        duration = max(20.0, duration)

        rows.append({
            "task_type": tt,
            "weather": wt,
            "operator_skill": sk,
            "machine_age": machine_age,
            "baseline_duration": round(baseline, 1),
            "idle_reduction": round(idle_reduction, 1),
            "actual_duration": round(duration, 1),
        })

    return pd.DataFrame(rows)


def train():
    df = generate_task_dataset()
    features = ["machine_age", "baseline_duration", "idle_reduction"]
    
    # One-hot encode categoricals
    df_encoded = pd.get_dummies(df, columns=["task_type", "weather", "operator_skill"], drop_first=False)
    feature_cols = [c for c in df_encoded.columns if c != "actual_duration"]

    X = df_encoded[feature_cols]
    y = df_encoded["actual_duration"]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = RandomForestRegressor(n_estimators=100, max_depth=8, random_state=42)
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    r2 = r2_score(y_test, y_pred)

    print(f"Task Duration Model Trained:")
    print(f"  MAE: {mae:.2f} min")
    print(f"  RMSE: {rmse:.2f} min")
    print(f"  R² Score: {r2:.4f}")

    # Save model and artifacts
    model_path = MODEL_DIR / "task_duration_rf.joblib"
    joblib.dump({"model": model, "feature_cols": feature_cols}, model_path)

    metadata = {
        "model_version": "RandomForestRegressor-v1.2",
        "algorithm": "RandomForestRegressor",
        "features": feature_cols,
        "metrics": {"mae": round(mae, 2), "rmse": round(rmse, 2), "r2": round(r2, 4)},
        "trained_samples": len(df),
    }
    with open(MODEL_DIR / "task_duration_metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"Saved model to {model_path}")


if __name__ == "__main__":
    train()
