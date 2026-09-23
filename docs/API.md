# API

The backend exposes JSON REST endpoints for authentication, dashboards, safety checks, telemetry simulation, prediction, what-if simulation, copilot responses, training, weather, and admin assignment.

Key routes include:

- `POST /auth/login`
- `GET /operator/dashboard`
- `POST /tasks/{id}/safety-check`
- `POST /tasks/{id}/start`
- `POST /telemetry/next-tick`
- `POST /predict/task-time`
- `POST /simulate/what-if`
- `POST /copilot/ask`
- `POST /training/search`
- `POST /training/{id}/complete`
