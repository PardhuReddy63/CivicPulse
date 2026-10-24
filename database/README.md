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
- **departments**: Department registry (Sanitation, Electricity, Water Works, Roads, Public Health).
- **users**: CITIZEN, OFFICER, ADMIN accounts with bcrypt hash, active, and verified flags.
- **complaints**: Core ticket lifecycle (`PENDING` -> `ASSIGNED` -> `RESOLVED`), priority (`LOW`, `MEDIUM`, `HIGH`), deadline, officer assignments, and resolution notes.
- **complaint_attachments**: `BEFORE` and `AFTER` photos with MIME type verification.
- **complaint_feedback**: Citizen 1–5 star ratings. Ratings 1–2 trigger automated reopening to `PENDING` while preserving resolution history.
- **complaint_status_history**: Immutable chronological audit trace of all state changes.
- **otp_verifications**: Single-use, time-bound registration OTP tokens.
- **password_reset_tokens**: Expiring password recovery tokens.
- **audit_logs**: System-wide administrative action tracking.
