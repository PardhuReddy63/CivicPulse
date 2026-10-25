# CivicPulse Hub — Database Module (M3)

## Prerequisites
- XAMPP with MySQL/MariaDB 10.4+ or MySQL Community Server 8.0+
- phpMyAdmin (available at `http://localhost/phpmyadmin` when XAMPP is running)
- Windows PowerShell

## Database Setup via Windows PowerShell

### 1. Verify MySQL Service is Running
Ensure Apache and MySQL services are started in the XAMPP Control Panel.
In PowerShell:
```powershell
Get-Service -Name MySQL* -ErrorAction SilentlyContinue
```

### 2. Navigate to Database Directory
```powershell
cd civicpulse/database
```

### 3. Create a New, Empty Database & Run Schema
Using MySQL CLI bundled in XAMPP (default path `C:\xampp\mysql\bin\mysql.exe`):
```powershell
& "C:\xampp\mysql\bin\mysql.exe" -u root -e "CREATE DATABASE IF NOT EXISTS civicpulse_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
Get-Content .\schema.sql -Raw | & "C:\xampp\mysql\bin\mysql.exe" -u root civicpulse_db
```

**Important:** `schema.sql` drops and recreates its tables. Only use it on a new/empty database or after a verified backup. Do not load `seed-dev.sql` into your real development database; it contains sample account and complaint records. Create the first administrator using the backend's one-time `npm run admin:create` command.

### 5. Verify Setup
```powershell
& "C:\xampp\mysql\bin\mysql.exe" -u root civicpulse_db -e "SHOW TABLES; SELECT role, count(*) FROM users GROUP BY role; SELECT status, count(*) FROM complaints GROUP BY status;"
```

### 5. Test Database Setup (Isolated for Automated Testing)
```powershell
& "C:\xampp\mysql\bin\mysql.exe" -u root < test-schema.sql
& "C:\xampp\mysql\bin\mysql.exe" -u root civicpulse_test_db < test-data.sql
```

## Schema Entities & Relationships
- **departments**: Department registry for the five grievance categories, including Public Health & Safety.
- **users**: CITIZEN, OFFICER, ADMIN accounts with bcrypt hash, active, and verified flags.
- **complaints**: Ticket lifecycle (`PENDING` -> `ASSIGNED` -> `IN_PROGRESS` -> `RESOLUTION_PENDING_REVIEW` -> `AWAITING_CITIZEN` -> `RESOLVED`), priority, deadline, officer assignments, and resolution notes. Rejected proof and citizen rejection return the grievance to its assigned officer.
- **complaint_attachments**: `BEFORE` and `AFTER` photos with MIME type verification.
- **complaint_feedback**: Per-cycle optional satisfaction ratings; ratings of 1–2 reopen the grievance to its assigned officer.
- **complaint_resolution_verifications**: One timestamped `RESOLVED` or `NOT_RESOLVED` response per citizen and resolution cycle, separate from star ratings.
- **complaint_status_history**: Immutable chronological audit trace of all state changes.
- **otp_verifications**: Single-use, time-bound registration OTP tokens.
- **password_reset_tokens**: Expiring password recovery tokens.
- **audit_logs**: System-wide administrative action tracking.

## Safe department catalog migration

Existing databases created before the department catalog was populated can apply
`migrations/001_configure_grievance_departments.sql` without dropping tables or
changing grievance/user records. It inserts missing supported department names
and leaves existing department settings unchanged. Run it only
after confirming `civicpulse_db` is the intended database:

```powershell
Get-Content .\migrations\001_configure_grievance_departments.sql -Raw |
  & "C:\xampp\mysql\bin\mysql.exe" -u root civicpulse_db
```

Department officers must be assigned to the matching department before an
administrator can assign grievances in that category.

## Safe resolution workflow migration

Existing databases must apply `migrations/005_resolution_review_workflow.sql`
before deploying the application changes. It widens status/history fields,
expands the status check constraint, and creates the resolution-verification
table; it does not drop tables or change existing grievance rows. Back up the
database and confirm the target database before running it. Never run
`schema.sql` against an existing database.

From the repository root in PowerShell, after verifying the backup and target:

```powershell
Get-Content .\database\migrations\005_resolution_review_workflow.sql -Raw |
  & "C:\xampp\mysql\bin\mysql.exe" -u root -p civicpulse_db
```

## Local development administrator bootstrap

The legacy `migrations/002_admin_first_login_password.sql` migration is retained
for databases that applied it, but the application no longer reads or enforces
its flag. Fresh schemas do not include that obsolete field. Do not re-run
`schema.sql` against an existing database; it drops and recreates tables.

To provision the initial administrator on a local development database, start
the backend with `NODE_ENV=development` and a loopback MySQL host, then run
`npm run admin:create` from `backend/`. The bootstrap is manual, creates an
administrator only when none exists, never overwrites an account, and does not
print credentials. It must not be run against production or any remote database.
The local bootstrap account uses the development-only login values provided for
this setup; change the password after signing in using **Account → Change
password**. Administrators can also change passwords voluntarily at any time.

For deployments, provision the first administrator through a controlled,
private operational procedure with a unique password; do not use the local
development bootstrap.
