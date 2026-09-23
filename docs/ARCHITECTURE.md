# Architecture

CAT Guardian is a modular monolith with a React frontend and a FastAPI backend.

## Core Flow

Detect -> Explain -> Predict -> Simulate -> Recommend -> Train -> Measure -> Improve

## Backend Boundaries

- `core`: configuration, security, and shared dependencies
- `models`: SQLAlchemy ORM entities
- `schemas`: API payloads and response models
- `services`: domain logic for safety, prediction, simulation, training, and copilot responses
- `main`: FastAPI app and routes

## Data Strategy

- PostgreSQL is the primary datastore.
- Seeded demo data drives the hackathon story.
- Deterministic fallback logic keeps the demo stable if external services fail.
