# CivicPulse Hub — REST API Specification

Base URL: `http://localhost:5000/api/v1`

## Standard Envelope Formats
### Success Response
```json
{
  "success": true,
  "data": { ... },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "total_pages": 3
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE_STRING",
    "message": "Human readable summary",
    "details": []
  }
}
```

## Endpoints Summary

### Authentication (`/auth`)
| Method | Endpoint | Role | Description |
|---|---|---|---|
| POST | `/auth/register` | Public | Register account, dispatch 6-digit email OTP |
| POST | `/auth/verify-otp` | Public | Validate OTP and activate user account |
| POST | `/auth/resend-otp` | Public | Invalidate previous OTP and issue fresh code |
| POST | `/auth/login` | Public | Authenticate verified user and return JWT |
| POST | `/auth/logout` | Authenticated | Discard active token session |
| POST | `/auth/forgot-password` | Public | Request expiring password reset token |
| POST | `/auth/reset-password` | Public | Reset password using valid token |
| GET | `/auth/me` | Authenticated | Return profile of currently signed-in user |

### Complaints (`/complaints`)
| Method | Endpoint | Role | Description |
|---|---|---|---|
| POST | `/complaints` | CITIZEN | Lodge complaint with multipart before-photo |
| GET | `/complaints` | ADMIN | Filter & paginate all complaints |
| GET | `/complaints/mine` | CITIZEN | Fetch complaints filed by logged-in citizen |
| GET | `/complaints/assigned` | OFFICER | Fetch complaints assigned to logged-in officer |
| GET | `/complaints/:id` | Owner / Officer / Admin | Fetch complaint details with attachments |
| POST | `/complaints/:id/assign` | ADMIN | Assign officer, set priority & deadline |
| PATCH | `/complaints/:id/deadline` | ADMIN | Update resolution deadline (YYYY-MM-DD) |
| PUT | `/complaints/:id/priority` | ADMIN | Set priority (LOW, MEDIUM, HIGH) |
| PUT | `/complaints/:id/officer-priority`| Assigned OFFICER | Update internal priority |
| POST | `/complaints/:id/resolve` | Assigned OFFICER | Upload after-photo & notes, mark RESOLVED |
| POST | `/complaints/:id/feedback` | CITIZEN Owner | Submit 1–5 rating. Ratings 1–2 reopen ticket |
| GET | `/complaints/:id/history` | Permitted | Chronological status change log |

### Reports & Analytics (`/reports`)
| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/reports/totals` | ADMIN | Counts grouped by complaint status |
| GET | `/reports/recent` | ADMIN | 10 most recent complaints |
| GET | `/reports/daily` | ADMIN | Daily complaint volumes (last 14 days) |
| GET | `/reports/status` | ADMIN | Percentage distribution of complaint statuses |
| GET | `/reports/officers`| ADMIN | Officer workload and overdue analysis |
| GET | `/reports/export.xlsx`| ADMIN | Download Excel spreadsheet of all data |
| GET | `/reports/analytics/trends` | ADMIN | Python FastAPI trend analysis proxy |
| GET | `/reports/me/totals` | CITIZEN | Totals for authenticated citizen |
