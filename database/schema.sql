-- CivicPulse Hub — Grievance Management & Feedback Redressal System
-- Version 1.0 Production Database Schema (MySQL 8.0+ / MariaDB XAMPP)
-- Database: civicpulse_db

CREATE DATABASE IF NOT EXISTS `civicpulse_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `civicpulse_db`;

-- Drop existing tables in reverse dependency order if recreating
DROP TABLE IF EXISTS `audit_logs`;
DROP TABLE IF EXISTS `complaint_status_history`;
DROP TABLE IF EXISTS `complaint_feedback`;
DROP TABLE IF EXISTS `complaint_attachments`;
DROP TABLE IF EXISTS `complaints`;
DROP TABLE IF EXISTS `password_reset_tokens`;
DROP TABLE IF EXISTS `otp_verifications`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `departments`;

-- 1. Departments Table
CREATE TABLE `departments` (
  `department_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`department_id`),
  UNIQUE KEY `uq_department_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Users Table
CREATE TABLE `users` (
  `user_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(254) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` VARCHAR(30) NOT NULL COMMENT 'CITIZEN, OFFICER, ADMIN',
  `department_id` BIGINT UNSIGNED NULL COMMENT 'NULL for citizens/admins; FK departments for officers',
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  `verified` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uq_user_email` (`email`),
  KEY `idx_users_role` (`role`),
  KEY `idx_users_department` (`department_id`),
  CONSTRAINT `fk_users_department` FOREIGN KEY (`department_id`) 
    REFERENCES `departments` (`department_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `chk_user_role` CHECK (`role` IN ('CITIZEN', 'OFFICER', 'ADMIN'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. OTP Verifications Table
CREATE TABLE `otp_verifications` (
  `otp_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `otp_hash` VARCHAR(255) NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `used_at` DATETIME NULL,
  `attempt_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`otp_id`),
  KEY `idx_otp_user` (`user_id`),
  KEY `idx_otp_expires` (`expires_at`),
  CONSTRAINT `fk_otp_user` FOREIGN KEY (`user_id`) 
    REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Password Reset Tokens Table
CREATE TABLE `password_reset_tokens` (
  `reset_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `token_hash` VARCHAR(255) NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `used_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`reset_id`),
  KEY `idx_reset_user` (`user_id`),
  KEY `idx_reset_expires` (`expires_at`),
  CONSTRAINT `fk_reset_user` FOREIGN KEY (`user_id`) 
    REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Complaints Table
CREATE TABLE `complaints` (
  `complaint_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `sub_category` VARCHAR(100) NULL,
  `location` VARCHAR(255) NOT NULL,
  `latitude` DECIMAL(10, 8) NULL,
  `longitude` DECIMAL(11, 8) NULL,
  `image` VARCHAR(500) NULL COMMENT 'before-image storage key/path',
  `status` VARCHAR(40) NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING, ASSIGNED, IN_PROGRESS, RESOLUTION_REJECTED, RESOLUTION_PENDING_REVIEW, AWAITING_CITIZEN, RESOLVED',
  `priority` VARCHAR(20) NOT NULL DEFAULT 'MEDIUM' COMMENT 'LOW, MEDIUM, HIGH',
  `officer_priority` VARCHAR(20) NULL COMMENT 'officer-specific priority where allowed',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT 'Citizen owner',
  `officer_id` BIGINT UNSIGNED NULL COMMENT 'Assigned officer',
  `deadline` DATE NULL COMMENT 'Admin-set resolution deadline YYYY-MM-DD',
  `resolved_image` VARCHAR(500) NULL COMMENT 'after-image storage key/path',
  `resolved_notes` TEXT NULL COMMENT 'Officer work summary',
  `resolved_at` DATETIME NULL COMMENT 'Resolution timestamp',
  `resolved_by` BIGINT UNSIGNED NULL COMMENT 'FK users.user_id, resolving officer',
  `resolution_cycle` INT UNSIGNED NOT NULL DEFAULT 1 COMMENT 'Incremented upon reopening',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`complaint_id`),
  KEY `idx_complaints_status_created` (`status`, `created_at`),
  KEY `idx_complaints_officer_status` (`officer_id`, `status`),
  KEY `idx_complaints_user_created` (`user_id`, `created_at`),
  KEY `idx_complaints_deadline_status` (`deadline`, `status`),
  KEY `idx_complaints_category` (`category`),
  CONSTRAINT `fk_complaints_user` FOREIGN KEY (`user_id`) 
    REFERENCES `users` (`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_complaints_officer` FOREIGN KEY (`officer_id`) 
    REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_complaints_resolved_by` FOREIGN KEY (`resolved_by`) 
    REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `chk_complaint_status` CHECK (`status` IN ('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'RESOLUTION_REJECTED', 'RESOLUTION_PENDING_REVIEW', 'AWAITING_CITIZEN', 'RESOLVED')),
  CONSTRAINT `chk_complaint_priority` CHECK (`priority` IN ('LOW', 'MEDIUM', 'HIGH')),
  CONSTRAINT `chk_complaint_officer_priority` CHECK (`officer_priority` IS NULL OR `officer_priority` IN ('LOW', 'MEDIUM', 'HIGH'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Complaint Attachments Table
CREATE TABLE `complaint_attachments` (
  `attachment_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `complaint_id` BIGINT UNSIGNED NOT NULL,
  `attachment_type` VARCHAR(20) NOT NULL COMMENT 'BEFORE or AFTER',
  `file_path` VARCHAR(500) NOT NULL,
  `mime_type` VARCHAR(100) NOT NULL,
  `uploaded_by` BIGINT UNSIGNED NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`attachment_id`),
  KEY `idx_attachments_complaint` (`complaint_id`),
  KEY `idx_attachments_uploader` (`uploaded_by`),
  CONSTRAINT `fk_attachments_complaint` FOREIGN KEY (`complaint_id`) 
    REFERENCES `complaints` (`complaint_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_attachments_uploader` FOREIGN KEY (`uploaded_by`) 
    REFERENCES `users` (`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_attachment_type` CHECK (`attachment_type` IN ('BEFORE', 'AFTER'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Complaint Feedback Table
CREATE TABLE `complaint_feedback` (
  `feedback_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `complaint_id` BIGINT UNSIGNED NOT NULL,
  `citizen_id` BIGINT UNSIGNED NOT NULL,
  `rating` TINYINT UNSIGNED NOT NULL COMMENT '1-5; ratings 1-2 reopen complaint',
  `feedback_text` TEXT NULL,
  `resolution_cycle` INT UNSIGNED NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`feedback_id`),
  KEY `idx_feedback_complaint` (`complaint_id`),
  KEY `idx_feedback_citizen` (`citizen_id`),
  CONSTRAINT `fk_feedback_complaint` FOREIGN KEY (`complaint_id`) 
    REFERENCES `complaints` (`complaint_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_feedback_citizen` FOREIGN KEY (`citizen_id`) 
    REFERENCES `users` (`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_feedback_rating` CHECK (`rating` >= 1 AND `rating` <= 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `complaint_resolution_verifications` (
  `verification_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `complaint_id` BIGINT UNSIGNED NOT NULL,
  `resolution_cycle` INT UNSIGNED NOT NULL,
  `citizen_id` BIGINT UNSIGNED NOT NULL,
  `decision` VARCHAR(20) NOT NULL,
  `feedback_text` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`verification_id`),
  UNIQUE KEY `uq_resolution_verification_cycle` (`complaint_id`, `resolution_cycle`),
  KEY `idx_resolution_verification_citizen` (`citizen_id`),
  CONSTRAINT `fk_resolution_verification_complaint`
    FOREIGN KEY (`complaint_id`) REFERENCES `complaints` (`complaint_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_resolution_verification_citizen`
    FOREIGN KEY (`citizen_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_resolution_verification_decision`
    CHECK (`decision` IN ('RESOLVED', 'NOT_RESOLVED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Complaint Status History Table
CREATE TABLE `complaint_status_history` (
  `history_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `complaint_id` BIGINT UNSIGNED NOT NULL,
  `changed_by` BIGINT UNSIGNED NULL,
  `old_status` VARCHAR(40) NULL,
  `new_status` VARCHAR(40) NOT NULL,
  `reason` VARCHAR(500) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`history_id`),
  KEY `idx_history_complaint` (`complaint_id`),
  KEY `idx_history_changer` (`changed_by`),
  CONSTRAINT `fk_history_complaint` FOREIGN KEY (`complaint_id`) 
    REFERENCES `complaints` (`complaint_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_history_changer` FOREIGN KEY (`changed_by`) 
    REFERENCES `users` (`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Audit Logs Table
CREATE TABLE `audit_logs` (
  `audit_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `actor_user_id` BIGINT UNSIGNED NULL,
  `action` VARCHAR(100) NOT NULL,
  `entity_type` VARCHAR(50) NOT NULL COMMENT 'COMPLAINT, USER, DEPARTMENT, AUTH',
  `entity_id` BIGINT UNSIGNED NULL,
  `details_json` JSON NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`audit_id`),
  KEY `idx_audit_actor` (`actor_user_id`),
  KEY `idx_audit_entity` (`entity_type`, `entity_id`),
  KEY `idx_audit_created` (`created_at`),
  CONSTRAINT `fk_audit_actor` FOREIGN KEY (`actor_user_id`) 
    REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
