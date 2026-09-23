from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .core import decode_token, get_settings
from .db import Base, engine, get_db
from .models import *  # noqa: F403
from .schemas import *  # noqa: F403
from .services import *  # noqa: F403

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="CAT Guardian API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def current_user(authorization: str = Header(default=""), db: Session = Depends(get_db)) -> User:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
    token = authorization.removeprefix("Bearer ").strip()
    try:
        payload = decode_token(token)
    except Exception as exc:  # pragma: no cover - defensive auth failure
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc
    user = db.get(User, int(payload["sub"]))
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def require_role(role: str):
    def checker(user: User = Depends(current_user)) -> User:
        if user.role != role:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")
        return user

    return checker


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/auth/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = authenticate_user(db, payload.email, payload.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    return TokenResponse(access_token=create_user_token(user), user={"id": user.id, "name": user.name, "email": user.email, "role": user.role})


@app.get("/operator/dashboard", response_model=DashboardResponse)
def operator_dashboard(user: User = Depends(require_role("OPERATOR")), db: Session = Depends(get_db)) -> DashboardResponse:
    return DashboardResponse(**dashboard_for_operator(db, user.id))


@app.get("/admin/operators")
def admin_operators(user: User = Depends(require_role("ADMIN")), db: Session = Depends(get_db)):
    operators = db.query(User).filter(User.role == "OPERATOR").all()
    return [{"id": op.id, "name": op.name, "email": op.email, "role": op.role} for op in operators]


@app.get("/admin/machines")
def admin_machines(user: User = Depends(require_role("ADMIN")), db: Session = Depends(get_db)):
    machines = db.query(Machine).all()
    return [{"id": machine.id, "machine_code": machine.machine_code, "machine_type": machine.machine_type, "age_years": machine.age_years, "status": machine.status} for machine in machines]


@app.get("/admin/tasks")
def admin_tasks(user: User = Depends(require_role("ADMIN")), db: Session = Depends(get_db)):
    tasks = db.query(Task).all()
    return [{"id": task.id, "task_type": task.task_type, "description": task.description, "weather_condition": task.weather_condition, "required_skill": task.required_skill, "scheduled_at": task.scheduled_at.isoformat(), "status": task.status, "estimated_duration": task.estimated_duration} for task in tasks]


@app.post("/admin/recommend-assignment")
def admin_recommend_assignment(task_id: int, user: User = Depends(require_role("ADMIN")), db: Session = Depends(get_db)):
    return recommend_assignment(db, task_id)


@app.post("/admin/assign")
def admin_assign(task_id: int, operator_id: int, machine_id: int, user: User = Depends(require_role("ADMIN")), db: Session = Depends(get_db)):
    assignment = TaskAssignment(task_id=task_id, operator_id=operator_id, machine_id=machine_id, assigned_by=user.id, assignment_reason="AI-assisted assignment")
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return {"id": assignment.id, "task_id": assignment.task_id, "operator_id": assignment.operator_id, "machine_id": assignment.machine_id, "assignment_reason": assignment.assignment_reason}


@app.get("/admin/safety-events")
def admin_safety_events(user: User = Depends(require_role("ADMIN")), db: Session = Depends(get_db)):
    return list_safety_events(db)


@app.get("/tasks")
def list_tasks(user: User = Depends(current_user), db: Session = Depends(get_db)):
    tasks = db.query(Task).order_by(Task.scheduled_at.asc()).all()
    return [{"id": task.id, "task_type": task.task_type, "description": task.description, "status": task.status, "estimated_duration": task.estimated_duration, "scheduled_at": task.scheduled_at.isoformat()} for task in tasks]


@app.get("/tasks/{task_id}")
def get_task(task_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"id": task.id, "task_type": task.task_type, "description": task.description, "weather_condition": task.weather_condition, "required_skill": task.required_skill, "scheduled_at": task.scheduled_at.isoformat(), "status": task.status, "estimated_duration": task.estimated_duration, "actual_duration": task.actual_duration}


@app.post("/tasks/{task_id}/safety-check", response_model=SafetyCheckResponse)
def task_safety_check(task_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)) -> SafetyCheckResponse:
    return SafetyCheckResponse(**safety_check(db, task_id))


@app.post("/tasks/{task_id}/start", response_model=SafetyCheckResponse)
def task_start(task_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)) -> SafetyCheckResponse:
    return SafetyCheckResponse(**start_task(db, task_id))


@app.post("/telemetry/next-tick")
def telemetry_next_tick(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return advance_telemetry(db)


@app.post("/telemetry/toggle-seatbelt")
def telemetry_toggle_seatbelt(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return toggle_seatbelt(db)


@app.get("/machines/{machine_id}/telemetry")
def machine_telemetry(machine_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    telemetry = db.query(MachineTelemetry).filter(MachineTelemetry.machine_id == machine_id).order_by(MachineTelemetry.timestamp.desc()).limit(30).all()
    return [telemetry_payload(item) for item in telemetry]


@app.get("/operators/{operator_id}/anomalies")
def operator_anomalies(operator_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return list_user_anomalies(db, operator_id)


@app.post("/predict/task-time", response_model=PredictionResponse)
def predict_endpoint(payload: PredictionRequest, user: User = Depends(current_user), db: Session = Depends(get_db)) -> PredictionResponse:
    prediction = predict_task_time(db, payload.task_id, payload.idle_reduction, payload.weather)
    return PredictionResponse(**prediction)


@app.post("/simulate/what-if", response_model=WhatIfResponse)
def simulate_what_if_endpoint(payload: WhatIfRequest, user: User = Depends(current_user), db: Session = Depends(get_db)) -> WhatIfResponse:
    return WhatIfResponse(**what_if(db, payload.task_id, payload.idle_reduction, payload.weather, payload.machine_id, payload.operator_skill, payload.task_difficulty))


@app.post("/safety/simulate", response_model=SafetySimulationResponse)
def safety_simulate(payload: SafetySimulationRequest, user: User = Depends(current_user), db: Session = Depends(get_db)) -> SafetySimulationResponse:
    return SafetySimulationResponse(**simulate_proximity(db, payload.task_id, payload.horizon_seconds, payload.threshold_meters))


@app.post("/copilot/ask", response_model=CopilotResponse)
def copilot_ask(payload: CopilotRequest, user: User = Depends(current_user), db: Session = Depends(get_db)) -> CopilotResponse:
    return CopilotResponse(**copilot_answer(db, user.id, payload.question))


@app.post("/training/search", response_model=TrainingSearchResponse)
def training_search_endpoint(payload: TrainingSearchRequest, user: User = Depends(current_user), db: Session = Depends(get_db)) -> TrainingSearchResponse:
    results = training_search(db, payload.query, payload.operator_id, payload.machine_type)
    return TrainingSearchResponse(**results)


@app.get("/training/recommendations")
def training_recommendations(user: User = Depends(current_user), db: Session = Depends(get_db)):
    assignment = get_latest_assignment_for_operator(db, user.id)
    anomaly = None
    if assignment:
        telemetry = latest_telemetry(db, assignment.machine_id)
        task = db.get(Task, assignment.task_id)
        anomaly = detect_anomaly(db, telemetry, task, user.id) if telemetry and task else None
    return recommend_training(db, user.id, "", anomaly.get("type") if anomaly else None)


@app.post("/training/{training_id}/complete", response_model=TrainingCompleteResponse)
def training_complete(training_id: int, payload: TrainingCompleteRequest, user: User = Depends(current_user), db: Session = Depends(get_db)) -> TrainingCompleteResponse:
    result = complete_training(db, payload.operator_id, payload.before_metric, payload.after_metric, payload.metric_name, payload.training_content_id)
    return TrainingCompleteResponse(**result)


@app.get("/weather/{task_id}")
def weather_endpoint(task_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return get_weather_context(db, task_id)


@app.post("/demo/reset")
def demo_reset_endpoint(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return demo_reset(db)


@app.post("/demo/scenario/{scenario_name}")
def demo_scenario_endpoint(scenario_name: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return demo_scenario(db, scenario_name)
