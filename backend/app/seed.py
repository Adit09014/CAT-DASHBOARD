from __future__ import annotations

from .db import Base, engine, SessionLocal
from .services import seed_demo_data


def main() -> None:
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_demo_data(db)
    print("Seed complete: demo users, machines, tasks, telemetry, safety events, and training data are ready.")


if __name__ == "__main__":
    main()
