# CivicPulse Hub — Backend REST API Engine (M2)

Node.js + Express REST API supporting Role-Based Access Control (`CITIZEN`, `OFFICER`, `ADMIN`), OTP email verification, complaint lifecycle management, resolution evidence uploads, and XLSX report generation.

## Prerequisites
- Node.js 20.19+ or 22.12+ (the frontend's Vite 8 requires this runtime)
- XAMPP MySQL running and an empty `civicpulse_db` initialized via `database/schema.sql`
- Windows PowerShell

## Quickstart via Windows PowerShell

### 1. Navigate to Backend Directory
```powershell
cd civicpulse/backend
```

### 2. Install Dependencies
```powershell
npm install
```

### 3. Configure Environment Variables
```powershell
if (!(Test-Path .\.env)) { Copy-Item .env.example .env }
notepad .\.env
```
Set the required database settings and a unique `JWT_SECRET` (at least 32 characters). SMTP settings are optional for server startup but required to register/verify accounts and send password reset messages. When SMTP is not set, email-dependent endpoints return `SMTP_NOT_CONFIGURED` and do not expose OTP/reset tokens.

For local development, create the first administrator only when none exists by running `npm run admin:create` with temporary `ADMIN_BOOTSTRAP_IDENTIFIER` and `ADMIN_BOOTSTRAP_PASSWORD` environment values. The script is restricted to `NODE_ENV=development` and loopback MySQL, never overwrites an administrator, hashes the supplied password, and does not print credentials. See the root README for a PowerShell prompt that keeps the password out of source files. Production administrator provisioning must use a private operational process.

### 4. Run Server in Development Mode
```powershell
npm run dev
# or for standard production mode:
npm start
```
The server will bind to `http://localhost:5000/api/v1`.

### 5. Run Automated Tests
```powershell
npm test
```

## API Architecture & Endpoints
- **Authentication**: `/api/v1/auth/register`, `/verify-otp`, `/resend-otp`, `/login`, `/me`, `/change-password`, `/forgot-password`, `/reset-password`
- **Complaints**:
  - `POST /api/v1/complaints`: Citizen lodging with multipart file upload
  - `GET /api/v1/complaints`: Admin list with status & priority filters
  - `GET /api/v1/complaints/mine`: Citizen own grievance history
  - `GET /api/v1/complaints/assigned`: Officer assigned workload
  - `POST /api/v1/complaints/:id/assign`: Admin assigns officer & sets deadline
  - `POST /api/v1/complaints/:id/resolve`: Officer records notes & after-photo
  - `POST /api/v1/complaints/:id/feedback`: Citizen rates 1–5 (Ratings 1–2 trigger automated reopening)
- **User & Department Management**: `/api/v1/users`, `/users/:id/role`, `/users/:id/active`, `/users/officers/active`
- **Analytics & Reports**: `/api/v1/reports/totals`, `/daily`, `/status`, `/officers`, `/export.xlsx`
- **Audit**: Admin-only `/api/v1/users/audit`

The Python analytics service is optional. Configure its internal token in both service `.env` files to enable it; an unavailable service does not stop core complaint operations.
