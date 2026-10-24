# CivicPulse Hub — Acceptance Test Plan (AT01 - AT12)

| Test ID | Objective | Input / Action | Expected Result | Status |
|---|---|---|---|---|
| **AT01** | Registration & OTP | Register new citizen account, input 6-digit OTP | User created unverified; valid OTP marks verified=1; wrong/expired OTP rejected | PASSED |
| **AT02** | Login & RBAC | Sign in as CITIZEN, OFFICER, and ADMIN | JWT issued; citizen barred from admin endpoints; officer restricted to assigned cases | PASSED |
| **AT03** | Create Complaint | Citizen submits title, description, category, before-image | Status set to PENDING; image stored; history recorded; owner ID mapped | PASSED |
| **AT04** | Admin Assignment | Admin assigns department officer, sets priority and deadline | Status changes to ASSIGNED; deadline recorded; status history updated | PASSED |
| **AT05** | Officer Resolution | Assigned officer enters resolution summary & after-image | Status changes to RESOLVED; unassigned officer resolution attempt rejected (403) | PASSED |
| **AT06** | Low Rating Reopen | Citizen rates resolved ticket 1 or 2 stars with complaint note | Ticket automatically reopens to PENDING; resolution notes & cycle history preserved | PASSED |
| **AT07** | High Rating Satisfied | Citizen rates 3 to 5 stars | Ticket remains RESOLVED and archived; feedback recorded | PASSED |
| **AT08** | Ownership Guard | Citizen requests another user's private ticket | Backend returns 403 Forbidden | PASSED |
| **AT09** | Reporting Accuracy | Fetch status breakdown and daily totals | Accurate counts matching database records | PASSED |
| **AT10** | Upload Security | Attempt upload of >5MB or unsupported file type | Multer rejects with 413 or 415 | PASSED |
| **AT11** | Python Resilience | Terminate Python service and file/resolve complaints | Core operations complete normally with graceful notice | PASSED |
| **AT12** | Independent Modules | Test backend, frontend mocks, database scripts independently | Standalone execution verified | PASSED |
