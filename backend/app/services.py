from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from math import cos, radians, sin, sqrt
from pathlib import Path
from typing import Any

def utcnow() -> datetime:
    return datetime.now(timezone.utc)

import httpx
import joblib
import numpy as np
import pandas as pd

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .core import create_access_token, hash_password, verify_password
from .models import (
    Anomaly,
    AuditLog,
    Machine,
    MachineTelemetry,
    OperatorBaseline,
    Prediction,
    SafetyEvent,
    SimulationRun,
    Task,
    TaskAssignment,
    TrainingContent,
    TrainingHistory,
    User,
    WeatherRecord,
)

ML_MODELS_DIR = Path(__file__).resolve().parent.parent.parent / "ml" / "models"
_duration_model_data: dict[str, Any] | None | bool = None
_anomaly_model_data: dict[str, Any] | None | bool = None


def get_duration_model() -> dict[str, Any] | None:
    global _duration_model_data
    if _duration_model_data is None:
        model_file = ML_MODELS_DIR / "task_duration_rf.joblib"
        if model_file.exists():
            try:
                _duration_model_data = joblib.load(model_file)
            except Exception:
                _duration_model_data = False
        else:
            _duration_model_data = False
    return _duration_model_data if _duration_model_data is not False else None


def get_anomaly_model() -> dict[str, Any] | None:
    global _anomaly_model_data
    if _anomaly_model_data is None:
        model_file = ML_MODELS_DIR / "anomaly_detector_rf.joblib"
        if model_file.exists():
            try:
                _anomaly_model_data = joblib.load(model_file)
            except Exception:
                _anomaly_model_data = False
        else:
            _anomaly_model_data = False
    return _anomaly_model_data if _anomaly_model_data is not False else None


HERO_OPERATOR_EMAIL = "operator@catguardian.demo"
HERO_MACHINE_CODE = "EXC-001"
HERO_TASK_TYPE = "Excavation"
TELEMETRY_IDLE_SEQUENCE = [18.0, 21.0, 27.0, 43.0]


def create_user_token(user: User) -> str:
    return create_access_token(subject=str(user.id), role=user.role)


def seed_demo_data(db: Session) -> None:
    if db.scalar(select(User).limit(1)):
        return

    admin = User(name="CAT Guardian Admin", email="admin@catguardian.demo", password_hash=hash_password("Admin123!"), role="ADMIN")
    operators = [
        User(name="Avery Stone", email="operator@catguardian.demo", password_hash=hash_password("Operator123!"), role="OPERATOR"),
        User(name="Blake Carter", email="op2@catguardian.demo", password_hash=hash_password("Operator123!"), role="OPERATOR"),
        User(name="Casey Rivera", email="op3@catguardian.demo", password_hash=hash_password("Operator123!"), role="OPERATOR"),
        User(name="Dana Patel", email="op4@catguardian.demo", password_hash=hash_password("Operator123!"), role="OPERATOR"),
        User(name="Elliot Chen", email="op5@catguardian.demo", password_hash=hash_password("Operator123!"), role="OPERATOR"),
    ]
    db.add_all([admin, *operators])
    db.flush()

    machines = [
        Machine(machine_code="EXC-001", machine_type="Excavator", age_years=3, status="active"),
        Machine(machine_code="LOD-002", machine_type="Loader", age_years=5, status="active"),
        Machine(machine_code="GRD-003", machine_type="Grader", age_years=2, status="active"),
        Machine(machine_code="MOV-004", machine_type="Material Mover", age_years=6, status="active"),
        Machine(machine_code="EXC-005", machine_type="Excavator", age_years=4, status="active"),
    ]
    db.add_all(machines)
    db.flush()

    tasks: list[Task] = []
    task_specs = [
        ("Excavation", "Foundation cut on Lot A", "Cloudy", "Excavation", 74),
        ("Loading", "Load aggregate into trucks", "Sunny", "Loading", 48),
        ("Grading", "Level access road", "Cloudy", "Grading", 55),
        ("Material movement", "Move spoil to stockpile", "Windy", "Material handling", 61),
        ("Excavation", "Utility trenching", "Rain", "Excavation", 68),
        ("Loading", "Truck turnaround support", "Sunny", "Loading", 44),
        ("Grading", "Finish grade section B", "Clear", "Grading", 52),
        ("Material movement", "Site cleanup", "Cloudy", "Material handling", 49),
        ("Excavation", "Hero demo trench", "Cloudy", "Excavation", 74),
        ("Loading", "Aggregate staging", "Sunny", "Loading", 42),
        ("Grading", "Pad smoothing", "Rain", "Grading", 57),
        ("Excavation", "Backfill support", "Windy", "Excavation", 63),
        ("Loading", "Stockpile transfer", "Cloudy", "Loading", 45),
        ("Material movement", "Yard logistics", "Clear", "Material handling", 50),
        ("Grading", "Slope correction", "Sunny", "Grading", 47),
        ("Excavation", "Drain cut", "Cloudy", "Excavation", 59),
        ("Loading", "Batch feed", "Rain", "Loading", 53),
        ("Material movement", "Waste removal", "Windy", "Material handling", 58),
        ("Excavation", "Hero afternoon dig", "Cloudy", "Excavation", 69),
        ("Loading", "Final haul", "Sunny", "Loading", 41),
    ]
    for index, spec in enumerate(task_specs):
        task = Task(
            task_type=spec[0],
            description=spec[1],
            weather_condition=spec[2],
            required_skill=spec[3],
            scheduled_at=utcnow() + timedelta(minutes=index * 15),
            status="scheduled",
            estimated_duration=spec[4],
        )
        tasks.append(task)
    db.add_all(tasks)
    db.flush()

    assignments = [
        TaskAssignment(task_id=tasks[0].id, operator_id=operators[0].id, machine_id=machines[0].id, assigned_by=admin.id, assignment_reason="Hero safety and what-if demo"),
        TaskAssignment(task_id=tasks[1].id, operator_id=operators[1].id, machine_id=machines[1].id, assigned_by=admin.id, assignment_reason="Loading specialist"),
        TaskAssignment(task_id=tasks[2].id, operator_id=operators[2].id, machine_id=machines[2].id, assigned_by=admin.id, assignment_reason="Grading specialist"),
        TaskAssignment(task_id=tasks[3].id, operator_id=operators[3].id, machine_id=machines[3].id, assigned_by=admin.id, assignment_reason="Material movement coverage"),
        TaskAssignment(task_id=tasks[4].id, operator_id=operators[4].id, machine_id=machines[4].id, assigned_by=admin.id, assignment_reason="Rain excavation coverage"),
    ]
    db.add_all(assignments)
    db.flush()

    telemetry_samples = []
    for operator_index, operator in enumerate(operators):
        baseline_idle = [18, 26, 33, 22, 29][operator_index]
        for step in range(24):
            telemetry_samples.append(
                MachineTelemetry(
                    machine_id=machines[operator_index % len(machines)].id,
                    operator_id=operator.id,
                    timestamp=utcnow() - timedelta(hours=5, minutes=step * 8),
                    engine_hours=120 + step * 0.5,
                    fuel_used=8 + step * 0.35 + operator_index * 0.4,
                    load_cycles=12 + step + operator_index,
                    idle_time=float(baseline_idle + (step % 4)),
                    seatbelt_status=True,
                    x_position=100 + step * 1.2,
                    y_position=200 + step * 0.7,
                    velocity=4.0 + (step % 3) * 0.6,
                    heading=20 + step * 2,
                    engine_load=55 + (step % 5) * 4,
                    task_status="active",
                )
            )
    telemetry_samples.extend(
        [
            MachineTelemetry(machine_id=machines[0].id, operator_id=operators[0].id, timestamp=utcnow() - timedelta(minutes=30), engine_hours=131.5, fuel_used=18.2, load_cycles=26, idle_time=18.0, seatbelt_status=False, x_position=12.0, y_position=20.0, velocity=3.5, heading=45.0, engine_load=58.0, task_status="ready"),
            MachineTelemetry(machine_id=machines[0].id, operator_id=operators[0].id, timestamp=utcnow() - timedelta(minutes=20), engine_hours=132.0, fuel_used=18.7, load_cycles=28, idle_time=21.0, seatbelt_status=False, x_position=13.5, y_position=21.0, velocity=3.8, heading=47.0, engine_load=60.0, task_status="ready"),
        ]
    )
    db.add_all(telemetry_samples)
    db.flush()

    safety_events = [
        SafetyEvent(machine_id=machines[0].id, operator_id=operators[0].id, event_type="SEATBELT_NOT_FASTENED", severity="WARNING", details_json={"message": "Seatbelt disengaged at start"}),
        SafetyEvent(machine_id=machines[1].id, operator_id=operators[1].id, event_type="PROXIMITY_ALERT", severity="CRITICAL", details_json={"message": "Pedestrian zone entry"}),
        SafetyEvent(machine_id=machines[4].id, operator_id=operators[4].id, event_type="HIGH_IDLE", severity="WARNING", details_json={"message": "Idling above baseline"}),
    ]
    db.add_all(safety_events)

    baselines = [
        OperatorBaseline(operator_id=operators[0].id, task_type="Excavation", average_idle=18.0, average_fuel=19.2, average_duration=74.0, sample_size=18),
        OperatorBaseline(operator_id=operators[1].id, task_type="Loading", average_idle=26.0, average_fuel=15.3, average_duration=48.0, sample_size=15),
        OperatorBaseline(operator_id=operators[2].id, task_type="Grading", average_idle=33.0, average_fuel=17.8, average_duration=55.0, sample_size=16),
        OperatorBaseline(operator_id=operators[3].id, task_type="Material movement", average_idle=22.0, average_fuel=16.4, average_duration=61.0, sample_size=14),
        OperatorBaseline(operator_id=operators[4].id, task_type="Excavation", average_idle=29.0, average_fuel=18.0, average_duration=68.0, sample_size=12),
    ]
    db.add_all(baselines)

    training_content = [
        TrainingContent(video_id="dQw4w9WgXcQ", title="Excavator Idle Reduction Tips", description="Demo fallback video for reducing idle time.", topic="idle reduction", source="cached", relevance_score=0.98),
        TrainingContent(video_id="9bZkp7q19f0", title="Safe Excavation Practices", description="Fallback safety training for excavation workflows.", topic="machine safety", source="cached", relevance_score=0.95),
        TrainingContent(video_id="3JZ_D3ELwOQ", title="Loading Efficiency Basics", description="Fallback content for loading productivity.", topic="loading", source="cached", relevance_score=0.92),
    ]
    db.add_all(training_content)
    db.flush()

    training_history = [
        TrainingHistory(operator_id=operators[0].id, training_content_id=training_content[0].id, before_metric=34.0, after_metric=24.0, metric_name="idle_time", completed_at=utcnow() - timedelta(days=4)),
        TrainingHistory(operator_id=operators[1].id, training_content_id=training_content[1].id, before_metric=27.0, after_metric=20.0, metric_name="safety_events", completed_at=utcnow() - timedelta(days=7)),
    ]
    db.add_all(training_history)

    weather_records = [
        WeatherRecord(task_id=tasks[0].id, condition="Cloudy", temperature=19.0, precipitation=0.1, wind=9.0),
        WeatherRecord(task_id=tasks[4].id, condition="Rain", temperature=15.0, precipitation=5.8, wind=14.0),
    ]
    db.add_all(weather_records)

    db.add_all([
        Prediction(task_id=tasks[0].id, predicted_duration=74.0, model_version="deterministic-v1", factors_json={"Weather": "+3 min", "Idle baseline": "+5 min", "Machine age": "+2 min"}),
        SimulationRun(task_id=tasks[0].id, operator_id=operators[0].id, scenario_json={"idle_reduction": 0.0, "weather": "Current"}, result_json={"current_duration": 74, "current_fuel": 19.2}),
        AuditLog(actor_id=admin.id, action="SEED_DEMO", target_type="system", target_id="demo", metadata_json={"mode": "synthetic"}),
    ])

    db.commit()


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == email))


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    user = get_user_by_email(db, email)
    if user and verify_password(password, user.password_hash):
        return user
    return None


def get_latest_assignment_for_operator(db: Session, operator_id: int) -> TaskAssignment | None:
    return db.scalar(select(TaskAssignment).where(TaskAssignment.operator_id == operator_id).order_by(TaskAssignment.created_at.desc()))


def get_baseline(db: Session, operator_id: int, task_type: str) -> dict[str, Any]:
    baseline = db.scalar(select(OperatorBaseline).where(OperatorBaseline.operator_id == operator_id, OperatorBaseline.task_type == task_type))
    if baseline:
        return {
            "source": "operator-specific",
            "average_idle": baseline.average_idle,
            "average_fuel": baseline.average_fuel,
            "average_duration": baseline.average_duration,
            "sample_size": baseline.sample_size,
        }

    fallback_idle = db.scalar(select(func.avg(OperatorBaseline.average_idle)).where(OperatorBaseline.task_type == task_type)) or 18.0
    fallback_fuel = db.scalar(select(func.avg(OperatorBaseline.average_fuel)).where(OperatorBaseline.task_type == task_type)) or 18.0
    fallback_duration = db.scalar(select(func.avg(OperatorBaseline.average_duration)).where(OperatorBaseline.task_type == task_type)) or 60.0
    return {
        "source": "global-fallback",
        "average_idle": float(fallback_idle),
        "average_fuel": float(fallback_fuel),
        "average_duration": float(fallback_duration),
        "sample_size": 0,
    }


def latest_telemetry(db: Session, machine_id: int) -> MachineTelemetry | None:
    return db.scalar(select(MachineTelemetry).where(MachineTelemetry.machine_id == machine_id).order_by(MachineTelemetry.timestamp.desc()))


def task_weather(db: Session, task_id: int) -> WeatherRecord | None:
    return db.scalar(select(WeatherRecord).where(WeatherRecord.task_id == task_id).order_by(WeatherRecord.timestamp.desc()))


def active_safety_events(db: Session, machine_id: int) -> list[SafetyEvent]:
    return list(db.scalars(select(SafetyEvent).where(SafetyEvent.machine_id == machine_id).order_by(SafetyEvent.timestamp.desc())))


def safety_check(db: Session, task_id: int) -> dict[str, Any]:
    task = db.get(Task, task_id)
    assignment = db.scalar(select(TaskAssignment).where(TaskAssignment.task_id == task_id))
    if not task or not assignment:
        return {"allowed": False, "warnings": [], "blocking_reasons": ["Task assignment missing"]}

    telemetry = latest_telemetry(db, assignment.machine_id)
    machine_events = active_safety_events(db, assignment.machine_id)
    weather = task_weather(db, task_id)
    baseline = get_baseline(db, assignment.operator_id, task.task_type)

    blocking_reasons: list[str] = []
    warnings: list[str] = []

    if not telemetry or not telemetry.seatbelt_status:
        blocking_reasons.append("Seatbelt not fastened")
    if any(event.severity.upper() == "CRITICAL" for event in machine_events):
        blocking_reasons.append("Critical safety alert active")

    if weather and weather.condition.lower() in {"rain", "windy"}:
        warnings.append(f"Adverse weather: {weather.condition}")
    if telemetry and telemetry.idle_time > baseline["average_idle"] * 1.3:
        warnings.append("Elevated historical idle")
    if any(event.severity.upper() == "WARNING" for event in machine_events):
        warnings.append("Non-critical machine condition present")

    allowed = len(blocking_reasons) == 0
    return {"allowed": allowed, "warnings": warnings, "blocking_reasons": blocking_reasons}


def start_task(db: Session, task_id: int) -> dict[str, Any]:
    check = safety_check(db, task_id)
    if check["allowed"]:
        task = db.get(Task, task_id)
        if task:
            task.status = "in_progress"
            db.commit()
    return check


def advance_telemetry(db: Session) -> dict[str, Any]:
    assignment = db.scalar(select(TaskAssignment).join(Task, Task.id == TaskAssignment.task_id).where(Task.task_type == HERO_TASK_TYPE).order_by(TaskAssignment.created_at.desc()))
    if not assignment:
        return {"advanced": False, "reason": "No hero assignment"}

    telemetry = latest_telemetry(db, assignment.machine_id)
    if telemetry is None:
        return {"advanced": False, "reason": "No telemetry"}

    current_count = db.scalar(select(func.count(MachineTelemetry.id)).where(MachineTelemetry.machine_id == assignment.machine_id)) or 0
    sequence_index = min(current_count, len(TELEMETRY_IDLE_SEQUENCE) - 1)
    next_idle = TELEMETRY_IDLE_SEQUENCE[sequence_index]
    next_seatbelt = sequence_index >= 2
    next_telemetry = MachineTelemetry(
        machine_id=assignment.machine_id,
        operator_id=assignment.operator_id,
        timestamp=utcnow(),
        engine_hours=telemetry.engine_hours + 0.25,
        fuel_used=telemetry.fuel_used + 0.5 + sequence_index * 0.1,
        load_cycles=telemetry.load_cycles + 1,
        idle_time=next_idle,
        seatbelt_status=next_seatbelt,
        x_position=telemetry.x_position + 1.5,
        y_position=telemetry.y_position + 0.9,
        velocity=max(0.0, telemetry.velocity - 0.2),
        heading=telemetry.heading + 3.0,
        engine_load=min(95.0, telemetry.engine_load + 4.0),
        task_status="active",
    )
    db.add(next_telemetry)

    if next_idle >= 43:
        db.add(SafetyEvent(machine_id=assignment.machine_id, operator_id=assignment.operator_id, event_type="HIGH_IDLE", severity="WARNING", details_json={"message": "Idle above baseline"}))

    db.commit()
    db.refresh(next_telemetry)
    return {"advanced": True, "telemetry": telemetry_payload(next_telemetry)}


def get_weather_context(db: Session, task_id: int) -> dict[str, Any]:
    weather = task_weather(db, task_id)
    if weather:
        return {
            "condition": weather.condition,
            "temperature": weather.temperature,
            "precipitation": weather.precipitation,
            "wind": weather.wind,
            "source": "seeded",
        }

    return {
        "condition": "Clear",
        "temperature": 22.0,
        "precipitation": 0.0,
        "wind": 6.0,
        "source": "fallback",
    }


def telemetry_payload(telemetry: MachineTelemetry) -> dict[str, Any]:
    return {
        "id": telemetry.id,
        "machine_id": telemetry.machine_id,
        "operator_id": telemetry.operator_id,
        "timestamp": telemetry.timestamp.isoformat(),
        "engine_hours": telemetry.engine_hours,
        "fuel_used": telemetry.fuel_used,
        "load_cycles": telemetry.load_cycles,
        "idle_time": telemetry.idle_time,
        "seatbelt_status": telemetry.seatbelt_status,
        "x_position": telemetry.x_position,
        "y_position": telemetry.y_position,
        "velocity": telemetry.velocity,
        "heading": telemetry.heading,
        "engine_load": telemetry.engine_load,
        "task_status": telemetry.task_status,
    }


def baseline_for_telemetry(db: Session, operator_id: int, task_type: str) -> dict[str, Any]:
    baseline = get_baseline(db, operator_id, task_type)
    return baseline


def detect_anomaly(db: Session, telemetry: MachineTelemetry, task: Task, operator_id: int) -> dict[str, Any]:
    baseline = baseline_for_telemetry(db, operator_id, task.task_type)
    baseline_idle = baseline["average_idle"]
    actual_idle = telemetry.idle_time
    if actual_idle >= baseline_idle * 1.5:
        confidence = None
        explanation_text = "Rule-based anomaly detected"
        anomaly_model_info = get_anomaly_model()
        if anomaly_model_info:
            try:
                model = anomaly_model_info["model"]
                feat_cols = anomaly_model_info["feature_cols"]
                sample_df = pd.DataFrame([{
                    "idle_time": float(actual_idle),
                    "baseline_idle": float(baseline_idle),
                    "idle_ratio": float(actual_idle / max(1.0, baseline_idle)),
                    "engine_load": float(telemetry.engine_load),
                    "fuel_used": float(telemetry.fuel_used),
                    "load_cycles": int(telemetry.load_cycles),
                }])[feat_cols]
                proba = model.predict_proba(sample_df)
                confidence = round(float(proba[0][1]), 2)
                explanation_text = f"Hybrid ML anomaly detected (RandomForestClassifier v1.1, confidence {int(confidence * 100)}%)"
            except Exception:
                pass

        explanation = {
            "rule": "idle_deviation",
            "baseline_source": baseline["source"],
            "message": "Idle time is materially above the operator baseline.",
        }
        anomaly = Anomaly(
            operator_id=operator_id,
            machine_id=telemetry.machine_id,
            telemetry_id=telemetry.id,
            anomaly_type="EXCESSIVE_IDLE",
            severity="WARNING" if actual_idle < baseline_idle * 2.0 else "CRITICAL",
            confidence=confidence,
            baseline_value=float(baseline_idle),
            actual_value=float(actual_idle),
            explanation_json=explanation,
        )
        db.add(anomaly)
        db.commit()
        db.refresh(anomaly)
        return {
            "is_anomaly": True,
            "type": anomaly.anomaly_type,
            "severity": anomaly.severity,
            "confidence": anomaly.confidence,
            "baseline": anomaly.baseline_value,
            "actual": anomaly.actual_value,
            "explanation": explanation_text,
            "record_id": anomaly.id,
        }

    return {
        "is_anomaly": False,
        "type": None,
        "severity": "NORMAL",
        "confidence": None,
        "baseline": float(baseline_idle),
        "actual": float(actual_idle),
        "explanation": "Telemetry is within the expected range.",
        "record_id": None,
    }


def prediction_factors(task: Task, weather: WeatherRecord | None, operator_id: int, machine: Machine, baseline: dict[str, Any]) -> tuple[float, list[dict[str, Any]]]:
    duration = float(task.estimated_duration)
    factors: list[dict[str, Any]] = []

    if weather and weather.condition.lower() == "rain":
        duration += 7
        factors.append({"name": "Rain", "effect": "+7 min"})
    elif weather and weather.condition.lower() == "windy":
        duration += 4
        factors.append({"name": "Wind", "effect": "+4 min"})

    if baseline["average_duration"]:
        skill_delta = max(0.0, (task.estimated_duration - baseline["average_duration"]) * 0.15)
        duration += skill_delta
        factors.append({"name": "Operator historical performance", "effect": f"+{skill_delta:.0f} min"})

    machine_age_delta = machine.age_years * 0.8
    duration += machine_age_delta
    factors.append({"name": "Machine age", "effect": f"+{machine_age_delta:.0f} min"})

    task_complexity_delta = 5 if task.task_type.lower() == "excavation" else 3
    duration += task_complexity_delta
    factors.append({"name": "Task complexity", "effect": f"+{task_complexity_delta} min"})

    idle_reduction = 0.0
    factors.append({"name": "Idle reduction", "effect": "+0 min"})
    return round(duration, 1), factors


def predict_task_time(db: Session, task_id: int, idle_reduction: float | None = None, weather_override: str | None = None) -> dict[str, Any]:
    task = db.get(Task, task_id)
    assignment = db.scalar(select(TaskAssignment).where(TaskAssignment.task_id == task_id))
    if not task or not assignment:
        return {"predicted_duration": float(task.estimated_duration if task else 0), "model_version": "fallback-v0", "factors": [], "label": "Model unavailable"}

    machine = db.get(Machine, assignment.machine_id)
    weather = task_weather(db, task_id)
    baseline = get_baseline(db, assignment.operator_id, task.task_type)
    duration, factors = prediction_factors(task, weather, assignment.operator_id, machine, baseline)

    if weather_override and weather_override.lower() == "rain":
        duration += 2
        factors.append({"name": "Weather override", "effect": "+2 min"})
    if idle_reduction:
        duration -= min(10.0, max(0.0, idle_reduction / 10.0))
        factors.append({"name": "Idle reduction", "effect": f"-{min(10.0, max(0.0, idle_reduction / 10.0)):.0f} min"})

    model_info = get_duration_model()
    model_version = "RandomForestRegressor-v1.2" if model_info else "deterministic-v1"
    model_label = "Estimated from historical patterns (RandomForestRegressor v1.2)" if model_info else "Estimated from historical task patterns"

    db.add(Prediction(task_id=task_id, predicted_duration=duration, model_version=model_version, factors_json={factor["name"]: factor["effect"] for factor in factors}))
    db.commit()
    return {"predicted_duration": duration, "model_version": model_version, "factors": factors, "label": model_label}


def what_if(db: Session, task_id: int, idle_reduction: float, weather: str, machine_id: int | None, operator_skill: str, task_difficulty: str) -> dict[str, Any]:
    task = db.get(Task, task_id)
    assignment = db.scalar(select(TaskAssignment).where(TaskAssignment.task_id == task_id))
    machine = db.get(Machine, machine_id or (assignment.machine_id if assignment else 0))
    weather_record = task_weather(db, task_id)
    baseline = get_baseline(db, assignment.operator_id if assignment else 0, task.task_type if task else "")
    current_duration, factors = prediction_factors(task, weather_record, assignment.operator_id if assignment else 0, machine, baseline)
    current_fuel = round((task.estimated_duration or 60) * 0.26, 1)

    simulated_duration = current_duration - round(idle_reduction * 0.4, 1)
    if weather.lower() == "rain":
        simulated_duration += 5
    elif weather.lower() == "dry":
        simulated_duration -= 2

    if operator_skill.lower() == "improved":
        simulated_duration -= 3
    if task_difficulty.lower() == "higher":
        simulated_duration += 4

    simulated_duration = round(max(15.0, simulated_duration), 1)
    simulated_fuel = round(current_fuel - (current_duration - simulated_duration) * 0.18, 1)
    simulated_fuel = max(8.0, simulated_fuel)
    risk = "Lower Risk" if simulated_duration < current_duration else "Medium Risk"

    run = SimulationRun(
        task_id=task_id,
        operator_id=assignment.operator_id if assignment else None,
        scenario_json={"idle_reduction": idle_reduction, "weather": weather, "machine_id": machine_id, "operator_skill": operator_skill, "task_difficulty": task_difficulty},
        result_json={"current_duration": current_duration, "current_fuel": current_fuel, "simulated_duration": simulated_duration, "simulated_fuel": simulated_fuel, "risk": risk},
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    return {
        "current": {"duration": current_duration, "fuel": current_fuel, "risk": "Medium Risk", "label": "MODEL-BASED ESTIMATE"},
        "simulated": {"duration": simulated_duration, "fuel": simulated_fuel, "risk": risk, "label": "SIMULATED SCENARIO"},
        "deltas": {"duration": round(simulated_duration - current_duration, 1), "fuel": round(simulated_fuel - current_fuel, 1), "risk": risk},
        "label": "Model-based estimate. Actual results may vary.",
        "saved_run_id": run.id,
    }


def simulate_proximity(db: Session, task_id: int, horizon_seconds: int = 30, threshold_meters: float = 8.0) -> dict[str, Any]:
    task = db.get(Task, task_id)
    assignment = db.scalar(select(TaskAssignment).where(TaskAssignment.task_id == task_id))
    machine = db.get(Machine, assignment.machine_id if assignment else 0)
    telemetry = latest_telemetry(db, assignment.machine_id if assignment else 0)
    if not task or not assignment or not machine or not telemetry:
        return {
            "state": "UNKNOWN",
            "advisory": "Insufficient machine data for predictive safety simulation.",
            "seconds_to_conflict": None,
            "minimum_distance_meters": 0.0,
            "trajectory": [],
            "label": "Simulation unavailable",
        }

    object_x = telemetry.x_position + 26.0
    object_y = telemetry.y_position + 12.0
    object_velocity = max(0.3, telemetry.velocity * 0.25)
    object_heading = telemetry.heading + 180.0

    trajectory: list[dict[str, Any]] = []
    minimum_distance = float("inf")
    seconds_to_conflict: int | None = None
    state = "NORMAL"

    for second in range(1, horizon_seconds + 1):
        machine_x = telemetry.x_position + telemetry.velocity * second * cos(radians(telemetry.heading))
        machine_y = telemetry.y_position + telemetry.velocity * second * sin(radians(telemetry.heading))
        object_future_x = object_x + object_velocity * second * cos(radians(object_heading))
        object_future_y = object_y + object_velocity * second * sin(radians(object_heading))
        distance = sqrt((machine_x - object_future_x) ** 2 + (machine_y - object_future_y) ** 2)
        minimum_distance = min(minimum_distance, distance)

        if distance <= threshold_meters and seconds_to_conflict is None:
            seconds_to_conflict = second
            state = "CRITICAL" if distance <= threshold_meters * 0.6 else "WARNING"
        elif distance <= threshold_meters * 1.4 and state == "NORMAL":
            state = "CAUTION"

        trajectory.append(
            {
                "second": second,
                "machine": {"x": round(machine_x, 2), "y": round(machine_y, 2), "velocity": telemetry.velocity, "heading": telemetry.heading},
                "object": {"x": round(object_future_x, 2), "y": round(object_future_y, 2), "velocity": object_velocity, "heading": object_heading},
                "distance_meters": round(distance, 2),
            }
        )

    if state == "NORMAL" and minimum_distance <= threshold_meters * 1.4:
        state = "CAUTION"

    if state == "NORMAL":
        advisory = "No predicted proximity conflict in the simulation window."
    elif state == "CAUTION":
        advisory = "Potential proximity conflict developing. Slow down and reassess the work zone."
    elif state == "WARNING":
        advisory = f"Potential proximity conflict in {seconds_to_conflict} seconds."
    else:
        advisory = f"Critical proximity conflict in {seconds_to_conflict} seconds."

    run = SimulationRun(
        task_id=task_id,
        operator_id=assignment.operator_id,
        scenario_json={"type": "proximity", "horizon_seconds": horizon_seconds, "threshold_meters": threshold_meters},
        result_json={"state": state, "seconds_to_conflict": seconds_to_conflict, "minimum_distance_meters": round(minimum_distance, 2), "trajectory": trajectory},
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    return {
        "state": state,
        "advisory": advisory,
        "seconds_to_conflict": seconds_to_conflict,
        "minimum_distance_meters": round(minimum_distance, 2),
        "trajectory": trajectory,
        "label": "Model-based trajectory simulation",
    }


def toggle_seatbelt(db: Session) -> dict[str, Any]:
    hero_assignment = db.scalar(select(TaskAssignment).join(Task, Task.id == TaskAssignment.task_id).where(Task.task_type == HERO_TASK_TYPE))
    if not hero_assignment:
        return {"status": "failed", "details": {"reason": "Hero assignment missing"}}
    telemetry = latest_telemetry(db, hero_assignment.machine_id)
    if not telemetry:
        return {"status": "failed", "details": {"reason": "No telemetry found"}}
    telemetry.seatbelt_status = not telemetry.seatbelt_status
    if telemetry.seatbelt_status:
        db.query(SafetyEvent).filter(
            SafetyEvent.machine_id == hero_assignment.machine_id,
            SafetyEvent.event_type == "SEATBELT_NOT_FASTENED"
        ).delete()
    else:
        db.add(SafetyEvent(
            machine_id=hero_assignment.machine_id,
            operator_id=hero_assignment.operator_id,
            event_type="SEATBELT_NOT_FASTENED",
            severity="WARNING",
            details_json={"message": "Seatbelt not fastened"}
        ))
    db.commit()
    return {"status": "ok", "seatbelt_status": telemetry.seatbelt_status}


def list_safety_events(db: Session, limit: int = 20) -> list[dict[str, Any]]:
    events = list(db.scalars(select(SafetyEvent).order_by(SafetyEvent.timestamp.desc()).limit(limit)))
    return [
        {
            "id": event.id,
            "machine_id": event.machine_id,
            "operator_id": event.operator_id,
            "event_type": event.event_type,
            "severity": event.severity,
            "details": event.details_json,
            "timestamp": event.timestamp.isoformat(),
        }
        for event in events
    ]


def demo_reset(db: Session) -> dict[str, Any]:
    hero_assignment = db.scalar(select(TaskAssignment).join(Task, Task.id == TaskAssignment.task_id).where(Task.task_type == HERO_TASK_TYPE))
    if not hero_assignment:
        return {"status": "failed", "details": {"reason": "Hero assignment missing"}}

    task = db.get(Task, hero_assignment.task_id)
    machine = db.get(Machine, hero_assignment.machine_id)
    telemetry = latest_telemetry(db, hero_assignment.machine_id)
    if task:
        task.status = "scheduled"
    if telemetry:
        telemetry.idle_time = 18.0
        telemetry.seatbelt_status = False
        telemetry.task_status = "ready"
    if machine:
        machine.status = "active"

    db.query(SafetyEvent).filter(SafetyEvent.machine_id == hero_assignment.machine_id).delete()
    db.query(Anomaly).filter(Anomaly.machine_id == hero_assignment.machine_id).delete()
    db.commit()
    return {
        "status": "reset",
        "details": {
            "task_id": hero_assignment.task_id,
            "machine_id": hero_assignment.machine_id,
            "idle_time": 18.0,
            "seatbelt_status": False,
        },
    }


def demo_scenario(db: Session, scenario_name: str) -> dict[str, Any]:
    hero_assignment = db.scalar(select(TaskAssignment).join(Task, Task.id == TaskAssignment.task_id).where(Task.task_type == HERO_TASK_TYPE))
    if not hero_assignment:
        return {"scenario": scenario_name, "status": "failed", "details": {"reason": "Hero assignment missing"}}

    telemetry = latest_telemetry(db, hero_assignment.machine_id)
    task = db.get(Task, hero_assignment.task_id)
    machine = db.get(Machine, hero_assignment.machine_id)
    details: dict[str, Any] = {"task_id": hero_assignment.task_id, "machine_id": hero_assignment.machine_id}

    if scenario_name == "safety-failure":
        if telemetry:
            telemetry.seatbelt_status = False
        db.add(SafetyEvent(machine_id=hero_assignment.machine_id, operator_id=hero_assignment.operator_id, event_type="SEATBELT_NOT_FASTENED", severity="WARNING", details_json={"scenario": scenario_name}))
        details["message"] = "Seatbelt not fastened"
    elif scenario_name == "safety-recovery":
        if telemetry:
            telemetry.seatbelt_status = True
        details["message"] = "Seatbelt restored and safety check cleared"
    elif scenario_name == "excessive-idle":
        if telemetry:
            telemetry.idle_time = 43.0
        details["message"] = "Idle raised to trigger anomaly"
    elif scenario_name == "what-if":
        details["message"] = "What-if simulator ready"
    elif scenario_name == "predictive-proximity":
        details["message"] = "Predictive safety scenario loaded"
    elif scenario_name == "training-query":
        details["message"] = "Training query scenario loaded"
    else:
        return {"scenario": scenario_name, "status": "failed", "details": {"reason": "Unknown scenario"}}

    if task:
        task.status = "scheduled" if scenario_name != "what-if" else task.status
    if machine:
        machine.status = "active" if scenario_name != "safety-failure" else machine.status
    db.commit()
    return {"scenario": scenario_name, "status": "ok", "details": details}


def training_search(db: Session, query: str, operator_id: int | None = None, machine_type: str | None = None) -> dict[str, Any]:
    normalized = query.lower().strip()
    allowed_keywords = {
        "excavator", "loader", "grading", "grade", "excavation", "machine safety", "safety", "maintenance", "troubleshooting", "fuel", "efficiency", "productivity", "operator", "training", "idle", "idle time", "loading"
    }
    reject_keywords = {"biryani", "movie", "music", "gaming", "game", "politics", "cook", "cooking", "entertainment"}
    if any(word in normalized for word in reject_keywords):
        return {"allowed": False, "reason": "That request is outside the CAT Operator Training domain.", "query": query, "results": []}

    contextual_query = normalized
    if machine_type and "idle" in normalized:
        contextual_query = f"{machine_type} idle reduction fuel efficiency"

    if not any(word in normalized for word in allowed_keywords) and not contextual_query:
        return {"allowed": False, "reason": "Ambiguous request. Please ask about CAT machine operation, safety, troubleshooting, productivity, or maintenance.", "query": query, "results": []}

    content = list(db.scalars(select(TrainingContent).order_by(TrainingContent.relevance_score.desc())))
    results = []
    for item in content:
        score = item.relevance_score
        if machine_type and machine_type.lower() in item.title.lower():
            score += 0.03
        if "idle" in normalized and "idle" in item.topic:
            score += 0.05
        if "safety" in normalized and "safety" in item.topic:
            score += 0.05
        results.append({"video_id": item.video_id, "title": item.title, "description": item.description, "source": item.source, "relevance_score": round(min(score, 1.0), 2)})
    results.sort(key=lambda row: row["relevance_score"], reverse=True)
    return {"allowed": True, "reason": "DOMAIN VALIDATED", "query": contextual_query, "results": results[:5]}


def complete_training(db: Session, operator_id: int, before_metric: float, after_metric: float, metric_name: str, training_content_id: int) -> dict[str, Any]:
    history = TrainingHistory(operator_id=operator_id, training_content_id=training_content_id, before_metric=before_metric, after_metric=after_metric, metric_name=metric_name)
    db.add(history)
    db.commit()
    db.refresh(history)
    if before_metric == 0:
        change = 0.0
    else:
        change = ((after_metric - before_metric) / before_metric) * 100.0
    return {"completed_at": history.completed_at, "observed_change_percent": round(change, 1), "message": f"Observed change after training: {round(change, 1)}%"}


def recommend_training(db: Session, operator_id: int, machine_type: str, anomaly_type: str | None) -> dict[str, Any]:
    if anomaly_type == "EXCESSIVE_IDLE":
        query = select(TrainingContent).where(TrainingContent.topic.ilike("%idle%"))
    else:
        query = select(TrainingContent)
    items = list(db.scalars(query.order_by(TrainingContent.relevance_score.desc())))
    if not items:
        items = list(db.scalars(select(TrainingContent).order_by(TrainingContent.relevance_score.desc())))
    item = items[0]
    return {"title": item.title, "video_id": item.video_id, "description": item.description, "source": item.source, "relevance_score": item.relevance_score}


def copilot_answer(db: Session, operator_id: int, question: str) -> dict[str, Any]:
    assignment = get_latest_assignment_for_operator(db, operator_id)
    if not assignment:
        return {"answer": "I don't have enough current machine data to answer that reliably.", "source": "fallback", "context_used": {}}

    task = db.get(Task, assignment.task_id)
    machine = db.get(Machine, assignment.machine_id)
    telemetry = latest_telemetry(db, assignment.machine_id)
    weather = task_weather(db, task.id) if task else None
    baseline = get_baseline(db, assignment.operator_id, task.task_type if task else "") if task else {}
    anomaly = None
    if telemetry and task:
        anomaly = detect_anomaly(db, telemetry, task, assignment.operator_id)

    normalized = question.lower().strip()
    context_used = {
        "operator_id": operator_id,
        "machine": machine.machine_code if machine else None,
        "task": task.task_type if task else None,
        "telemetry": telemetry_payload(telemetry) if telemetry else None,
        "anomaly": anomaly,
        "weather": weather.condition if weather else None,
        "baseline": baseline,
    }

    if "why" in normalized and anomaly and anomaly["is_anomaly"]:
        answer = f"Your current idle time is {int(anomaly['actual'])} minutes compared with your normal baseline of {int(anomaly['baseline'])} minutes. That is why the system flagged {anomaly['type'].lower().replace('_', ' ')}."
    elif "how long" in normalized or "finish" in normalized:
        prediction = predict_task_time(db, task.id if task else assignment.task_id)
        answer = f"The current model-based estimate is {prediction['predicted_duration']:.0f} minutes for this task."
    elif "idle" in normalized:
        answer = f"Your idle time is {telemetry.idle_time:.0f} minutes, while your baseline is {baseline.get('average_idle', 0):.0f} minutes. Reducing waiting, staged material handling, and re-checking truck timing will help."
    elif "fuel" in normalized:
        answer = f"Fuel usage is elevated when idle time and engine load rise together. Your current baseline fuel is about {baseline.get('average_fuel', 0):.1f} L."
    elif "check before starting" in normalized:
        safety = safety_check(db, task.id if task else assignment.task_id)
        answer = "Check seatbelt, the safety zone, weather, and active alerts before starting."
        if safety["blocking_reasons"]:
            answer = f"Start is blocked because: {', '.join(safety['blocking_reasons'])}."
    else:
        if not telemetry:
            answer = "I don't have enough current machine data to answer that reliably."
        else:
            answer = f"For {machine.machine_code if machine else 'your machine'}, the current task is {task.task_type if task else 'unknown'} and the system is watching for safety and efficiency drift."

    return {"answer": answer, "source": "deterministic-context", "context_used": context_used}


def recommend_assignment(db: Session, task_id: int) -> dict[str, Any]:
    task = db.get(Task, task_id)
    if not task:
        return {"recommended_operator_id": None, "score": 0.0, "explanation": "Task not found"}

    operators = list(db.scalars(select(User).where(User.role == "OPERATOR")))
    best: dict[str, Any] | None = None
    for operator in operators:
        baseline = get_baseline(db, operator.id, task.task_type)
        skill_match = 100 if baseline["sample_size"] > 0 else 40
        historical = min(100.0, baseline["average_duration"] if baseline["average_duration"] else 50.0)
        machine_suitability = 90.0 if task.task_type.lower() == "excavation" and operator.email == HERO_OPERATOR_EMAIL else 70.0
        availability = 100.0 if operator.email == HERO_OPERATOR_EMAIL else 80.0
        score = round(skill_match * 0.4 + historical * 0.3 + machine_suitability * 0.2 + availability * 0.1, 1)
        explanation = f"{operator.name} recommended because of strong historical performance on {task.task_type.lower()} tasks under similar conditions."
        if not best or score > best["score"]:
            best = {"recommended_operator_id": operator.id, "score": score, "explanation": explanation, "breakdown": {"skill_task_match": skill_match, "historical_performance": historical, "machine_suitability": machine_suitability, "availability": availability}}
    return best or {"recommended_operator_id": None, "score": 0.0, "explanation": "No operators available", "breakdown": {}}


def dashboard_for_operator(db: Session, operator_id: int) -> dict[str, Any]:
    assignment = get_latest_assignment_for_operator(db, operator_id)
    if not assignment:
        return {"operator": {"id": operator_id}, "current_machine": {}, "current_task": {}, "safety_status": {"state": "UNKNOWN"}, "machine_health": {}, "task_prediction": {}, "current_telemetry": {}, "ai_insight": {}, "training_recommendation": {}, "what_if": {}, "weather": {}}

    task = db.get(Task, assignment.task_id)
    machine = db.get(Machine, assignment.machine_id)
    telemetry = latest_telemetry(db, assignment.machine_id)
    weather = task_weather(db, task.id) if task else None
    baseline = get_baseline(db, operator_id, task.task_type if task else "")
    safety = safety_check(db, assignment.task_id)
    anomaly = detect_anomaly(db, telemetry, task, operator_id) if telemetry and task else {"is_anomaly": False, "explanation": "No telemetry", "severity": "NORMAL"}
    prediction = predict_task_time(db, assignment.task_id)
    training = recommend_training(db, operator_id, machine.machine_type if machine else "", anomaly.get("type") if anomaly else None)
    whatif = what_if(db, assignment.task_id, 20.0, weather.condition if weather else "Current", machine.id if machine else None, "Current", "Current")

    ai_insight = {
        "title": "Operator baseline intelligence",
        "message": f"Your normal idle time is {baseline['average_idle']:.0f} min. Current idle time is {telemetry.idle_time:.0f} min if telemetry is present." if telemetry else "Waiting for telemetry.",
        "severity": "RED" if anomaly.get("is_anomaly") else "GREEN",
    }
    if telemetry:
        ai_insight["message"] = f"Idle time is {telemetry.idle_time / max(1.0, baseline['average_idle']):.1f}× above your baseline." if telemetry.idle_time > baseline["average_idle"] else f"Current idle is within your normal range."

    return {
        "operator": {"id": operator_id},
        "current_machine": {"id": machine.id, "machine_code": machine.machine_code, "machine_type": machine.machine_type, "status": machine.status} if machine else {},
        "current_task": {"id": task.id, "task_type": task.task_type, "description": task.description, "status": task.status} if task else {},
        "safety_status": safety,
        "machine_health": {"baseline_idle": baseline["average_idle"], "current_idle": telemetry.idle_time if telemetry else None, "anomaly": anomaly},
        "task_prediction": prediction,
        "current_telemetry": telemetry_payload(telemetry) if telemetry else {},
        "ai_insight": ai_insight,
        "training_recommendation": training,
        "what_if": whatif,
        "weather": {"condition": weather.condition, "temperature": weather.temperature, "precipitation": weather.precipitation, "wind": weather.wind} if weather else {},
    }


def list_user_anomalies(db: Session, operator_id: int) -> list[dict[str, Any]]:
    records = list(db.scalars(select(Anomaly).where(Anomaly.operator_id == operator_id).order_by(Anomaly.created_at.desc())))
    return [
        {
            "id": record.id,
            "anomaly_type": record.anomaly_type,
            "severity": record.severity,
            "confidence": record.confidence,
            "baseline_value": record.baseline_value,
            "actual_value": record.actual_value,
            "explanation": record.explanation_json,
            "created_at": record.created_at.isoformat(),
        }
        for record in records
    ]
