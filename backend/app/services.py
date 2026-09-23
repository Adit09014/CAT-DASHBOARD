from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from math import cos, radians, sin, sqrt
from pathlib import Path
from typing import Any

def utcnow() -> datetime:
    return datetime.now(timezone.utc)

import json
import re
import httpx
import joblib
import numpy as np
import pandas as pd

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .core import create_access_token, get_settings, hash_password, verify_password
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
        TrainingContent(
            video_id="s_7pWTm0WH4",
            title="HOW TO | Use Your 6-in-1 Shovel (JCB Backhoe Operations)",
            description="Official JCB operator guide on operating the 6-in-1 front shovel and backhoe loader controls for spreading, grading, and loading.",
            topic="backhoe operation",
            source="curated",
            relevance_score=0.98,
        ),
        TrainingContent(
            video_id="pdodX0mKd98",
            title="Operating a Cat 320 Excavator: The Basics & Joystick Controls",
            description="Hands-on operator training: cab layout, joystick control patterns (ISO/SAE), swing brake, tracks, and bucket curling fundamentals.",
            topic="excavator operation",
            source="curated",
            relevance_score=0.97,
        ),
        TrainingContent(
            video_id="H6kRU_2z73Y",
            title="Tackling Idle Time on your Cat® Machine & Reducing Fuel Burn",
            description="Official Caterpillar dealer training: auto-idle shutdown, engine throttle management, and eliminating wasted fuel per shift.",
            topic="idle reduction",
            source="curated",
            relevance_score=0.98,
        ),
        TrainingContent(
            video_id="hE6Y4XuVfmo",
            title="Trench Cave-In Safety & Excavation Protective Systems (OSHA)",
            description="OSHA certified safety guidance on trench wall stability, cave-in dynamics, trench boxes, shoring, and safe egress.",
            topic="trench safety",
            source="curated",
            relevance_score=0.96,
        ),
        TrainingContent(
            video_id="M4kSYgJBqZI",
            title="Wheel Loader Operating Techniques — V-Pattern Truck Loading",
            description="Mastering short cycle times, V-shape loading pattern, bucket curl at pile entry, and smooth gear transitions.",
            topic="loading",
            source="curated",
            relevance_score=0.95,
        ),
        TrainingContent(
            video_id="0bAw7J7gHD0",
            title="Cat® Excavator Daily Walkaround Inspection Checklist",
            description="Official Caterpillar walkaround inspection: ground-level walkaround, structural pins, track tension, oil leaks, and cab safety check.",
            topic="inspection & safety",
            source="curated",
            relevance_score=0.97,
        ),
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


CAT_TRAINING_CATALOG: list[dict[str, Any]] = [
    {
        "video_id": "s_7pWTm0WH4",
        "title": "HOW TO | Use Your 6-in-1 Shovel (JCB Backhoe Operations)",
        "description": "Official JCB guide on operating the 6-in-1 front shovel and backhoe loader controls for spreading, grading, and loading.",
        "topic": "backhoe operation",
        "category": "Backhoe & JCB Operations",
        "keywords": ["jcb", "backhoe", "cat 420", "loader backhoe", "3dx", "outriggers", "stabilizers", "boom", "controls", "drive backhoe", "how to use a jcb", "shovel"],
        "source": "curated",
        "relevance_score": 0.98,
    },
    {
        "video_id": "Id2RXWqkPi8",
        "title": "HOW TO | Perform Daily Checks on Heavy Equipment (JCB Backhoe)",
        "description": "Official walkaround guide: engine oil, coolant levels, hydraulic cylinders, tire pressure, and safety interlocks before starting.",
        "topic": "inspection & safety",
        "category": "Pre-Shift Inspection & Safety",
        "keywords": ["jcb check", "daily checks", "inspection", "walkaround", "pre-trip", "pre-start", "oil level", "coolant", "fluids", "morning check"],
        "source": "curated",
        "relevance_score": 0.96,
    },
    {
        "video_id": "pdodX0mKd98",
        "title": "Operating a Cat 320 Excavator: The Basics & Joystick Controls",
        "description": "Hands-on operator training: cab layout, joystick control patterns (ISO/SAE), swing brake, tracks, and bucket curling fundamentals.",
        "topic": "excavator operation",
        "category": "Excavator Controls & Operations",
        "keywords": ["excavator", "cat 320", "joystick", "swing", "digger", "controls", "tracks", "operating excavator", "bucket"],
        "source": "curated",
        "relevance_score": 0.97,
    },
    {
        "video_id": "1SG4x9hUIKg",
        "title": "Excavator Operation Explained: Movement & Mechanics",
        "description": "Clear conceptual guide explaining how joystick inputs translate into boom, stick, bucket, and swing movements.",
        "topic": "excavator operation",
        "category": "Excavator Controls & Operations",
        "keywords": ["excavator operation", "how excavator works", "boom stick bucket", "swing motor", "digger guide"],
        "source": "curated",
        "relevance_score": 0.93,
    },
    {
        "video_id": "MNBE5Z17NDs",
        "title": "How to Use Grade Control on a Cat Next Gen Excavator",
        "description": "Step-by-step walkthrough of Cat Grade with 2D/3D depth and slope guidance, joystick shortcuts, and Grade Assist.",
        "topic": "grading",
        "category": "Excavator Controls & Operations",
        "keywords": ["grade control", "cat next gen", "excavator grading", "depth slope", "grade assist", "peterson cat"],
        "source": "curated",
        "relevance_score": 0.95,
    },
    {
        "video_id": "H6kRU_2z73Y",
        "title": "Tackling Idle Time on your Cat® Machine & Reducing Fuel Burn",
        "description": "Official Caterpillar dealer training: auto-idle shutdown, engine throttle management, and eliminating wasted fuel per shift.",
        "topic": "idle reduction",
        "category": "Fuel Efficiency & Idle Reduction",
        "keywords": ["idle", "idling", "fuel", "diesel", "consumption", "eco mode", "fuel saving", "efficiency", "idle reduction", "reduce excavator idle"],
        "source": "curated",
        "relevance_score": 0.98,
    },
    {
        "video_id": "IJsTKbbTdYs",
        "title": "Get More out of your Fuel with Cat® Machines",
        "description": "Official Caterpillar guide to fuel efficiency: matching engine modes, hydraulic response settings, and payload optimization.",
        "topic": "idle reduction",
        "category": "Fuel Efficiency & Idle Reduction",
        "keywords": ["fuel efficiency", "save fuel", "diesel", "fuel burn", "cat fuel", "payload", "engine modes"],
        "source": "curated",
        "relevance_score": 0.95,
    },
    {
        "video_id": "0bAw7J7gHD0",
        "title": "Cat® Excavator Daily Walkaround Inspection Checklist",
        "description": "Official Caterpillar walkaround inspection: ground-level walkaround, structural pins, track tension, oil leaks, and cab safety check.",
        "topic": "inspection & safety",
        "category": "Pre-Shift Inspection & Safety",
        "keywords": ["walkaround", "inspection", "pre-shift", "pre-trip", "cat walkaround", "daily check", "track tension", "seatbelt", "safety check"],
        "source": "curated",
        "relevance_score": 0.97,
    },
    {
        "video_id": "hE6Y4XuVfmo",
        "title": "Trench Cave-In Safety & Excavation Protective Systems (OSHA)",
        "description": "OSHA certified safety guidance on trench wall stability, cave-in dynamics, trench boxes, shoring, and safe egress.",
        "topic": "trench safety",
        "category": "Safety & Compliance",
        "keywords": ["trench", "cave in", "trenching safety", "shoring", "soil collapse", "osha", "spoil pile", "trench box", "excavation safety"],
        "source": "curated",
        "relevance_score": 0.96,
    },
    {
        "video_id": "2cE-pbuiukI",
        "title": "Cat® Wheel Loader | Daily Walkaround Inspection",
        "description": "Official Caterpillar walkaround guide for wheel loaders: articulating joint, steering lock, lift arm pins, tires, and brake fluids.",
        "topic": "inspection & safety",
        "category": "Pre-Shift Inspection & Safety",
        "keywords": ["wheel loader inspection", "loader walkaround", "articulation joint", "tires", "pre-shift loader", "steering lock"],
        "source": "curated",
        "relevance_score": 0.94,
    },
    {
        "video_id": "M4kSYgJBqZI",
        "title": "Wheel Loader Operating Techniques — V-Pattern Truck Loading",
        "description": "Mastering short cycle times, V-shape loading pattern, bucket curl at pile entry, and smooth gear transitions.",
        "topic": "loading",
        "category": "Wheel Loader Operations",
        "keywords": ["loader", "wheel loader", "loading", "v-cycle", "v-pattern", "dump truck", "bucket fill", "cycle time", "haul truck"],
        "source": "curated",
        "relevance_score": 0.95,
    },
    {
        "video_id": "_bfGNKJRD40",
        "title": "How to Inspect Your Cat® Hydraulic System",
        "description": "Official Caterpillar technical walkthrough: hydraulic fluid level, cylinder seals, high-pressure line checks, and pump health.",
        "topic": "maintenance",
        "category": "Maintenance & Diagnostics",
        "keywords": ["hydraulic", "hydraulics", "pressure", "cylinders", "fluid", "pump", "oil leak", "slow hydraulic", "maintenance", "troubleshoot"],
        "source": "curated",
        "relevance_score": 0.96,
    },
]


def classify_training_query_llm(query: str, machine_type: str | None = None) -> dict[str, Any] | None:
    settings = get_settings()
    if not settings.anthropic_api_key:
        return None
    try:
        import json, re
        prompt = f"""You are the CAT Guardian AI Training Domain Guard for Caterpillar and heavy construction equipment.
Evaluate whether the following operator query is relevant to heavy machinery operation, construction safety, equipment maintenance, inspection, or operational productivity.

Operator Query: "{query}"
Machine Context: "{machine_type or 'General Heavy Machinery'}"

Rules:
1. Equipment accepted: Excavators, Backhoes (including JCB, loader-backhoes), Wheel Loaders, Bulldozers, Motor Graders, Skid Steers, Haul Trucks, Compactors, Trenchers.
2. Topics accepted: Controls, operation, digging, grading, loading, idling reduction, fuel efficiency, pre-shift walkaround inspection, hydraulic troubleshooting, slope safety, trench cave-in prevention, seatbelts, PPE, blind spots.
3. Reject strictly if query is off-topic (e.g. food/recipes like biryani, entertainment, movies, songs, casual chat, politics, video games, general software).
4. For accepted queries, provide:
   - "allowed": true
   - "category": high-level machinery topic category
   - "reason": professional justification why this enhances operator skills/safety
   - "expanded_query": an optimized search term for YouTube Caterpillar tutorials
   - "suggested_queries": 3 related heavy machinery training queries
5. For rejected queries, provide:
   - "allowed": false
   - "category": the detected non-machinery topic
   - "reason": explanation that CAT Guardian is specialized for heavy machinery and why this query was filtered out
   - "suggested_queries": 3 valid heavy equipment training queries the user can try

Respond ONLY with valid JSON with keys: "allowed" (bool), "category" (str), "reason" (str), "expanded_query" (str or null), "suggested_queries" (list of str)."""

        with httpx.Client(timeout=4.0) as client:
            resp = client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": settings.anthropic_api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": "claude-3-5-haiku-20241022",
                    "max_tokens": 400,
                    "messages": [{"role": "user", "content": prompt}],
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                content = data.get("content", [{}])[0].get("text", "")
                match = re.search(r"\{.*\}", content, re.DOTALL)
                if match:
                    return json.loads(match.group(0))
    except Exception:
        pass
    return None


def classify_training_query_semantic(query: str, machine_type: str | None = None) -> dict[str, Any]:
    normalized = query.lower().strip()
    words = set(re.findall(r"\b[a-z0-9_\-]+\b", normalized)) if "re" in globals() else set(normalized.replace("?", " ").replace("!", " ").replace(".", " ").replace(",", " ").split())

    # Strict rejection categories
    culinary_keywords = {"biryani", "recipe", "cook", "cooking", "kitchen", "bake", "baking", "food", "pizza", "burger", "curry", "pasta", "dish", "rice", "lunch", "dinner", "breakfast", "meal", "chef", "spices", "chicken", "paneer"}
    entertainment_keywords = {"movie", "film", "cinema", "actor", "actress", "song", "music", "album", "pop", "hollywood", "bollywood", "netflix", "spotify", "game", "gaming", "playstation", "xbox", "fortnite", "minecraft", "videogame"}
    sports_keywords = {"cricket", "football", "soccer", "basketball", "nfl", "nba", "ipl", "tennis", "olympics"}
    politics_finance_keywords = {"president", "election", "politics", "crypto", "bitcoin", "stocks", "wall street", "currency", "crypto"}
    casual_offtopic = {"dating", "girlfriend", "boyfriend", "love", "joke", "weather in", "homework", "essay", "dance", "comedy"}

    if any(w in normalized for w in culinary_keywords):
        return {
            "allowed": False,
            "category": "Non-Industrial / Culinary",
            "reason": "Inquiry pertains to culinary recipes and food preparation. CAT Guardian only indexes heavy equipment operations, safety protocols, maintenance, and jobsite productivity.",
            "expanded_query": None,
            "suggested_queries": [
                "How do I use a jcb?",
                "How do I reduce excavator idle time?",
                "Safe trenching protocols on unstable ground",
            ],
        }

    if any(w in normalized for w in entertainment_keywords):
        return {
            "allowed": False,
            "category": "Non-Industrial / Entertainment",
            "reason": "Request is an entertainment or media inquiry. CAT Guardian is an industrial training intelligence platform exclusively designed for Caterpillar heavy equipment operators.",
            "expanded_query": None,
            "suggested_queries": [
                "How to operate a JCB backhoe loader",
                "Pre-shift walkaround inspection checklist",
                "Wheel loader V-pattern loading techniques",
            ],
        }

    if any(w in normalized for w in sports_keywords.union(politics_finance_keywords).union(casual_offtopic)):
        return {
            "allowed": False,
            "category": "Non-Industrial / Off-Domain",
            "reason": "Query is outside the heavy machinery operational domain. Please query about Caterpillar equipment operation, safety, inspections, or maintenance.",
            "expanded_query": None,
            "suggested_queries": [
                "Cat 320 excavator joystick controls",
                "Dozer slope grading techniques",
                "Hydraulic system inspection checklist",
            ],
        }

    # Heavy Machinery Concept Recognition
    jcb_backhoe_terms = {"jcb", "backhoe", "cat 420", "loader backhoe", "3dx", "outriggers", "stabilizers", "back hoe"}
    excavator_terms = {"excavator", "digger", "cat 320", "cat 336", "cat 349", "trackhoe", "boom", "stick", "hydraulic arm", "swing brake"}
    loader_terms = {"loader", "wheel loader", "payloader", "front loader", "cat 950", "cat 966", "v-cycle", "v pattern", "truck loading"}
    dozer_terms = {"dozer", "bulldozer", "cat d6", "cat d8", "blade", "ripper", "track-type tractor", "grade slope"}
    grader_terms = {"grader", "motor grader", "cat 140", "moldboard", "crowning", "road maintainer"}
    skid_steer_terms = {"skid steer", "bobcat", "track loader", "ctl", "ssl", "cat 259"}
    safety_terms = {"safety", "trench", "trenching", "cave-in", "cave in", "shoring", "benching", "seatbelt", "ppe", "inspection", "walkaround", "pre-trip", "pre-shift", "blind spot", "swing radius", "hazard", "rollover"}
    maintenance_terms = {"hydraulic", "hydraulics", "fluid", "oil", "leak", "overheating", "service", "maintenance", "grease", "greasing", "filter", "troubleshoot", "fault code", "warning light"}
    productivity_terms = {"idle", "idling", "fuel", "diesel", "efficiency", "cycle time", "eco mode", "fuel burn", "consumption"}
    general_operation_terms = {"operate", "operation", "operating", "use", "how to use", "how do i use", "how do you use", "controls", "driving", "joystick", "maneuver", "dig", "digging", "grading", "loading"}

    has_jcb = any(t in normalized for t in jcb_backhoe_terms)
    has_excavator = any(t in normalized for t in excavator_terms)
    has_loader = any(t in normalized for t in loader_terms)
    has_dozer = any(t in normalized for t in dozer_terms)
    has_grader = any(t in normalized for t in grader_terms)
    has_skid = any(t in normalized for t in skid_steer_terms)
    has_safety = any(t in normalized for t in safety_terms)
    has_maint = any(t in normalized for t in maintenance_terms)
    has_prod = any(t in normalized for t in productivity_terms)
    has_op = any(t in normalized for t in general_operation_terms)

    # Machine type context boost
    if machine_type:
        mt_lower = machine_type.lower()
        if "excavator" in mt_lower:
            has_excavator = True
        elif "loader" in mt_lower:
            has_loader = True
        elif "dozer" in mt_lower:
            has_dozer = True
        elif "grader" in mt_lower:
            has_grader = True

    is_machinery_domain = (
        has_jcb or has_excavator or has_loader or has_dozer or has_grader or has_skid or
        has_safety or has_maint or has_prod or
        (has_op and any(w in normalized for w in {"cat", "machine", "heavy", "equipment", "caterpillar", "truck", "bucket", "arm"}))
    )

    if not is_machinery_domain:
        return {
            "allowed": False,
            "category": "General / Unspecified",
            "reason": "Request lacks specific heavy machinery context. CAT Guardian provides AI training videos for Caterpillar & earthmoving operations, safety protocols, maintenance, and productivity.",
            "expanded_query": None,
            "suggested_queries": [
                "How do I use a jcb?",
                "How do I reduce excavator idle time?",
                "Safe trenching protocols on unstable ground",
                "Pre-shift walkaround inspection checklist",
            ],
        }

    # Determine classification details with fine-grained intent precedence
    if has_jcb:
        category = "Backhoe & JCB Operations"
        expanded = "JCB 3DX & Cat Backhoe Loader beginner controls driving and digging operations tutorial"
        reason = "Request matched to CAT & JCB backhoe loader operational training and operator controls guide."
        suggestions = ["JCB backhoe trench digging technique", "Daily walkaround inspection for backhoe loaders", "Fuel conservation while operating backhoe"]
    elif "trench" in normalized or "cave-in" in normalized or "shoring" in normalized:
        category = "Safety & Compliance"
        expanded = "Heavy equipment safe trenching cave-in prevention and OSHA protective systems"
        reason = "Request matched to heavy excavation and trenching safety protocols."
        suggestions = ["Daily machine walkaround inspection", "Jobsite blind spots and pedestrian safety", "Seatbelt interlock protocols"]
    elif any(w in normalized for w in {"inspection", "walkaround", "pre-trip", "pre-start", "check", "morning"}):
        category = "Pre-Shift Inspection & Safety"
        expanded = "Heavy equipment daily walkaround pre-shift inspection checklist and safety check"
        reason = "Request matched to daily equipment walkaround inspections and pre-start verification."
        suggestions = ["Hydraulic system inspection checklist", "Excavator daily inspection checklist", "Seatbelt interlock protocols"]
    elif any(w in normalized for w in {"idle", "idling", "fuel", "diesel", "eco mode", "save fuel"}):
        category = "Fuel Efficiency & Idle Reduction"
        expanded = "Cat machine idle management engine auto-shutdown and operational fuel saving techniques"
        reason = "Request matched to heavy machinery idle time reduction and fuel efficiency best practices."
        suggestions = ["Excavator joystick controls guide", "Wheel loader cycle time reduction", "Pre-shift machine inspection"]
    elif any(w in normalized for w in {"hydraulic", "fluid", "pressure", "leak", "filter", "troubleshoot"}):
        category = "Maintenance & Diagnostics"
        expanded = "Heavy machinery hydraulic system inspection troubleshooting and preventive maintenance"
        reason = "Request matched to equipment diagnostics, hydraulic systems, and preventive maintenance."
        suggestions = ["Daily pre-start inspection checklist", "Excavator track tensioning guide", "Engine coolant and oil checks"]
    elif has_loader:
        category = "Wheel Loader Operations"
        expanded = "Cat wheel loader V-pattern truck loading short cycle times and bucket fill optimization"
        reason = "Request matched to wheel loader loading techniques, V-cycle optimization, and productivity."
        suggestions = ["Wheel loader daily walkaround inspection", "Reducing wheel loader fuel consumption", "Wheel loader blind spot safety"]
    elif has_dozer:
        category = "Bulldozer & Grading Operations"
        expanded = "Cat dozer slope grading blade pitch control and 3D grade assistance tutorial"
        reason = "Request matched to bulldozer earthmoving, slope cutting, and finish grade techniques."
        suggestions = ["Bulldozer blade maintenance", "Safe slope traversal for track-type tractors", "Motor grader crowning technique"]
    elif has_grader:
        category = "Motor Grader Operations"
        expanded = "Motor grader road crowning moldboard positioning and haul road maintenance"
        reason = "Request matched to motor grader haul road crowning, moldboard angles, and precision grading."
        suggestions = ["Grader wheel lean technique", "Dozer slope grading guide", "Heavy equipment pre-trip safety"]
    elif has_skid:
        category = "Compact Equipment Operations"
        expanded = "Cat skid steer loader controls maneuvers zero radius turns and attachment guide"
        reason = "Request matched to compact track loader and skid steer operational maneuvering."
        suggestions = ["Skid steer daily inspection", "Preventing skid steer rollovers", "Excavator basic controls"]
    elif has_safety:
        category = "Safety & Compliance"
        expanded = "Jobsite safety machine blind spots swing radius hazards and ground worker communication"
        reason = "Request matched to critical jobsite safety protocols and hazard prevention."
        suggestions = ["Daily machine walkaround inspection", "Jobsite blind spots and pedestrian safety", "Seatbelt interlock protocols"]
    elif has_excavator:
        category = "Excavator Controls & Operations"
        expanded = "Cat Next Gen excavator joystick configuration electro-hydraulic controls and operating guide"
        reason = "Request matched to Caterpillar excavator controls, maneuvering, and operational best practices."
        suggestions = ["How to reduce excavator idle time?", "Safe trenching techniques and benching", "Excavator daily inspection checklist"]
    else:
        category = "Heavy Equipment Operational Training"
        expanded = f"Caterpillar {normalized} heavy equipment operator training tutorial"
        reason = "Request matched to Caterpillar machinery operations and operator development."
        suggestions = ["How do I use a jcb?", "How do I reduce excavator idle time?", "Safe trenching protocols on unstable ground"]

    return {
        "allowed": True,
        "category": category,
        "reason": reason,
        "expanded_query": expanded,
        "suggested_queries": suggestions,
    }


def search_youtube_api(query: str, api_key: str, max_results: int = 5) -> list[dict[str, Any]]:
    try:
        url = "https://www.googleapis.com/youtube/v3/search"
        params = {
            "part": "snippet",
            "q": query,
            "type": "video",
            "maxResults": max_results,
            "key": api_key,
        }
        with httpx.Client(timeout=4.0) as client:
            resp = client.get(url, params=params)
            if resp.status_code == 200:
                items = resp.json().get("items", [])
                results = []
                for item in items:
                    vid = item.get("id", {}).get("videoId")
                    snippet = item.get("snippet", {})
                    if vid:
                        results.append({
                            "video_id": vid,
                            "title": snippet.get("title", ""),
                            "description": snippet.get("description", ""),
                            "source": "youtube_live",
                            "relevance_score": 0.96,
                            "thumbnail_url": snippet.get("thumbnails", {}).get("medium", {}).get("url") or f"https://img.youtube.com/vi/{vid}/mqdefault.jpg",
                        })
                return results
    except Exception:
        pass
    return []


def training_search(db: Session, query: str, operator_id: int | None = None, machine_type: str | None = None) -> dict[str, Any]:
    # 1. Multi-tier classification: Try LLM first if key configured, otherwise use semantic parser
    ai_classification = classify_training_query_llm(query, machine_type)
    if not ai_classification:
        ai_classification = classify_training_query_semantic(query, machine_type)

    if not ai_classification.get("allowed", False):
        return {
            "allowed": False,
            "reason": ai_classification.get("reason", "Request rejected by CAT Guardian Domain Guard."),
            "query": query,
            "category": ai_classification.get("category", "Non-Industrial"),
            "ai_expanded_query": None,
            "suggested_queries": ai_classification.get("suggested_queries", []),
            "results": [],
        }

    expanded_query = ai_classification.get("expanded_query") or query
    category = ai_classification.get("category", "Heavy Equipment Operations")

    # 2. Try YouTube Live Search if API Key is configured
    settings = get_settings()
    youtube_results = []
    if settings.youtube_api_key:
        youtube_results = search_youtube_api(expanded_query, settings.youtube_api_key)

    # 3. Match against Curated Catalog and Database Records
    normalized_q = f"{query} {expanded_query}".lower()
    query_tokens = set(re.findall(r"\b[a-z0-9_\-]+\b", normalized_q))

    catalog_scored: list[dict[str, Any]] = []
    for item in CAT_TRAINING_CATALOG:
        score = 0.50
        # Check token overlaps with item keywords and title
        item_words = set(re.findall(r"\b[a-z0-9_\-]+\b", f"{item['title']} {item['description']} {' '.join(item['keywords'])} {item.get('category', '')}".lower()))
        matching_tokens = query_tokens.intersection(item_words)
        score += min(len(matching_tokens) * 0.08, 0.25)

        # Direct category match
        if item.get("category") == category:
            score += 0.15

        # Direct topic match
        if item.get("topic") in normalized_q:
            score += 0.10

        # Specific high-confidence domain boosts
        if ("jcb" in query_tokens or "backhoe" in query_tokens) and item["topic"] == "backhoe operation":
            score += 0.35
        if ("trench" in query_tokens or "trenching" in query_tokens) and "trench" in item["topic"]:
            score += 0.35
        if any(k in query_tokens for k in ["inspection", "walkaround", "check", "morning"]) and "inspection" in item["topic"]:
            score += 0.35
        if any(k in query_tokens for k in ["idle", "fuel", "diesel", "consumption"]) and "idle" in item["topic"]:
            score += 0.35
        if ("loader" in query_tokens) and "loading" in item["topic"]:
            score += 0.35
        if ("dozer" in query_tokens or "grading" in query_tokens or "grade" in query_tokens) and "grading" in item["topic"]:
            score += 0.35
        if any(k in query_tokens for k in ["hydraulic", "pressure", "cylinders", "leak"]) and "maintenance" in item["topic"]:
            score += 0.35
        if ("excavator" in query_tokens and not any(k in query_tokens for k in ["jcb", "backhoe", "trench", "inspection", "idle", "fuel", "hydraulic"])) and "excavator" in item["topic"]:
            score += 0.35

        # Machine context boost
        if machine_type and machine_type.lower() in item["title"].lower():
            score += 0.05

        catalog_scored.append({
            "video_id": item["video_id"],
            "title": item["title"],
            "description": item["description"],
            "source": item["source"],
            "category": item.get("category", category),
            "relevance_score": round(min(score, 0.99), 2),
            "thumbnail_url": f"https://img.youtube.com/vi/{item['video_id']}/mqdefault.jpg",
        })

    # Combine results, prioritizing YouTube Live results if available, then top curated matches
    combined: list[dict[str, Any]] = []
    seen_ids: set[str] = set()

    for item in youtube_results:
        if item["video_id"] not in seen_ids and item["video_id"] != "dQw4w9WgXcQ":
            combined.append(item)
            seen_ids.add(item["video_id"])

    catalog_scored.sort(key=lambda x: x["relevance_score"], reverse=True)
    for item in catalog_scored:
        if item["video_id"] not in seen_ids and item["video_id"] != "dQw4w9WgXcQ":
            combined.append(item)
            seen_ids.add(item["video_id"])

    # Ensure the top discovered training items are saved to the database for future reference
    for top_item in combined[:3]:
        existing = db.scalar(select(TrainingContent).where(TrainingContent.video_id == top_item["video_id"]))
        if not existing:
            new_record = TrainingContent(
                video_id=top_item["video_id"],
                title=top_item["title"],
                description=top_item["description"],
                topic=top_item.get("category", category).lower(),
                source=top_item["source"],
                relevance_score=top_item["relevance_score"],
            )
            db.add(new_record)
    try:
        db.commit()
    except Exception:
        db.rollback()

    return {
        "allowed": True,
        "reason": ai_classification.get("reason", "DOMAIN VALIDATED"),
        "query": query,
        "category": category,
        "ai_expanded_query": expanded_query,
        "suggested_queries": ai_classification.get("suggested_queries", []),
        "results": combined[:6],
    }


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
