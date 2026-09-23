# ML

Cat Guardian uses deterministic application logic first and trained models when available.

## Models

- Task duration regression with RandomForestRegressor
- Anomaly classification with RandomForestClassifier when enough labeled data exists

## Fallback Policy

- If model artifacts are missing, the backend uses transparent rule-based estimates.
- Model outputs are labeled with version metadata and never presented as guaranteed outcomes.
