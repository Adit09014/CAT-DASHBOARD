from __future__ import annotations

from fastapi.testclient import TestClient

from app.db import Base, SessionLocal, engine
from app.main import app
from app.services import seed_demo_data


client = TestClient(app)


def setup_module(module):
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_demo_data(db)


def auth_headers(email: str, password: str):
    response = client.post("/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_valid_login():
    response = client.post("/auth/login", json={"email": "operator@catguardian.demo", "password": "Operator123!"})
    assert response.status_code == 200
    assert response.json()["user"]["role"] == "OPERATOR"


def test_invalid_login():
    response = client.post("/auth/login", json={"email": "operator@catguardian.demo", "password": "wrong"})
    assert response.status_code == 401


def test_role_restriction():
    headers = auth_headers("operator@catguardian.demo", "Operator123!")
    response = client.get("/admin/operators", headers=headers)
    assert response.status_code == 403


def test_safety_blocks_seatbelt_false():
    headers = auth_headers("operator@catguardian.demo", "Operator123!")
    response = client.post("/tasks/1/safety-check", headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["allowed"] is False
    assert any("Seatbelt" in reason for reason in body["blocking_reasons"])


def test_safety_allows_when_fixed_after_seed_update():
    headers = auth_headers("operator@catguardian.demo", "Operator123!")
    client.post("/telemetry/next-tick", headers=headers)
    response = client.post("/tasks/1/safety-check", headers=headers)
    assert response.status_code == 200
    assert isinstance(response.json()["allowed"], bool)


def test_operator_dashboard_contains_context():
    headers = auth_headers("operator@catguardian.demo", "Operator123!")
    response = client.get("/operator/dashboard", headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["current_machine"]["machine_code"] == "EXC-001"
    assert "training_recommendation" in body


def test_prediction_endpoint_returns_factors():
    headers = auth_headers("operator@catguardian.demo", "Operator123!")
    response = client.post("/predict/task-time", headers=headers, json={"task_id": 1})
    assert response.status_code == 200
    body = response.json()
    assert body["predicted_duration"] > 0
    assert body["factors"]


def test_what_if_changes_with_inputs():
    headers = auth_headers("operator@catguardian.demo", "Operator123!")
    response = client.post("/simulate/what-if", headers=headers, json={"task_id": 1, "idle_reduction": 20, "weather": "Current", "operator_skill": "Current", "task_difficulty": "Current"})
    assert response.status_code == 200
    body = response.json()
    assert body["current"]["label"] == "MODEL-BASED ESTIMATE"
    assert body["simulated"]["label"] == "SIMULATED SCENARIO"
    assert body["deltas"]["duration"] != 0


def test_predictive_safety_simulation_reports_state():
    headers = auth_headers("operator@catguardian.demo", "Operator123!")
    response = client.post("/safety/simulate", headers=headers, json={"task_id": 1, "horizon_seconds": 30, "threshold_meters": 8})
    assert response.status_code == 200
    body = response.json()
    assert body["state"] in {"NORMAL", "CAUTION", "WARNING", "CRITICAL", "UNKNOWN"}
    assert "trajectory" in body


def test_demo_reset_restores_hero_state():
    headers = auth_headers("operator@catguardian.demo", "Operator123!")
    client.post("/demo/scenario/excessive-idle", headers=headers)
    response = client.post("/demo/reset", headers=headers)
    assert response.status_code == 200
    assert response.json()["status"] == "reset"


def test_domain_guard_accepts_and_rejects():
    headers = auth_headers("operator@catguardian.demo", "Operator123!")
    allow = client.post("/training/search", headers=headers, json={"query": "How do I reduce excavator idle time?"})
    reject = client.post("/training/search", headers=headers, json={"query": "How do I make biryani?"})
    assert allow.status_code == 200
    assert allow.json()["allowed"] is True
    assert reject.json()["allowed"] is False


def test_training_completion_records_change():
    headers = auth_headers("operator@catguardian.demo", "Operator123!")
    response = client.post("/training/1/complete", headers=headers, json={"operator_id": 2, "before_metric": 34, "after_metric": 24, "metric_name": "idle_time", "training_content_id": 1})
    assert response.status_code == 200
    assert response.json()["observed_change_percent"] < 0
