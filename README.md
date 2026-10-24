# CivicPulse Hub — Grievance Management & Feedback Redressal System

CivicPulse Hub is the existing role-based municipal grievance application: React 19/Vite, Express, MySQL, and an optional FastAPI analytics service. Complaints and account data are read from MySQL through the authenticated Express API. There is no default mock login or demo complaint dataset.

## Windows 11 / PowerShell quick start

Use Node.js `20.19+` or `22.12+` (required by Vite 8), Python 3.11, and XAMPP/MySQL. Open separate PowerShell terminals for the services. Install and run commands from this repository:

### 1. Prepare a new, empty MySQL database

Start MySQL in XAMPP, then run from the repository root:

```powershell
$mysql = "C:\xampp\mysql\bin\mysql.exe"
& $mysql -u root -e "CREATE DATABASE IF NOT EXISTS civicpulse_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
Get-Content .\database\schema.sql -Raw | & $mysql -u root civicpulse_db
```

The schema script drops and recreates its tables. Only import it into a new/empty database or after taking a verified backup. Do **not** run `database\seed-dev.sql` against your development database; it contains sample users and complaints.

### 2. Configure and run Express

```powershell
Set-Location .\backend
npm install
if (!(Test-Path .\.env)) { Copy-Item .\.env.example .\.env }
notepad .\.env
```

Set `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, and a unique `JWT_SECRET` (at least 32 characters). Set SMTP fields to your provider values to enable registration/verification and password reset. When SMTP is unset, email-dependent actions return a configuration error; no OTP or reset token is exposed as a development shortcut.

For a fresh database, provision the first administrator through the one-time CLI. Set the name and email and enter a unique password without placing secrets in source files:

```powershell
$env:ADMIN_NAME = Read-Host "Administrator name"
$env:ADMIN_EMAIL = Read-Host "Administrator email"
$securePassword = Read-Host "Administrator password (12+ characters)" -AsSecureString
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
try {
  $env:ADMIN_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
  npm run admin:create
}
finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
  Remove-Item Env:ADMIN_PASSWORD, Env:ADMIN_NAME, Env:ADMIN_EMAIL -ErrorAction SilentlyContinue
}
```

Then start the API:

```powershell
npm run dev
```

The API is at `http://localhost:5000/api/v1`.

### 3. Optional Python analytics service

In a separate terminal:

```powershell
Set-Location .\python-service
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
if (!(Test-Path .\.env)) { Copy-Item .\.env.example .\.env }
notepad .\.env
```

Set `PYTHON_SERVICE_TOKEN` to a unique random value of at least 32 characters. Set the same value in `backend\.env`. Then run:

```powershell
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

The analytics API docs are at `http://127.0.0.1:8000/docs`. Python analytics are optional; the main grievance workflow continues if this service is stopped.

### 4. Configure and run React/Vite

In a separate terminal:

```powershell
Set-Location .\frontend
npm install
if (!(Test-Path .\.env)) { Copy-Item .\.env.example .\.env }
npm run dev
```

Open `http://localhost:5173`. `VITE_API_BASE_URL` defaults to the Express API. `VITE_OSM_TILE_URL` can override the Leaflet tile URL; no Google Maps API key is required.

## Authentication and workflow

- Citizens register with a password, verify their email using the emailed OTP, and then sign in. Officer/admin accounts are provisioned by an administrator.
- Admin assigns pending complaints to an active officer and can set priority/deadline.
- The assigned officer records resolution notes and optional after-photo.
- A citizen feedback rating of 1–2 reopens the complaint while preserving previous resolution fields and feedback/status history; ratings 3–5 leave it resolved.
- Backend routes enforce JWT authentication, roles, ownership, assignment, and valid lifecycle transitions.

## Map tiles

Maps use Leaflet with OpenStreetMap tiles and visible attribution. Browser geolocation is requested only after a user clicks the location button; map selection and manual latitude/longitude entry are available as alternatives. Complaints without valid stored coordinates are not plotted. The OpenStreetMap public tile service has usage policies and is not an unrestricted production tile host; use a compliant provider or self-hosted tiles for production-scale traffic.

## Checks

```powershell
Set-Location .\frontend; npm run build
Set-Location ..\backend; npm test
Set-Location ..\python-service; .\.venv\Scripts\python.exe -m pytest
```

`database\seed-dev.sql` and `database\test-data.sql` are not loaded by the application. Use only isolated test databases for fixture data.
