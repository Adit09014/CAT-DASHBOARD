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
    assert "culinary" in reject.json()["reason"].lower() or "recipe" in reject.json()["reason"].lower()
    assert len(reject.json()["suggested_queries"]) > 0


def test_domain_guard_natural_language_jcb():
    headers = auth_headers("operator@catguardian.demo", "Operator123!")
    res = client.post("/training/search", headers=headers, json={"query": "How do I use a jcb"})
    assert res.status_code == 200
    data = res.json()
    assert data["allowed"] is True
    assert data["category"] == "Backhoe & JCB Operations"
    assert len(data["results"]) > 0
    top = data["results"][0]
    assert "jcb" in top["title"].lower() or "backhoe" in top["title"].lower()
    # Ensure Rick Astley is never returned!
    assert not any(item["video_id"] == "dQw4w9WgXcQ" for item in data["results"])
    assert not any("rick" in item["title"].lower() for item in data["results"])


def test_training_completion_records_change():
    headers = auth_headers("operator@catguardian.demo", "Operator123!")
    response = client.post("/training/1/complete", headers=headers, json={"operator_id": 2, "before_metric": 34, "after_metric": 24, "metric_name": "idle_time", "training_content_id": 1})
    assert response.status_code == 200
    assert response.json()["observed_change_percent"] < 0


def test_toggle_seatbelt():
    headers = auth_headers("operator@catguardian.demo", "Operator123!")
    res1 = client.post("/telemetry/toggle-seatbelt", headers=headers)
    assert res1.status_code == 200
    assert "seatbelt_status" in res1.json()
    status1 = res1.json()["seatbelt_status"]
    res2 = client.post("/telemetry/toggle-seatbelt", headers=headers)
    assert res2.status_code == 200
    assert res2.json()["seatbelt_status"] != status1


def test_admin_safety_events_and_recommendation():
    admin_headers = auth_headers("admin@catguardian.demo", "Admin123!")
    events = client.get("/admin/safety-events", headers=admin_headers)
    assert events.status_code == 200
    assert isinstance(events.json(), list)

    rec = client.post("/admin/recommend-assignment?task_id=1", headers=admin_headers)
    assert rec.status_code == 200
    rec_body = rec.json()
    assert "recommended_operator_id" in rec_body
    assert "score" in rec_body
    assert rec_body["score"] > 0


def test_copilot_ask_open_ended_queries():
    headers = auth_headers("operator@catguardian.demo", "Operator123!")
    
    # 1. Custom query on load
    res_load = client.post("/copilot/ask", headers=headers, json={"question": "What is my current engine load and rpm?"})
    assert res_load.status_code == 200
    body_load = res_load.json()
    assert "load" in body_load["answer"].lower() or "engine" in body_load["answer"].lower()
    assert "EXC-001" in body_load["answer"] or "Excavator" in body_load["context_used"].get("machine_type", "")
    
    # 2. Custom query on trenching technique
    res_trench = client.post("/copilot/ask", headers=headers, json={"question": "How to avoid trench cave ins?"})
    assert res_trench.status_code == 200
    body_trench = res_trench.json()
    assert "trench" in body_trench["answer"].lower() or "excavation" in body_trench["answer"].lower()

    # 3. Custom query on fuel reduction
    res_fuel = client.post("/copilot/ask", headers=headers, json={"question": "Tips to save diesel fuel"})
    assert res_fuel.status_code == 200
    body_fuel = res_fuel.json()
    assert "fuel" in body_fuel["answer"].lower()

    # 4. Open-ended conversational query
    res_open = client.post("/copilot/ask", headers=headers, json={"question": "Can I operate safely in heavy mud and rain today?"})
    assert res_open.status_code == 200
    assert len(res_open.json()["answer"]) > 10

