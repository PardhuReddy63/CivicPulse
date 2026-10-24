-- CivicPulse Hub — Grievance Management & Feedback Redressal System
-- Development Seed Data
-- Database: civicpulse_db

USE `civicpulse_db`;

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

-- 1. Seed Departments
INSERT INTO `departments` (`department_id`, `name`, `active`, `created_at`) VALUES
(1, 'Sanitation & Solid Waste', 1, UTC_TIMESTAMP()),
(2, 'Electricity & Power', 1, UTC_TIMESTAMP()),
(3, 'Water Works & Drainage', 1, UTC_TIMESTAMP()),
(4, 'Roads & Infrastructure', 1, UTC_TIMESTAMP()),
(5, 'Public Health & Safety', 1, UTC_TIMESTAMP());

-- 2. Seed Users
-- Password for all seeded accounts is: Password@123
-- Bcrypt hash generated with 10 rounds: $2a$10$7EqJtq98hPqEX7fNZaFWoOhtnpx3QYpXJvi0jA6Y.m25jK4s2qBSu
INSERT INTO `users` (`user_id`, `name`, `email`, `password_hash`, `role`, `department_id`, `active`, `verified`, `created_at`, `updated_at`) VALUES
(1, 'System Administrator', 'admin@civicpulse.org', '$2a$10$7EqJtq98hPqEX7fNZaFWoOhtnpx3QYpXJvi0jA6Y.m25jK4s2qBSu', 'ADMIN', NULL, 1, 1, UTC_TIMESTAMP(), UTC_TIMESTAMP()),
(2, 'Officer Ramesh Sharma', 'officer.roads@civicpulse.org', '$2a$10$7EqJtq98hPqEX7fNZaFWoOhtnpx3QYpXJvi0jA6Y.m25jK4s2qBSu', 'OFFICER', 4, 1, 1, UTC_TIMESTAMP(), UTC_TIMESTAMP()),
(3, 'Officer Priya Patel', 'officer.water@civicpulse.org', '$2a$10$7EqJtq98hPqEX7fNZaFWoOhtnpx3QYpXJvi0jA6Y.m25jK4s2qBSu', 'OFFICER', 3, 1, 1, UTC_TIMESTAMP(), UTC_TIMESTAMP()),
(4, 'Officer Anil Verma', 'officer.electricity@civicpulse.org', '$2a$10$7EqJtq98hPqEX7fNZaFWoOhtnpx3QYpXJvi0jA6Y.m25jK4s2qBSu', 'OFFICER', 2, 1, 1, UTC_TIMESTAMP(), UTC_TIMESTAMP()),
(5, 'Citizen Anita Roy', 'citizen.anita@gmail.com', '$2a$10$7EqJtq98hPqEX7fNZaFWoOhtnpx3QYpXJvi0jA6Y.m25jK4s2qBSu', 'CITIZEN', NULL, 1, 1, UTC_TIMESTAMP(), UTC_TIMESTAMP()),
(6, 'Citizen Rahul Gupta', 'citizen.rahul@gmail.com', '$2a$10$7EqJtq98hPqEX7fNZaFWoOhtnpx3QYpXJvi0jA6Y.m25jK4s2qBSu', 'CITIZEN', NULL, 1, 1, UTC_TIMESTAMP(), UTC_TIMESTAMP());

-- 3. Seed Complaints
INSERT INTO `complaints` 
(`complaint_id`, `title`, `description`, `category`, `sub_category`, `location`, `latitude`, `longitude`, `image`, `status`, `priority`, `officer_priority`, `user_id`, `officer_id`, `deadline`, `resolved_image`, `resolved_notes`, `resolved_at`, `resolved_by`, `resolution_cycle`, `created_at`, `updated_at`) 
VALUES
(1, 'Dangerous Pothole on 5th Cross Road', 'A severe pothole 2 feet deep near the bus shelter causing two-wheeler skids during rains.', 'Roads & Infrastructure', 'Pothole', '5th Cross, Indiranagar Main Rd', 12.9784, 77.6408, '/uploads/pothole_before.jpg', 'ASSIGNED', 'HIGH', 'HIGH', 5, 2, DATE_ADD(CURRENT_DATE(), INTERVAL 2 DAY), NULL, NULL, NULL, NULL, 1, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY), UTC_TIMESTAMP()),

(2, 'Contaminated Water Supply in Block C', 'Tap water running muddy and with strong chemical odor for the past 48 hours.', 'Water Works & Drainage', 'Water Contamination', 'Flat 402, Block C, Lake View Apts', 12.9716, 77.5946, '/uploads/water_before.jpg', 'RESOLVED', 'HIGH', 'HIGH', 5, 3, DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY), '/uploads/water_after.jpg', 'Flushed primary main line valve and replaced breached sediment gasket at junction 4B. Water purity tested normal.', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 4 HOUR), 3, 1, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY), UTC_TIMESTAMP()),

(3, 'Broken Streetlight outside Government School', 'Three light poles are completely out for two weeks, creating safety hazard for children.', 'Electricity & Power', 'Streetlight', 'Near Govt Primary School, Ward 12', 12.9650, 77.6000, NULL, 'PENDING', 'MEDIUM', NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 1, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 6 HOUR), UTC_TIMESTAMP()),

(4, 'Overflowing Garbage Bin at Market Entrance', 'Municipal dump container overflowing onto pedestrian sidewalk.', 'Sanitation & Solid Waste', 'Garbage Dump', 'City Market East Entrance', 12.9620, 77.5750, '/uploads/garbage_before.jpg', 'PENDING', 'HIGH', NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 2, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 3 DAY), UTC_TIMESTAMP());

-- 4. Seed Attachments
INSERT INTO `complaint_attachments` (`attachment_id`, `complaint_id`, `attachment_type`, `file_path`, `mime_type`, `uploaded_by`, `created_at`) VALUES
(1, 1, 'BEFORE', '/uploads/pothole_before.jpg', 'image/jpeg', 5, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
(2, 2, 'BEFORE', '/uploads/water_before.jpg', 'image/jpeg', 5, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY)),
(3, 2, 'AFTER', '/uploads/water_after.jpg', 'image/jpeg', 3, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 4 HOUR)),
(4, 4, 'BEFORE', '/uploads/garbage_before.jpg', 'image/jpeg', 5, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 3 DAY));

-- 5. Seed Status History
INSERT INTO `complaint_status_history` (`history_id`, `complaint_id`, `changed_by`, `old_status`, `new_status`, `reason`, `created_at`) VALUES
(1, 1, 5, NULL, 'PENDING', 'Citizen filed grievance with before photo', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
(2, 1, 1, 'PENDING', 'ASSIGNED', 'Assigned to Officer Ramesh Sharma (Roads) with HIGH priority', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 18 HOUR)),
(3, 2, 5, NULL, 'PENDING', 'Citizen filed water contamination report', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY)),
(4, 2, 1, 'PENDING', 'ASSIGNED', 'Assigned to Officer Priya Patel (Water Works)', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 30 HOUR)),
(5, 2, 3, 'ASSIGNED', 'RESOLVED', 'Main pipeline flushed and sealed. Clean water verified.', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 4 HOUR)),
(6, 3, 6, NULL, 'PENDING', 'Citizen filed broken streetlight report', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 6 HOUR)),
(7, 4, 5, NULL, 'PENDING', 'Citizen filed garbage complaint', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 3 DAY)),
(8, 4, 1, 'PENDING', 'ASSIGNED', 'Assigned to Sanitation unit', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY)),
(9, 4, 1, 'ASSIGNED', 'RESOLVED', 'Cleared by morning squad', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
(10, 4, 5, 'RESOLVED', 'PENDING', 'Citizen rating 1/5: Garbage was only partially cleared, half remains on the path.', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 12 HOUR));

-- 6. Seed Feedback (Complaint #4 demonstrates automatic reopening for rating 1)
INSERT INTO `complaint_feedback` (`feedback_id`, `complaint_id`, `citizen_id`, `rating`, `feedback_text`, `resolution_cycle`, `created_at`) VALUES
(1, 4, 5, 1, 'Garbage was only partially cleared, half remains on the path. Foul smell continues.', 1, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 12 HOUR));

-- 7. Seed Audit Logs
INSERT INTO `audit_logs` (`audit_id`, `actor_user_id`, `action`, `entity_type`, `entity_id`, `details_json`, `created_at`) VALUES
(1, 1, 'USER_SEED', 'USER', 1, '{"role": "ADMIN", "note": "System bootstrap"}', UTC_TIMESTAMP()),
(2, 1, 'COMPLAINT_ASSIGNMENT', 'COMPLAINT', 1, '{"assigned_to": 2, "priority": "HIGH", "deadline": "2026-10-25"}', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 18 HOUR)),
(3, 3, 'COMPLAINT_RESOLVED', 'COMPLAINT', 2, '{"notes": "Main line gasket replaced"}', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 4 HOUR)),
(4, 5, 'CITIZEN_FEEDBACK_REOPEN', 'COMPLAINT', 4, '{"rating": 1, "previous_status": "RESOLVED", "new_status": "PENDING"}', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 12 HOUR));
