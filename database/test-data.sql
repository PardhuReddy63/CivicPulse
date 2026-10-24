-- CivicPulse Hub — Test Fixtures
-- Database: civicpulse_test_db
USE `civicpulse_test_db`;

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE `audit_logs`;
TRUNCATE TABLE `complaint_status_history`;
TRUNCATE TABLE `complaint_feedback`;
TRUNCATE TABLE `complaint_attachments`;
TRUNCATE TABLE `complaints`;
TRUNCATE TABLE `password_reset_tokens`;
TRUNCATE TABLE `otp_verifications`;
TRUNCATE TABLE `users`;
TRUNCATE TABLE `departments`;
SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO `departments` (`department_id`, `name`, `active`) VALUES
(1, 'Sanitation', 1),
(2, 'Electricity', 1),
(3, 'Water Works', 1),
(4, 'Roads', 1);

INSERT INTO `users` (`user_id`, `name`, `email`, `password_hash`, `role`, `department_id`, `active`, `verified`) VALUES
(1, 'Test Admin', 'admin.test@civicpulse.org', '$2a$10$7EqJtq98hPqEX7fNZaFWoOhtnpx3QYpXJvi0jA6Y.m25jK4s2qBSu', 'ADMIN', NULL, 1, 1),
(2, 'Test Officer', 'officer.test@civicpulse.org', '$2a$10$7EqJtq98hPqEX7fNZaFWoOhtnpx3QYpXJvi0jA6Y.m25jK4s2qBSu', 'OFFICER', 4, 1, 1),
(3, 'Test Citizen', 'citizen.test@civicpulse.org', '$2a$10$7EqJtq98hPqEX7fNZaFWoOhtnpx3QYpXJvi0jA6Y.m25jK4s2qBSu', 'CITIZEN', NULL, 1, 1),
(4, 'Unverified Citizen', 'unverified@civicpulse.org', '$2a$10$7EqJtq98hPqEX7fNZaFWoOhtnpx3QYpXJvi0jA6Y.m25jK4s2qBSu', 'CITIZEN', NULL, 1, 0);

INSERT INTO `complaints` (`complaint_id`, `title`, `description`, `category`, `location`, `status`, `priority`, `user_id`, `officer_id`, `deadline`) VALUES
(101, 'Test Pending Complaint', 'Road pothole needing survey', 'Roads', 'MG Road 1st Cross', 'PENDING', 'MEDIUM', 3, NULL, NULL),
(102, 'Test Assigned Complaint', 'Broken street lamp near school', 'Electricity', 'School Lane', 'ASSIGNED', 'HIGH', 3, 2, '2026-10-30'),
(103, 'Test Resolved Complaint', 'Leaking drainage pipeline', 'Water Works', 'Pipeline Rd', 'RESOLVED', 'HIGH', 3, 2, '2026-10-20');
