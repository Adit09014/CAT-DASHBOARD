from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services import (
    get_catboost_time_model,
    predict_task_time_catboost,
    get_time_dataset_statistics,
    get_time_dataset_sample,
)

client = TestClient(app)


def get_auth_token(email: str = "operator@catguardian.demo", password: str = "Operator123!") -> str:
    response = client.post("/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200
    return response.json()["access_token"]


def test_catboost_model_loaded():
    model = get_catboost_time_model()
    assert model is not None
    assert len(model.feature_names_) == 18
    assert "Task_Type" in model.feature_names_
    assert "Breakdown_Occurred" in model.feature_names_
    assert "Permit_Setup_Delay_min" in model.feature_names_


def test_predict_task_time_catboost_normal():
    payload = {
        "task_type": "Material_Loading",
        "task_area_sqm": 200.0,
        "material_type": "Soil",
        "ground_condition": "Normal",
        "ground_slope_deg": 4.0,
        "site_distance_km": 2.5,
        "weather": "Sunny",
        "temperature_c": 24.0,
        "crew_size": 3,
        "operator_skill": "Intermediate",
        "operator_experience_months": 48,
        "machine_age_yrs": 5.0,
        "machine_condition": "Good",
        "permit_setup_delay_min": 0.0,
        "breakdown_occurred": "No",
        "estimated_time_min": 180.0,
        "month": 9,
        "day_of_week": 3,
    }
    result = predict_task_time_catboost(payload)
    assert "predicted_time_min" in result
    assert result["predicted_time_min"] > 0
    assert result["delay_risk_level"] in ("ON_SCHEDULE", "MINOR_DELAY_RISK", "CRITICAL_DELAY_RISK")
    assert "factor_contributions" in result


def test_predict_task_time_catboost_breakdown_delay():
    payload = {
        "task_type": "Material_Loading",
        "task_area_sqm": 250.0,
        "material_type": "Rock",
        "ground_condition": "Rocky",
        "ground_slope_deg": 12.0,
        "site_distance_km": 15.0,
        "weather": "Rainy",
        "temperature_c": 20.0,
        "crew_size": 2,
        "operator_skill": "Beginner",
        "operator_experience_months": 12,
        "machine_age_yrs": 9.0,
        "machine_condition": "Poor",
        "permit_setup_delay_min": 40.0,
        "breakdown_occurred": "Yes",
        "estimated_time_min": 180.0,
    }
    result = predict_task_time_catboost(payload)
    assert result["predicted_time_min"] > 350.0
    assert result["delay_risk_level"] == "CRITICAL_DELAY_RISK"
    assert any("Breakdown" in f["name"] for f in result["factor_contributions"])


def test_time_estimation_live_endpoint():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/time-estimation/live", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "predicted_time_min" in data
    assert "remaining_time_min" in data
    assert "progress_pct" in data
    assert "delay_risk_level" in data
    assert "eta_timestamp" in data
    assert "task_attributes" in data


def test_time_estimation_predict_endpoint():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "task_type": "Demolition",
        "task_area_sqm": 300.0,
        "material_type": "Concrete",
        "ground_condition": "Hard",
        "ground_slope_deg": 5.0,
        "site_distance_km": 10.0,
        "weather": "Cloudy",
        "temperature_c": 22.0,
        "crew_size": 5,
        "operator_skill": "Expert",
        "operator_experience_months": 96,
        "machine_age_yrs": 3.0,
        "machine_condition": "Good",
        "permit_setup_delay_min": 10.0,
        "breakdown_occurred": "No",
        "estimated_time_min": 250.0,
    }
    response = client.post("/time-estimation/predict", json=payload, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["predicted_time_min"] > 0
    assert "factor_contributions" in data
    assert "model_metrics" in data


def test_time_estimation_dataset_stats_endpoint():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/time-estimation/dataset-stats", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total_tasks"] == 8000
    assert data["avg_actual_time_min"] > 0
    assert len(data["mean_time_by_task_type"]) > 0
    assert len(data["model_benchmarks"]) > 0
    assert data["catboost_metrics"]["algorithm"].startswith("CatBoostRegressor")


def test_time_estimation_dataset_sample_endpoint():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/time-estimation/dataset-sample?limit=10", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 10
    sample = data[0]
    assert "task_id" in sample
    assert "task_type" in sample
    assert "material_type" in sample
    assert "estimated_time_min" in sample
    assert "actual_time_min" in sample
