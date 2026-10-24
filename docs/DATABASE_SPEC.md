# CivicPulse Hub — Database Specification

Database: `civicpulse_db` (MySQL 8.0+ / MariaDB XAMPP)
Engine: `InnoDB`
Charset: `utf8mb4_unicode_ci`

## Schema Diagram Summary
- `users` (user_id [PK], name, email [UQ], password_hash, role, department_id [FK], active, verified)
- `departments` (department_id [PK], name [UQ], active)
- `complaints` (complaint_id [PK], title, description, category, sub_category, location, latitude, longitude, image, status, priority, officer_priority, user_id [FK], officer_id [FK], deadline, resolved_image, resolved_notes, resolved_at, resolved_by [FK], resolution_cycle)
- `complaint_attachments` (attachment_id [PK], complaint_id [FK], attachment_type, file_path, mime_type, uploaded_by [FK])
- `complaint_feedback` (feedback_id [PK], complaint_id [FK], citizen_id [FK], rating, feedback_text, resolution_cycle)
- `complaint_status_history` (history_id [PK], complaint_id [FK], changed_by [FK], old_status, new_status, reason, created_at)
- `otp_verifications` (otp_id [PK], user_id [FK], otp_hash, expires_at, used_at, attempt_count)
- `password_reset_tokens` (reset_id [PK], user_id [FK], token_hash, expires_at, used_at)
- `audit_logs` (audit_id [PK], actor_user_id [FK], action, entity_type, entity_id, details_json, created_at)

## Indexes & Constraints
- `idx_complaints_status_created` on `(status, created_at)`
- `idx_complaints_officer_status` on `(officer_id, status)`
- `idx_complaints_user_created` on `(user_id, created_at)`
- `idx_complaints_deadline_status` on `(deadline, status)`
- Check constraint on `role`: `('CITIZEN', 'OFFICER', 'ADMIN')`
- Check constraint on `status`: `('PENDING', 'ASSIGNED', 'RESOLVED')`
- Check constraint on `priority`: `('LOW', 'MEDIUM', 'HIGH')`
- Check constraint on `rating`: `(rating >= 1 AND rating <= 5)`
