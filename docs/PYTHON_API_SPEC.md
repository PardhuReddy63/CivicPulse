# CivicPulse Hub — Python Microservice Specification

Base URL: `http://127.0.0.1:8000`
Framework: FastAPI + Uvicorn
Security: HTTP Bearer Token (`PYTHON_SERVICE_TOKEN`)

## Endpoints

### 1. `POST /api/v1/analyze/trends`
Calculates volume trends, reopening rate, category distribution, and descriptive insights.
**Payload**:
```json
{
  "complaints": [
    {
      "complaint_id": 1,
      "category": "Roads & Infrastructure",
      "status": "ASSIGNED",
      "priority": "HIGH",
      "resolution_cycle": 1
    }
  ],
  "window_days": 30
}
```
**Response**:
```json
{
  "analysis_version": "v1.0",
  "window_days": 30,
  "total_complaints_analyzed": 1,
  "reopening_rate_percentage": 0.0,
  "category_distribution": { "Roads & Infrastructure": 1 },
  "status_distribution": { "ASSIGNED": 1 },
  "priority_distribution": { "HIGH": 1 },
  "insights": [
    "Highest volume sector: 'Roads & Infrastructure' accounts for 100% of all grievances."
  ]
}
```

### 2. `POST /api/v1/analyze/workload`
Analyzes pending queue, overdue SLA tickets, and category bottlenecks.
