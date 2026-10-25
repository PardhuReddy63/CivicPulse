USE `civicpulse_db`;

ALTER TABLE `complaints`
  DROP CONSTRAINT `chk_complaint_status`,
  MODIFY COLUMN `status` VARCHAR(40) NOT NULL DEFAULT 'PENDING'
    COMMENT 'PENDING, ASSIGNED, IN_PROGRESS, RESOLUTION_REJECTED, RESOLUTION_PENDING_REVIEW, AWAITING_CITIZEN, RESOLVED',
  ADD CONSTRAINT `chk_complaint_status`
    CHECK (`status` IN (
      'PENDING',
      'ASSIGNED',
      'IN_PROGRESS',
      'RESOLUTION_REJECTED',
      'RESOLUTION_PENDING_REVIEW',
      'AWAITING_CITIZEN',
      'RESOLVED'
    ));

ALTER TABLE `complaint_status_history`
  MODIFY COLUMN `changed_by` BIGINT UNSIGNED NULL,
  MODIFY COLUMN `old_status` VARCHAR(40) NULL,
  MODIFY COLUMN `new_status` VARCHAR(40) NOT NULL;

CREATE INDEX `idx_feedback_complaint_cycle`
  ON `complaint_feedback` (`complaint_id`, `resolution_cycle`);

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
