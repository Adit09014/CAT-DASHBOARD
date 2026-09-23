# CAT Guardian

CAT Guardian is an industrial AI co-pilot for CAT construction machine operators. It combines safety gating, telemetry simulation, operator-specific baselines, anomaly detection, task-time prediction, a what-if mission simulator, and domain-guarded training recommendations into one demoable workflow.

## Stack

- Frontend: React, TypeScript, Vite, React Router, TanStack Query, Recharts
- Backend: FastAPI, Pydantic, SQLAlchemy, Alembic
- Database: PostgreSQL
- ML: pandas, numpy, scikit-learn, joblib
- Auth: JWT, bcrypt/passlib
- Testing: Vitest, React Testing Library, Pytest

## Repository Layout

- `frontend/` React application
- `backend/` FastAPI application, models, services, tests, seed command
- `ml/` training scripts and saved models
- `docs/` architecture, API, ML, demo, and security notes

## Environment Variables

Copy `.env.example` to `.env` and set values as needed.

- `DATABASE_URL`
- `JWT_SECRET`
- `ANTHROPIC_API_KEY`
- `YOUTUBE_API_KEY`
- `WEATHER_API_KEY`

## Local Setup

1. Start PostgreSQL with Docker: `docker compose up db -d`
2. Seed the database: `cd backend && python -m app.seed`
3. Run the backend: `cd backend && uvicorn app.main:app --reload --port 8000`
4. Run the frontend: `cd frontend && npm install && npm run dev`

## Demo Credentials

- Admin: `admin@catguardian.demo` / `Admin123!`
- Operator: `operator@catguardian.demo` / `Operator123!`

## Demo Flow

1. Log in as the operator.
2. Review the safety gate on the hero task.
3. Advance telemetry until the idle anomaly appears.
4. Open What-If and compare current vs simulated outcomes.
5. Run predictive safety to see the future proximity state.
6. Ask the copilot why the warning appeared or use push-to-talk voice input.
7. Search for operator training with the domain guard.
8. Complete a training item and review before/after metrics.
9. Reset the demo and replay the full story.

## Commands

- Backend tests: `cd backend && pytest`
- Frontend tests: `cd frontend && npm test`
- Frontend build: `cd frontend && npm run build`

## Notes

- External APIs have deterministic fallbacks so the demo remains stable.
- Machine control is never performed; all actions are digital workflow checks and simulations.
