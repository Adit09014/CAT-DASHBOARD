from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    user: dict[str, Any]


class SafetyCheckRequest(BaseModel):
    task_id: int


class SafetyCheckResponse(BaseModel):
    allowed: bool
    warnings: list[str] = Field(default_factory=list)
    blocking_reasons: list[str] = Field(default_factory=list)


class RadarTarget(BaseModel):
    id: str
    name: str
    target_type: str
    distance_meters: float
    bearing_degrees: float
    relative_speed_mps: float
    heading_degrees: float
    ttc_seconds: float | None = None
    closest_approach_meters: float
    risk_level: str
    zone: str
    trajectory: list[dict[str, Any]] = Field(default_factory=list)


class SafetySimulationRequest(BaseModel):
    task_id: int
    horizon_seconds: int = 30
    threshold_meters: float = 8.0
    scenario: str | None = "auto"
    operator_id: int | None = None


class TrajectoryPoint(BaseModel):
    second: int
    machine: dict[str, Any]
    object: dict[str, Any]
    distance_meters: float


class SafetySimulationResponse(BaseModel):
    state: str
    advisory: str
    seconds_to_conflict: int | None
    minimum_distance_meters: float
    trajectory: list[TrajectoryPoint] = Field(default_factory=list)
    radar_targets: list[RadarTarget] = Field(default_factory=list)
    active_scenario: str = "auto"
    site_zone: str = "Active Sector"
    machine_code: str = "EXC-001"
    operator_name: str = "Avery Stone"
    label: str


class PredictionRequest(BaseModel):
    task_id: int
    idle_reduction: float | None = None
    weather: str | None = None
    machine_age_years: int | None = None
    operator_skill: str | None = None
    task_difficulty: str | None = None


class PredictionResponse(BaseModel):
    predicted_duration: float
    model_version: str
    factors: list[dict[str, Any]]
    label: str


class WhatIfRequest(BaseModel):
    task_id: int
    idle_reduction: float = 0.0
    weather: str = "Current"
    machine_id: int | None = None
    operator_skill: str = "Current"
    task_difficulty: str = "Current"


class WhatIfResponse(BaseModel):
    current: dict[str, Any]
    simulated: dict[str, Any]
    deltas: dict[str, Any]
    label: str
    saved_run_id: int


class CopilotRequest(BaseModel):
    question: str
    api_key: str | None = None
    provider: str | None = None


class CopilotResponse(BaseModel):
    answer: str
    source: str
    context_used: dict[str, Any]


class TrainingSearchRequest(BaseModel):
    query: str
    operator_id: int | None = None
    machine_type: str | None = None


class TrainingItem(BaseModel):
    video_id: str
    title: str
    description: str
    source: str
    relevance_score: float
    category: str | None = None
    thumbnail_url: str | None = None


class TrainingSearchResponse(BaseModel):
    allowed: bool
    reason: str
    query: str
    category: str | None = None
    ai_expanded_query: str | None = None
    suggested_queries: list[str] = Field(default_factory=list)
    results: list[TrainingItem] = Field(default_factory=list)


class TrainingCompleteRequest(BaseModel):
    operator_id: int
    before_metric: float
    after_metric: float
    metric_name: str = "idle_time"
    training_content_id: int


class TrainingCompleteResponse(BaseModel):
    completed_at: datetime
    observed_change_percent: float
    message: str


class DemoScenarioResponse(BaseModel):
    scenario: str
    status: str
    details: dict[str, Any]


class AnomalySimulateRequest(BaseModel):
    scenario: str = "normal"


class AnomalySimulateResponse(BaseModel):
    status: str
    scenario: str
    evaluation: dict[str, Any]
    telemetry: dict[str, Any]


class AnomalyPredictRequest(BaseModel):
    machine_tilt_deg: float = 1.8
    ground_slope_deg: float = 2.5
    min_obstacle_distance_m: float = 25.0
    proximity_hazard: bool = False
    seatbelt_status: bool = True
    harsh_braking_events: int = 0
    harsh_acceleration_events: int = 0
    continuous_driving_min: float = 35.0
    operator_shift_hours: float = 2.5
    operator_experience_months: int = 48
    machine_speed_kmph: float = 12.0
    load_weight_tons: float = 10.0
    max_load_capacity_tons: float = 25.0
    load_utilization_pct: float = 40.0
    idling_time_min: float = 18.0
    engine_hours: float = 1200.0
    fuel_used_l: float = 14.5
    load_cycles: int = 10
    weather_condition: str = "Clear"
    visibility_m: float = 180.0
    shift_type: str = "Morning"


class AnomalyPredictResponse(BaseModel):
    safety_alert_prob: float
    decision_threshold: float
    safety_alert_triggered: bool
    threat_level: str
    risk_factors: list[dict[str, Any]] = Field(default_factory=list)
    model_version: str
    top_risk_contributors: list[dict[str, Any]] = Field(default_factory=list)


class AnomalyAlertItem(BaseModel):
    id: int
    operator_id: int | None = None
    machine_id: int | None = None
    anomaly_type: str
    severity: str
    confidence: float | None = None
    actual_value: float
    threat_level: str
    acknowledged: bool
    explanation: dict[str, Any]
    created_at: str


class DatasetStatsResponse(BaseModel):
    total_samples: int
    alert_triggered_count: int
    alert_triggered_rate: float
    avg_obstacle_distance: float
    avg_tilt_deg: float
    avg_slope_deg: float
    weather_distribution: dict[str, int]
    shift_distribution: dict[str, int]
    top_predictive_features: list[dict[str, Any]]


class DashboardResponse(BaseModel):
    operator: dict[str, Any]
    current_machine: dict[str, Any]
    current_task: dict[str, Any]
    safety_status: dict[str, Any]
    machine_health: dict[str, Any]
    task_prediction: dict[str, Any]
    current_telemetry: dict[str, Any]
    ai_insight: dict[str, Any]
    training_recommendation: dict[str, Any]
    what_if: dict[str, Any]
    weather: dict[str, Any]
    anomaly_status: dict[str, Any] | None = None
