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


class SafetySimulationRequest(BaseModel):
    task_id: int
    horizon_seconds: int = 30
    threshold_meters: float = 8.0


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
