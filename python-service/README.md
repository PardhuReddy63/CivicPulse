# CivicPulse Hub — Python Analytics Service (M4)

Optional FastAPI service for deterministic trend and workload statistics computed from complaint records sent by the Express backend. No generative AI APIs are used.

## Windows PowerShell setup

```powershell
Set-Location .\python-service
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
if (!(Test-Path .\.env)) { Copy-Item .env.example .env }
notepad .\.env
```

Set `PYTHON_SERVICE_TOKEN` in `.env` to a unique random value of at least 32 characters. Configure the **same** value in `backend\.env`. The example placeholder is intentionally rejected at service startup.

```powershell
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
python -m pytest
```

Interactive API docs are available at `http://127.0.0.1:8000/docs`.

Only the authenticated Express backend calls the analysis endpoints. Passwords, email addresses, OTPs, and coordinates are not sent to the analytics service. Analytics are computed from real database records supplied by the backend. If this optional service is unavailable, the grievance workflow continues and the reports surface an availability notice.
