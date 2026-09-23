from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Index, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)


class Machine(Base):
    __tablename__ = "machines"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    machine_code: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    machine_type: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    age_years: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="active", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    task_type: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    weather_condition: Mapped[str] = mapped_column(String(64), default="Clear", nullable=False)
    required_skill: Mapped[str] = mapped_column(String(64), nullable=False)
    scheduled_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="scheduled", nullable=False)
    estimated_duration: Mapped[int] = mapped_column(Integer, default=60, nullable=False)
    actual_duration: Mapped[int | None] = mapped_column(Integer, nullable=True)


class TaskAssignment(Base):
    __tablename__ = "task_assignments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id"), index=True, nullable=False)
    operator_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    machine_id: Mapped[int] = mapped_column(ForeignKey("machines.id"), index=True, nullable=False)
    assigned_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    assignment_reason: Mapped[str] = mapped_column(Text, default="Demo assignment", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)


class MachineTelemetry(Base):
    __tablename__ = "machine_telemetry"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    machine_id: Mapped[int] = mapped_column(ForeignKey("machines.id"), index=True, nullable=False)
    operator_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), index=True, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True, nullable=False)
    engine_hours: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    fuel_used: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    load_cycles: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    idle_time: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    seatbelt_status: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    x_position: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    y_position: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    velocity: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    heading: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    engine_load: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    task_status: Mapped[str] = mapped_column(String(32), default="idle", nullable=False)


class SafetyEvent(Base):
    __tablename__ = "safety_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    machine_id: Mapped[int] = mapped_column(ForeignKey("machines.id"), index=True, nullable=False)
    operator_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), index=True, nullable=True)
    event_type: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    severity: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
    details_json: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)


class OperatorBaseline(Base):
    __tablename__ = "operator_baselines"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    operator_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    task_type: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    average_idle: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    average_fuel: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    average_duration: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    sample_size: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)


class Anomaly(Base):
    __tablename__ = "anomalies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    operator_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), index=True, nullable=True)
    machine_id: Mapped[int | None] = mapped_column(ForeignKey("machines.id"), index=True, nullable=True)
    telemetry_id: Mapped[int | None] = mapped_column(ForeignKey("machine_telemetry.id"), nullable=True)
    anomaly_type: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    severity: Mapped[str] = mapped_column(String(32), nullable=False)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    baseline_value: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    actual_value: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    explanation_json: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)


class Prediction(Base):
    __tablename__ = "predictions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id"), index=True, nullable=False)
    predicted_duration: Mapped[float] = mapped_column(Float, nullable=False)
    model_version: Mapped[str] = mapped_column(String(64), nullable=False)
    factors_json: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)


class SimulationRun(Base):
    __tablename__ = "simulation_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    task_id: Mapped[int | None] = mapped_column(ForeignKey("tasks.id"), index=True, nullable=True)
    operator_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), index=True, nullable=True)
    scenario_json: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    result_json: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)


class TrainingContent(Base):
    __tablename__ = "training_content"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    video_id: Mapped[str] = mapped_column(String(128), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    topic: Mapped[str] = mapped_column(String(128), index=True, nullable=False)
    source: Mapped[str] = mapped_column(String(64), nullable=False)
    relevance_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)


class TrainingHistory(Base):
    __tablename__ = "training_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    operator_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    training_content_id: Mapped[int] = mapped_column(ForeignKey("training_content.id"), index=True, nullable=False)
    completed_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
    before_metric: Mapped[float] = mapped_column(Float, nullable=False)
    after_metric: Mapped[float] = mapped_column(Float, nullable=False)
    metric_name: Mapped[str] = mapped_column(String(64), nullable=False)


class WeatherRecord(Base):
    __tablename__ = "weather_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id"), index=True, nullable=False)
    condition: Mapped[str] = mapped_column(String(64), nullable=False)
    temperature: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    precipitation: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    wind: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    actor_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), index=True, nullable=True)
    action: Mapped[str] = mapped_column(String(128), index=True, nullable=False)
    target_type: Mapped[str] = mapped_column(String(64), nullable=False)
    target_id: Mapped[str] = mapped_column(String(64), nullable=False)
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)


Index("ix_machine_telemetry_machine_timestamp", MachineTelemetry.machine_id, MachineTelemetry.timestamp)
Index("ix_safety_events_machine_severity", SafetyEvent.machine_id, SafetyEvent.severity)
Index("ix_predictions_task_created", Prediction.task_id, Prediction.created_at)
Index("ix_anomalies_operator_created", Anomaly.operator_id, Anomaly.created_at)
