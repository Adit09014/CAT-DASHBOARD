"""Training script for task completion time estimation using CatBoost and RandomForest."""
import json
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split

MODEL_DIR = Path(__file__).resolve().parent.parent / "models"
MODEL_DIR.mkdir(parents=True, exist_ok=True)

CSV_DATA_PATH = Path(__file__).resolve().parent.parent.parent / "Time Estimation" / "synthetic_task_time_data.csv"


def train_catboost_from_dataset(csv_path: Path):
    from catboost import CatBoostRegressor

    print(f"Loading dataset from: {csv_path}")
    df = pd.read_csv(csv_path, parse_dates=["Task_Date"])
    df = df.sort_values("Task_Date").reset_index(drop=True)
    df["month"] = df["Task_Date"].dt.month
    df["day_of_week"] = df["Task_Date"].dt.dayofweek

    drop_cols = ["Task_ID", "Task_Date", "Machine_ID", "Operator_ID", "Actual_Time_min"]
    X = df.drop(columns=drop_cols)
    y = df["Actual_Time_min"]

    cat_cols = X.select_dtypes(include=["object"]).columns.tolist()
    feature_cols = X.columns.tolist()

    n = len(X)
    train_end, val_end = int(n * 0.70), int(n * 0.85)

    X_train, y_train = X.iloc[:train_end], y.iloc[:train_end]
    X_val, y_val = X.iloc[train_end:val_end], y.iloc[train_end:val_end]
    X_test, y_test = X.iloc[val_end:], y.iloc[val_end:]

    print(f"Dataset split: Train {X_train.shape}, Val {X_val.shape}, Test {X_test.shape}")
    print(f"Categorical features: {cat_cols}")

    cb = CatBoostRegressor(
        loss_function="RMSE",
        iterations=1500,
        learning_rate=0.04,
        depth=6,
        l2_leaf_reg=6,
        random_seed=42,
        od_type="Iter",
        od_wait=100,
        verbose=0,
        allow_writing_files=False,
    )
    cb.fit(X_train, y_train, cat_features=cat_cols, eval_set=(X_val, y_val), verbose=0)

    y_pred = cb.predict(X_test)
    mae = float(mean_absolute_error(y_test, y_pred))
    rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))
    r2 = float(r2_score(y_test, y_pred))
    mape = float(np.mean(np.abs((y_test - y_pred) / y_test)) * 100)

    print("\nCatBoost Model Evaluation (Test Set):")
    print(f"  MAE:  {mae:.2f} min")
    print(f"  RMSE: {rmse:.2f} min")
    print(f"  R²:   {r2:.4f}")
    print(f"  MAPE: {mape:.2f}%")

    # Save metadata
    metadata = {
        "model_version": "CatBoostRegressor-v1.0",
        "algorithm": "CatBoostRegressor",
        "dataset": "synthetic_task_time_data.csv",
        "training_samples": len(X_train),
        "test_samples": len(X_test),
        "features": feature_cols,
        "categorical_features": cat_cols,
        "metrics": {
            "mae": round(mae, 2),
            "rmse": round(rmse, 2),
            "r2": round(r2, 4),
            "mape_percent": round(mape, 2),
        },
    }
    with open(MODEL_DIR / "task_duration_metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"Saved evaluation metadata to {MODEL_DIR / 'task_duration_metadata.json'}")
    return cb, metadata


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


def train_fallback():
    df = generate_task_dataset()
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

    print(f"Fallback Random Forest Model Trained: MAE={mae:.2f}, R2={r2:.4f}")
    model_path = MODEL_DIR / "task_duration_rf.joblib"
    joblib.dump({"model": model, "feature_cols": feature_cols}, model_path)


def train():
    if CSV_DATA_PATH.exists():
        try:
            train_catboost_from_dataset(CSV_DATA_PATH)
            return
        except Exception as e:
            print(f"CatBoost training encounter exception: {e}, falling back to synthetic generator...")
    train_fallback()


if __name__ == "__main__":
    train()
