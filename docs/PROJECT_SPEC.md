# CivicPulse Hub — Full Project Specification (v1.0)

## 1. System Mission & Core Goals
CivicPulse Hub is an open, role-based grievance management and feedback redressal portal built for college project demonstration and institutional transparency.

### Core Roles & Permissions
1. **CITIZEN**:
   - Register account and verify via one-time email OTP.
   - Lodge complaints with title, description, category/sub-category, location, coordinates, and optional before-image.
   - View history and status of own complaints.
   - Submit 1–5 star rating and feedback upon resolution.
   - **Automated Reopening**: A citizen rating of 1 or 2 automatically resets the complaint status to `PENDING` for administrative review, while preserving all prior resolution notes, evidence, and audit logs.
2. **OFFICER**:
   - Access designated department workload dashboard.
   - Set officer priority (LOW, MEDIUM, HIGH) within permitted bounds.
   - Resolve assigned grievances with compulsory resolution notes and after-photo proof.
3. **ADMINISTRATOR**:
   - Triage all municipal grievances.
   - Assign qualified officers based on department.
   - Set complaint priority and strict resolution deadlines (`YYYY-MM-DD`).
   - Monitor real-time status breakdowns, SLA overdues, officer workloads, and export full reports as `.xlsx`.
   - Manage user roles and activate/deactivate accounts.

## 2. Technical Stack
- **Frontend**: React 19 + Vite, Tailwind CSS, Lucide icons, Motion animations.
- **Backend**: Node.js + Express REST API (CORS, Helmet, Rate Limiter, Multer, JWT, Bcrypt).
- **Database**: MySQL 8.0+ / MariaDB via XAMPP (`civicpulse_db`, InnoDB, foreign keys, utf8mb4).
- **Analytics Service**: Python 3.11 + FastAPI + Uvicorn.
