"""initial schema

Revision ID: 0001_initial
Revises: 
Create Date: 2026-09-23

"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=32), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_role", "users", ["role"], unique=False)

    op.create_table(
        "machines",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("machine_code", sa.String(length=64), nullable=False),
        sa.Column("machine_type", sa.String(length=64), nullable=False),
        sa.Column("age_years", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_machines_machine_code", "machines", ["machine_code"], unique=True)
    op.create_index("ix_machines_machine_type", "machines", ["machine_type"], unique=False)

    op.create_table(
        "tasks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("task_type", sa.String(length=64), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("weather_condition", sa.String(length=64), nullable=False),
        sa.Column("required_skill", sa.String(length=64), nullable=False),
        sa.Column("scheduled_at", sa.DateTime(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("estimated_duration", sa.Integer(), nullable=False),
        sa.Column("actual_duration", sa.Integer(), nullable=True),
    )
    op.create_index("ix_tasks_task_type", "tasks", ["task_type"], unique=False)

    op.create_table(
        "task_assignments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("task_id", sa.Integer(), sa.ForeignKey("tasks.id"), nullable=False),
        sa.Column("operator_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("machine_id", sa.Integer(), sa.ForeignKey("machines.id"), nullable=False),
        sa.Column("assigned_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("assignment_reason", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_task_assignments_task_id", "task_assignments", ["task_id"], unique=False)
    op.create_index("ix_task_assignments_operator_id", "task_assignments", ["operator_id"], unique=False)
    op.create_index("ix_task_assignments_machine_id", "task_assignments", ["machine_id"], unique=False)

    op.create_table(
        "machine_telemetry",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("machine_id", sa.Integer(), sa.ForeignKey("machines.id"), nullable=False),
        sa.Column("operator_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("timestamp", sa.DateTime(), nullable=False),
        sa.Column("engine_hours", sa.Float(), nullable=False),
        sa.Column("fuel_used", sa.Float(), nullable=False),
        sa.Column("load_cycles", sa.Integer(), nullable=False),
        sa.Column("idle_time", sa.Float(), nullable=False),
        sa.Column("seatbelt_status", sa.Boolean(), nullable=False),
        sa.Column("x_position", sa.Float(), nullable=False),
        sa.Column("y_position", sa.Float(), nullable=False),
        sa.Column("velocity", sa.Float(), nullable=False),
        sa.Column("heading", sa.Float(), nullable=False),
        sa.Column("engine_load", sa.Float(), nullable=False),
        sa.Column("task_status", sa.String(length=32), nullable=False),
    )
    op.create_index("ix_machine_telemetry_machine_timestamp", "machine_telemetry", ["machine_id", "timestamp"], unique=False)

    op.create_table(
        "safety_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("machine_id", sa.Integer(), sa.ForeignKey("machines.id"), nullable=False),
        sa.Column("operator_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("event_type", sa.String(length=64), nullable=False),
        sa.Column("severity", sa.String(length=32), nullable=False),
        sa.Column("timestamp", sa.DateTime(), nullable=False),
        sa.Column("details_json", sa.JSON(), nullable=False),
    )
    op.create_index("ix_safety_events_machine_severity", "safety_events", ["machine_id", "severity"], unique=False)

    op.create_table(
        "operator_baselines",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("operator_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("task_type", sa.String(length=64), nullable=False),
        sa.Column("average_idle", sa.Float(), nullable=False),
        sa.Column("average_fuel", sa.Float(), nullable=False),
        sa.Column("average_duration", sa.Float(), nullable=False),
        sa.Column("sample_size", sa.Integer(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_operator_baselines_operator_id", "operator_baselines", ["operator_id"], unique=False)
    op.create_index("ix_operator_baselines_task_type", "operator_baselines", ["task_type"], unique=False)

    op.create_table(
        "anomalies",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("operator_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("machine_id", sa.Integer(), sa.ForeignKey("machines.id"), nullable=True),
        sa.Column("telemetry_id", sa.Integer(), sa.ForeignKey("machine_telemetry.id"), nullable=True),
        sa.Column("anomaly_type", sa.String(length=64), nullable=False),
        sa.Column("severity", sa.String(length=32), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=True),
        sa.Column("baseline_value", sa.Float(), nullable=False),
        sa.Column("actual_value", sa.Float(), nullable=False),
        sa.Column("explanation_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_anomalies_operator_created", "anomalies", ["operator_id", "created_at"], unique=False)

    op.create_table(
        "predictions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("task_id", sa.Integer(), sa.ForeignKey("tasks.id"), nullable=False),
        sa.Column("predicted_duration", sa.Float(), nullable=False),
        sa.Column("model_version", sa.String(length=64), nullable=False),
        sa.Column("factors_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_predictions_task_created", "predictions", ["task_id", "created_at"], unique=False)

    op.create_table(
        "simulation_runs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("task_id", sa.Integer(), sa.ForeignKey("tasks.id"), nullable=True),
        sa.Column("operator_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("scenario_json", sa.JSON(), nullable=False),
        sa.Column("result_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "training_content",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("video_id", sa.String(length=128), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("topic", sa.String(length=128), nullable=False),
        sa.Column("source", sa.String(length=64), nullable=False),
        sa.Column("relevance_score", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "training_history",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("operator_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("training_content_id", sa.Integer(), sa.ForeignKey("training_content.id"), nullable=False),
        sa.Column("completed_at", sa.DateTime(), nullable=False),
        sa.Column("before_metric", sa.Float(), nullable=False),
        sa.Column("after_metric", sa.Float(), nullable=False),
        sa.Column("metric_name", sa.String(length=64), nullable=False),
    )

    op.create_table(
        "weather_records",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("task_id", sa.Integer(), sa.ForeignKey("tasks.id"), nullable=False),
        sa.Column("condition", sa.String(length=64), nullable=False),
        sa.Column("temperature", sa.Float(), nullable=False),
        sa.Column("precipitation", sa.Float(), nullable=False),
        sa.Column("wind", sa.Float(), nullable=False),
        sa.Column("timestamp", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("actor_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("action", sa.String(length=128), nullable=False),
        sa.Column("target_type", sa.String(length=64), nullable=False),
        sa.Column("target_id", sa.String(length=64), nullable=False),
        sa.Column("metadata_json", sa.JSON(), nullable=False),
        sa.Column("timestamp", sa.DateTime(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("weather_records")
    op.drop_table("training_history")
    op.drop_table("training_content")
    op.drop_table("simulation_runs")
    op.drop_index("ix_predictions_task_created", table_name="predictions")
    op.drop_table("predictions")
    op.drop_index("ix_anomalies_operator_created", table_name="anomalies")
    op.drop_table("anomalies")
    op.drop_index("ix_operator_baselines_task_type", table_name="operator_baselines")
    op.drop_index("ix_operator_baselines_operator_id", table_name="operator_baselines")
    op.drop_table("operator_baselines")
    op.drop_index("ix_safety_events_machine_severity", table_name="safety_events")
    op.drop_table("safety_events")
    op.drop_index("ix_machine_telemetry_machine_timestamp", table_name="machine_telemetry")
    op.drop_table("machine_telemetry")
    op.drop_index("ix_task_assignments_machine_id", table_name="task_assignments")
    op.drop_index("ix_task_assignments_operator_id", table_name="task_assignments")
    op.drop_index("ix_task_assignments_task_id", table_name="task_assignments")
    op.drop_table("task_assignments")
    op.drop_index("ix_tasks_task_type", table_name="tasks")
    op.drop_table("tasks")
    op.drop_index("ix_machines_machine_type", table_name="machines")
    op.drop_index("ix_machines_machine_code", table_name="machines")
    op.drop_table("machines")
    op.drop_index("ix_users_role", table_name="users")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
