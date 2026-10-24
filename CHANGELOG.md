# Changelog

All notable changes to the CivicPulse Hub project will be documented in this file.

## [1.0.0] - 2026-10-23
### Added
- **Database (M3)**: Full relational schema in `database/schema.sql` (InnoDB, utf8mb4, 9 tables, foreign keys, indexes). Seed data in `database/seed-dev.sql`, test schema and fixtures.
- **Backend (M2)**: Node.js + Express REST API with JWT authentication, OTP rate limiting, Multer upload security (5MB limit, JPEG/PNG/WebP), complaint workflow engine, transaction support, and XLSX report export.
- **Python Service (M4)**: FastAPI analytics microservice in `python-service/` for trend velocity, reopening metrics, and workload forecasting.
- **Frontend (M1)**: React 19 + Vite responsive dashboard with role-based Citizen, Officer, and Admin interfaces, interactive GIS map with bounding-box pins, feedback rating modal with automated reopening, and Excel export.
- **Documentation**: Complete specifications in `docs/` (`PROJECT_SPEC.md`, `API_SPEC.md`, `DATABASE_SPEC.md`, `PYTHON_API_SPEC.md`, `TEST_PLAN.md`).
