# Caterpillar Guardian: Heavy Equipment Operator AI Co-Pilot & Safety Intelligence Platform

---

## 📌 Executive Summary

**Caterpillar Guardian (CAT Guardian)** is an industrial-grade, AI-powered in-cab co-pilot and fleet telemetry intelligence system designed for heavy construction and mining equipment (excavators, wheel loaders, articulated haulers, bulldozers).

The platform bridges real-time physical sensor telemetry, state-of-the-art predictive machine learning models, explainable artificial intelligence (XAI), and natural language generation (NLG) into an intuitive, high-visibility, glassmorphic operator interface. By analyzing 27 telemetry signals simultaneously, CAT Guardian prevents catastrophic machinery rollover accidents, predicts blind-spot collisions, enforces fatigue mitigation standards, forecasts task completion times with dynamic terrain adjustments, and synthesizes localized voice briefings in 7 languages directly in the machine cab.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph Heavy Equipment & Edge Telemetry
        CAN[CAN-Bus / J1939 Telemetry Stream] --> SENSORS[27 Sensor Channels: Tilt, Pitch, Radar, Hydraulic, Engine]
        SENSORS --> TEL_DISPATCH[Edge Telemetry Ingestion Worker]
    end

    subgraph Backend Infrastructure (FastAPI + SQLAlchemy)
        TEL_DISPATCH --> FASTAPI[FastAPI Core Server :8000]
        FASTAPI --> AUTH[JWT Auth & RBAC Security Layer]
        FASTAPI --> ORM[SQLAlchemy ORM + SQLite / PostgreSQL]
        FASTAPI --> METEO[Open-Meteo Live Geolocation Weather Sync]
        
        subgraph Machine Learning & Inference Engines
            FASTAPI --> ML_REG[CatBoost / RandomForest Task Duration Model]
            FASTAPI --> ML_CLF[LogisticRegression / RF Anomaly Detection Model]
            FASTAPI --> XAI_ENG[XAI Feature Attribution & Narrative Generator]
            FASTAPI --> COPILOT_CORE[Domain-Guarded AI Copilot Engine]
        end
    end

    subgraph Client Application (React 19 + TypeScript + Vite)
        FASTAPI <--> API_CLIENT[Axios REST Client + TanStack Query]
        API_CLIENT --> STORE[I18n Context (7 Languages) + Auth State]
        
        STORE --> COCKPIT[Operator Cockpit Dashboard]
        STORE --> FORECASTER[Time Forecaster & Delay Analytics]
        STORE --> SENTINEL[Safety Sentinel & Live Diagnostics]
        STORE --> MULTI_CHART[Multi-Stream Telemetry Analytics Engine]
        STORE --> NARRATIVE_MODAL[Explainable Narrative XAI Modal + TTS]
        STORE --> COPILOT_UI[In-Cab AI Copilot Panel]
        STORE --> ADMIN_VIEW[Admin Fleet Oversight Dashboard]
    end
```

---

## 💻 Comprehensive Tech Stack

### 1. Frontend Technologies
- **Core Framework**: React 19 (`react`, `react-dom`) with TypeScript.
- **Build Tool & Bundler**: Vite 6 with Hot Module Replacement (HMR).
- **Routing**: React Router DOM v7.
- **Server State & Data Fetching**: TanStack React Query v5 (`@tanstack/react-query`) with automatic polling, background refetching, and optimistic updates.
- **Data Visualization & Charting**: Recharts v2 (Responsive Container, AreaChart, LineChart, ComposedChart, BarChart, XAxis, YAxis, Tooltip, CartesianGrid).
- **UI Icons**: Lucide React (`lucide-react`) with 60+ contextual industrial icons.
- **Audio & Speech Synthesis**: Native HTML5 Web Speech API (`window.speechSynthesis`, `SpeechSynthesisUtterance`) for offline in-cab voice briefings.
- **Theme Architecture (Dark & Light Mode)**: Dual-palette CSS custom properties design system with `ThemeProvider` (`theme.tsx`), persistent storage in `localStorage`, and animated Sun/Moon toggle (`ThemeToggle.tsx`).
- **Styling Architecture**: Curated Vanilla CSS Design System with CSS Custom Properties, glassmorphism, responsive grid layouts, and custom high-contrast industrial CAT color tokens (`#f5a623` / `#d97706` Caterpillar Yellow, `#08090d` Obsidian Black, `#f1f5f9` Site Light Slate).
- **Internationalization (i18n)**: Custom zero-dependency translation engine supporting 7 languages with parameter interpolation, localized number formatting, and fallback mechanisms.

### 2. Backend Technologies
- **API Framework**: FastAPI (Python 3.11+) with ASGI asynchronous event loop.
- **ASGI Server**: Uvicorn with auto-reload and multiprocessing capabilities.
- **Data Modeling & Validation**: Pydantic v2 schemas with strict typing, default factories, and JSON schema generation.
- **Database & ORM**: SQLAlchemy 2.0 (synchronous and async sessions), supporting SQLite for zero-configuration local deployment and PostgreSQL for enterprise production.
- **Database Migrations**: Alembic for version-controlled relational schema migrations.
- **Security & Authentication**:
  - OAuth2 Bearer token flow with password hashing (`passlib` + `bcrypt`).
  - PyJWT (`python-jose` / `jwt`) for stateless cryptographic token issuance and verification.
- **HTTP Client**: HTTPX for resilient external API integration with timeouts and automatic fallback.

### 3. Machine Learning & Data Science Stack
- **Numerical Computing**: NumPy & Pandas for high-performance matrix and vector manipulation.
- **Machine Learning Algorithms**:
  - `scikit-learn` (LogisticRegression, RandomForestRegressor, RandomForestClassifier, StandardScaler, LabelEncoder, Pipeline).
  - `catboost` for gradient boosted decision tree task duration forecasting.
  - `joblib` for high-speed serialized model serialization and deserialization.
- **Explainable AI (XAI)**:
  - Custom SHAP-inspired Feature Attribution Engine calculating local contribution weights.
  - Multi-variable Causal Progression Chain Synthesizer.

### 4. External Integrations
- **Open-Meteo Weather API**: Real-time atmospheric forecasting (temperature, humidity, precipitation probability, wind velocity, WMO weather codes) with in-memory caching.
- **YouTube Data API v3**: Contextual safety and training video discovery tailored to detected operator anomalies.

---

## 🌟 Detailed Feature Breakdown

### 1. In-Cab Operator Cockpit (`OperatorDashboardPage.tsx`)
- **Hero Mission Status Bar**: Displays machine serial (`EXC-001`, `LOD-002`, `TRK-003`), assigned task type, operating mode, shift duration clock, and real-time connection status.
- **Pre-Shift Safety Gate**: Mandatory physical pre-start checklist (Fluid Levels, Track Tension, Hydraulic Lines, Visual Walkaround, Seatbelt & Horn) enforcing complete sign-off before implement activation.
- **Cockpit Safety Sentinel Banner**: Live visual threat level bar (`NORMAL`, `ELEVATED`, `WARNING`, `CRITICAL`) with one-click **"Explain Narrative"** trigger.
- **Predictive Metric Jump-Cards**: Immediate access to Time Forecaster (ETA & Delay Index), Safety Sentinel, Telemetry Center, and Training Hub.

### 2. Time Forecaster & ETA Intelligence (`TimeEstimationPanel.tsx`)
- **Dual-Model Inference**:
  - **Random Forest / CatBoost Regressor**: Trained on 8,000+ heavy machinery task cycles.
  - Baseline comparison engine comparing real-time forecast against global operator fleet averages.
- **Sensitivity & Delay Analysis**:
  - Visual breakdown of delay drivers: Operator Idle Baseline, Weather Precipitation Factor, Ground Slope Grade, and Machine Age Factor.
  - Real-time confidence interval and predicted fuel burn index.
- **Multi-Factor What-If Delay Simulator**:
  - Interactive sliders for Idle Time Reduction (0–50%), Weather Scenario overrides (Clear, Rain, Mud, Heatwave), and Payload adjustments.
  - Visual delta comparisons showing exact minutes saved and liters of diesel conserved.

### 3. Safety Sentinel & Hazard Inference (`AnomalySentinelPanel.tsx`)
- **27-Channel Telemetry Surveillance**: Evaluates real-time values including:
  - `machine_tilt_deg` & `ground_slope_deg` (Rollover detection).
  - `min_obstacle_distance_m` & `proximity_hazard` (Pedestrian and obstacle collision).
  - `continuous_driving_min` & `operator_shift_hours` (Fatigue and cognitive degradation).
  - `harsh_braking_events` & `harsh_acceleration_events` (Mechanical shock and erratic operation).
  - `seatbelt_status` (OSHA safety harness compliance).
- **Decision Threshold Optimization**: Calibrated decision threshold $\tau = 0.655$ balancing false-positive suppression with early collision alerting.
- **Interactive ML Simulator**:
  - Preconfigured hazard scenario presets: **Normal Operation**, **Chassis Rollover Risk**, **Blind-Spot Proximity Breach**, **Operator Fatigue**, and **Wet Slope Traction Loss**.
  - Custom parameter sliders with instant re-inference and visual threat level updates.
- **Historical & Active Alerts Feed**:
  - Tabular view of all system-flagged anomalies with machine code, severity chip, confidence percentage, timestamp, and verification status.
  - One-click incident acknowledgment and direct **"Explain"** narrative inspection.

### 4. Explainable Narrative Alerts (XAI & NLG) (`ExplainableNarrativeAlertModal.tsx`)
- **Dual-Engine Synthesis**:
  - Deterministic high-speed edge synthesis (<5ms execution, zero cloud dependency) ensuring guaranteed uptime in subterranean or remote quarry zones.
- **Executive Plain-Language Summary**: Translates complex multi-sensor readings into a clear narrative (e.g., *"Machine EXC-001 encountered critical roll tilt of 7.4° on a 6.8° uncompacted grade with operator harness unfastened"*).
- **Causal Reasoning Progression Chain**: Step-by-step causal flow diagrams demonstrating how initial conditions escalated into hazards:
  $$\text{Steep Incline } (7.4^\circ) \longrightarrow \text{Track Slip } (-42\%) \longrightarrow \text{Dynamic Roll } (7.8^\circ) \longrightarrow \text{Rollover Alarm}$$
- **XAI Feature Attribution Cards**:
  - Visual attribution badges displaying contribution weight ($+1.08$, $+0.95$, etc.).
  - Direct comparison of **Observed Sensor Value** vs. **Nominal Safe Baseline**.
  - Dynamic responsive auto-layout (single features expand full-width; multi-features form a balanced grid).
- **In-Cab Emergency Standard Operating Procedure (SOP) Checklist**:
  - Prioritized action steps categorized by urgency (`IMMEDIATE`, `MANDATORY`, `HIGH`, `STANDARD`).
  - Interactive checkboxes with real-time counter (`3 / 4 Completed`) that unlocks a green **"Verified & Acknowledged"** status once finished.
  - Threat-level adaptive styling (Critical alerts render in crimson/rose; Warning/Elevated alerts render in high-contrast amber).
- **In-Cab Voice Audio Briefing (Text-to-Speech)**:
  - Concise, punchy spoken alert designed for noisy equipment environments.
  - Equalizer animation and one-click play/stop toggle using HTML5 SpeechSynthesis.
- **Direct Copilot Bridge**: One-click **"Ask Copilot About This Alert"** button that pre-populates the query with full context and routes directly to the in-cab Copilot assistant.

### 5. Multi-Stream Telemetry Analytics Engine (`TelemetryChart.tsx`)
- **4 Dedicated Telemetry Domain Tabs**:
  1. **Primary Core**: Ground Speed (km/h), Engine RPM, Fuel Consumption Rate (L/h).
  2. **Engine & Hydraulics**: Coolant Temperature (°C), Hydraulic System Pressure (bar), Fuel Level (%).
  3. **Terrain & Dynamic Stability**: Ground Slope (°), Dynamic Chassis Tilt (°), Radar Clearance (m).
  4. **Operator Ergonomics & Motion**: Continuous Driving Window (min), Whole-Body Vibration RMS, Harsh Deceleration/Acceleration counts.
- **Comparative Multi-Parameter Overlay**: Dual-axis graph correlating hydraulic pressure surges against machine ground speed to isolate operator lugging or implement stalling.
- **Telemetry Stream Scrubbing**: Slider to rewind and inspect historical machine state leading up to any specific safety incident.

### 6. In-Cab Domain-Guarded AI Copilot (`CopilotPanel.tsx`)
- **Industrial RAG Prompt Architecture**: Grounded in Caterpillar Operation & Maintenance Manuals (OMM), ISO 3471 (ROPS), and OSHA 1926 regulations.
- **Strict Out-of-Domain Guardrails**: Rejects non-operational queries (e.g. general trivia, coding, finance) and enforces strict adherence to safe machinery protocols.
- **Push-to-Talk Voice Input Simulation**: Allows operators to speak instructions or query warnings hands-free while operating joysticks.
- **Context-Aware Safety Cards**: Automatically injects current telemetry, active DTC diagnostic trouble codes, and weather into prompt generation.

### 7. Global Multilingual System (`i18n.tsx`, `LanguageSelector.tsx`)
- **7 Fully Supported Languages**:
  - 🇺🇸 English (`en`)
  - 🇪🇸 Spanish (`es`)
  - 🇫🇷 French (`fr`)
  - 🇩🇪 German (`de`)
  - 🇮🇳 Hindi (`hi`)
  - 🇨🇳 Mandarin Chinese (`zh`)
  - 🇧🇷 Portuguese (`pt`)
- **Comprehensive Localization**: Covers 100% of application strings: sidebar navigation, metric badges, telemetry charts, weather forecasts, XAI alert narratives, SOP checklist action items, and Text-to-Speech audio briefings.

### 8. Live Weather & Environmental Intelligence (`FullDayWeatherCard.tsx`)
- **Live Open-Meteo Integration**: Automated GPS coordination sync with Vellore, Tamil Nadu (or configured quarry location).
- **24-Hour Hourly Trajectory**: Visual hourly temperature curves, precipitation probabilities (%), and wind speeds (km/h).
- **Safety Hazard Weather Index**: Automatic hazard alerts for heavy rain, wet mud conditions, and reduced visibility affecting braking and slope stability.
- **Deterministic Offline Fallback**: Guarantees zero UI breakage when operating off-grid without internet connectivity.

### 9. Domain Guard Training & Upskilling (`DomainGuardTraining.tsx`)
- **Targeted Micro-Learning**: Recommends training modules based on active operator telemetry anomalies (e.g., Idle Time Optimization, Anti-Rollover Incline Handling, Blind-Spot Awareness).
- **Curated Media Playback**: Embedded educational YouTube tutorials and CAT technical briefs.
- **Empirical Before/After Metrics**: Quantifies operator performance improvement (e.g., *Idle time reduced from 34% to 24% after completing training module*).

### 10. Admin Fleet Oversight & Governance (`AdminDashboardPage.tsx`)
- **Fleet Telematics Overview**: High-level status of all machines in the sector (Operating, Idle, Maintenance, Tripped).
- **Operator Baseline Management**: Fleet-wide benchmarking of fuel efficiency, average duration, and safety incidents.
- **Audit Logging Ledger**: Comprehensive compliance tracking recording every alarm trigger, acknowledgment, training completion, and parameter override.
- **Demo State Reset**: Instant one-click database re-seeding tool for executive demonstrations and training walkthroughs.

### 11. Adaptive Dark & Light Industrial Theme System (`theme.tsx`, `ThemeToggle.tsx`, `styles.css`)
- **Dual-Palette Ergonomics**:
  - **Dark Obsidian Mode**: Designed for low-glare nighttime cab operations, subterranean excavation, and high-contrast alert visualization (`#08090d` base, `#0d1117` surface, `#f5a623` CAT yellow highlights).
  - **Light Site Mode**: Engineered for direct sunlight and open-quarry daylight conditions (`#f1f5f9` slate base, `#ffffff` crisp white cards, high-contrast `#d97706` amber accents, and `#0f172a` deep slate typography).
- **Zero-Flicker Persistence**: State managed via React Context (`ThemeProvider`), stored in browser `localStorage`, and instantly synced with HTML `data-theme` attribute.
- **Full-Spectrum Theme Synchronization**: Covers 100% of application components, including Recharts SVG Cartesian grids, custom tooltips, metric cards, modal dialogs, and interactive tables.
- **One-Click Switcher**: Accessible animated Sun/Moon toggle (`ThemeToggle.tsx`) integrated across Operator Topbar, Admin Command Navbar, and the Pre-Login Splash Screen.

---

## 🗄️ Relational Database Schema & Data Models

| Model Name | Table Name | Purpose | Key Attributes |
|---|---|---|---|
| `User` | `users` | Identity & RBAC | `id`, `email`, `password_hash`, `role` (`OPERATOR` / `ADMIN`), `full_name` |
| `Machine` | `machines` | Fleet Assets | `id`, `machine_code` (`EXC-001`), `model`, `machine_type`, `status` |
| `TaskAssignment` | `task_assignments` | Mission Scheduling | `id`, `operator_id`, `machine_id`, `task_type`, `status`, `target_duration` |
| `OperatorBaseline` | `operator_baselines`| Personal Benchmarks | `id`, `operator_id`, `task_type`, `average_idle`, `average_fuel`, `average_duration` |
| `MachineTelemetry` | `machine_telemetry` | Physical Sensor Logs | `id`, `machine_id`, `timestamp`, `speed`, `engine_rpm`, `hydraulic_pressure`, `tilt`, `slope`, `obstacle_dist`, `vibration` |
| `Anomaly` | `anomalies` | Incident Ledger | `id`, `machine_id`, `operator_id`, `anomaly_type`, `severity`, `confidence`, `threat_level`, `acknowledged`, `explanation_json` |
| `Prediction` | `predictions` | ML ETA Records | `id`, `task_id`, `predicted_duration`, `model_version`, `factors_json` |
| `SimulationRun` | `simulation_runs` | What-If Snapshots | `id`, `operator_id`, `task_id`, `scenario_json`, `result_json` |
| `TrainingContent` | `training_contents` | Educational Library | `id`, `title`, `duration_minutes`, `video_id`, `topic`, `source` |
| `TrainingHistory` | `training_histories` | Skill Improvements | `id`, `operator_id`, `training_content_id`, `before_metric`, `after_metric`, `completed_at` |
| `WeatherRecord` | `weather_records` | Environmental Logs | `id`, `task_id`, `condition`, `temperature`, `precipitation`, `wind` |
| `AuditLog` | `audit_logs` | Compliance Trail | `id`, `actor_id`, `action`, `target_type`, `metadata_json`, `created_at` |

---

## 🔌 API Endpoint Specifications

### Authentication & Users
- `POST /auth/login` — Authenticates credentials and returns JWT bearer token.
- `GET /auth/me` — Retrieves current user profile and role.

### Cockpit & Telemetry
- `GET /cockpit/overview` — Aggregated real-time summary for active operator (active task, safety gate status, latest telemetry, safety alert).
- `GET /telemetry/latest` — Retrieves current real-time 27-signal telemetry frame.
- `GET /telemetry/history` — Historical telemetry time-series for chart scrubbing.

### Safety Sentinel & Anomalies
- `GET /anomaly/live` — Real-time inference evaluation across active machine telemetry.
- `POST /anomaly/predict` — On-demand ML inference for simulated parameter inputs.
- `GET /anomaly/alerts` — Retrieves paginated safety anomaly log with localized headlines (`lang` query parameter).
- `POST /anomaly/alerts/{id}/acknowledge` — Operator sign-off and verification of safety incident.
- `GET /anomaly/alerts/{id}/narrative` — Generates localized explainable narrative for historical incident.
- `POST /anomaly/narrative/generate` — Dynamic real-time narrative synthesis for simulated telemetry states.

### Time Forecaster & Simulation
- `GET /tasks/active` — Active task details and baseline duration targets.
- `POST /tasks/{id}/predict-duration` — Runs CatBoost/RF model to forecast remaining job time.
- `POST /simulation/what-if` — Executes what-if scenario calculating fuel and time deltas.

### AI Copilot & Knowledge Training
- `POST /copilot/query` — RAG-guarded heavy machinery operational guidance.
- `GET /training/recommendations` — Anomaly-driven training modules.
- `POST /training/{id}/complete` — Logs module completion and computes operator metric improvements.

### Weather & Administration
- `GET /weather/live` — Synchronizes live Open-Meteo 24h environmental conditions for worksite.
- `GET /admin/dashboard` — Fleet overview, operator compliance rates, and system metrics.
- `POST /admin/reset-demo` — Reinitializes test dataset and baseline parameters.

---

## 🤖 Machine Learning Model Architectures

### 1. Task Duration Forecaster (`ml/training/train_duration.py`)
- **Target Variable**: Continuous task duration (minutes).
- **Features Used**: Machine model code, task type, operator experience level, weather condition, ground slope grade, soil compaction index, hydraulic duty cycle, and historical idle percentage.
- **Model Algorithms**: CatBoostRegressor & RandomForestRegressor with 5-fold cross-validation.
- **Artifacts**: Serialized model saved at `ml/models/task_duration_rf.joblib` with metadata at `ml/models/task_duration_metadata.json`.

### 2. Anomaly Sentinel & Threat Classifier (`ml/training/train_anomaly.py`)
- **Target Variable**: Multi-class anomaly classification (`NORMAL`, `ELEVATED`, `WARNING`, `CRITICAL`) and binary hazard flag.
- **Features Used**: 27 telemetry signals with particular emphasis on dynamic roll tilt, terrain slope, proximity sensor distance, continuous travel minutes, and harsh deceleration pulses.
- **Model Pipeline**: StandardScaler $\rightarrow$ LogisticRegression / RandomForestClassifier with calibrated probability thresholds ($\tau = 0.655$).
- **Artifacts**: Serialized model saved at `ml/models/anomaly_detector_rf.joblib` with metadata at `ml/models/anomaly_metadata.json`.

---

## 🔒 Security, Safety Protocols & Compliance

1. **Non-Invasive Safety Architecture**:
   - The platform strictly acts as a supervisory advisory and decision-support system. It **never** executes remote machine drive, steering, or hydraulic actuation controls, maintaining compliance with ISO 13849 machinery safety standards.
2. **Cryptographic Protection**:
   - Industry-standard bcrypt password hashing (12 work factor rounds).
   - HMAC-SHA256 signed JWT tokens with expiration handling.
3. **Role-Based Access Control (RBAC)**:
   - `OPERATOR`: Limited to assigned machine telemetry, cockpit actions, safety gates, training modules, and copilot queries.
   - `ADMIN`: Full visibility across all fleet assets, operator baselines, audit trails, and demo orchestration tools.

---

## 🚀 Installation & Local Development Guide

### Prerequisites
- **Python**: 3.11 or higher
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **Package Manager**: npm or yarn

### 1. Repository Setup
```bash
git clone <repository-url>
cd CAT-DASHBOARD
```

### 2. Backend Initialization
```bash
# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r backend/requirements.txt  # Or pip install fastapi uvicorn sqlalchemy pydantic httpx python-jose passlib bcrypt joblib scikit-learn pandas numpy

# Seed database with baseline machines, operators, and tasks
python -m backend.app.seed

# Start FastAPI backend server
python -m uvicorn backend.app.main:app --reload --port 8000
```
Backend API will be accessible at: `http://localhost:8000`  
Interactive Swagger Docs at: `http://localhost:8000/docs`

### 3. Frontend Initialization
```bash
# Navigate to frontend folder
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
Frontend Web Application will be live at: `http://localhost:5173`

### 4. Standard Demo Credentials
- **Operator Account**: `operator@catguardian.demo` | Password: `Operator123!`
- **Administrator Account**: `admin@catguardian.demo` | Password: `Admin123!`

---

## 📜 Compliance & Documentation Integrity

All components, algorithms, and interfaces in this repository are engineered to reflect authentic heavy equipment operating principles, adhering to Caterpillar machine design paradigms, high-contrast industrial ergonomics, and international safety guidelines.
