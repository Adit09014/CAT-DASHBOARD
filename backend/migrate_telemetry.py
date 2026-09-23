import sqlite3
from pathlib import Path

db_path = Path(__file__).resolve().parent / "catguardian.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("PRAGMA table_info(machine_telemetry)")
existing_cols = {row[1] for row in cursor.fetchall()}
print("Existing cols:", len(existing_cols))

new_cols = [
    ("load_weight_tons", "REAL DEFAULT 10.0"),
    ("max_load_capacity_tons", "REAL DEFAULT 25.0"),
    ("load_utilization_pct", "REAL DEFAULT 40.0"),
    ("operator_shift_hours", "REAL DEFAULT 2.5"),
    ("continuous_driving_min", "REAL DEFAULT 35.0"),
    ("machine_speed_kmph", "REAL DEFAULT 12.0"),
    ("harsh_braking_events", "INTEGER DEFAULT 0"),
    ("harsh_acceleration_events", "INTEGER DEFAULT 0"),
    ("ground_slope_deg", "REAL DEFAULT 2.5"),
    ("machine_tilt_deg", "REAL DEFAULT 1.8"),
    ("weather_condition", "TEXT DEFAULT 'Clear'"),
    ("visibility_m", "REAL DEFAULT 180.0"),
    ("proximity_hazard", "INTEGER DEFAULT 0"),
    ("min_obstacle_distance_m", "REAL DEFAULT 25.0"),
    ("safety_alert_prob", "REAL DEFAULT 0.01"),
    ("safety_alert_triggered", "INTEGER DEFAULT 0"),
    ("risk_factors_json", "TEXT DEFAULT '{}'"),
]

for col_name, col_def in new_cols:
    if col_name not in existing_cols:
        print(f"Adding column: {col_name}")
        cursor.execute(f"ALTER TABLE machine_telemetry ADD COLUMN {col_name} {col_def}")

conn.commit()
cursor.execute("PRAGMA table_info(machine_telemetry)")
cols_after = [row[1] for row in cursor.fetchall()]
print("Updated total columns:", len(cols_after))
conn.close()
