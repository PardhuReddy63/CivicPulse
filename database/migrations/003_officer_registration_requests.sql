USE `civicpulse_db`;

CREATE TABLE IF NOT EXISTS `officer_registration_requests` (
  `request_id` BIGINT NOT NULL AUTO_INCREMENT,
  `full_name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(30) NOT NULL,
  `department_id` BIGINT UNSIGNED NOT NULL,
  `designation` VARCHAR(150) NOT NULL,
  `reason` TEXT NOT NULL,
  `status` ENUM('PENDING', 'APPROVED', 'REJECTED')
    NOT NULL DEFAULT 'PENDING',
  `reviewed_by` BIGINT UNSIGNED DEFAULT NULL,
  `reviewed_at` DATETIME DEFAULT NULL,
  `review_notes` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`request_id`),
  UNIQUE KEY `uq_officer_request_email` (`email`),
  KEY `idx_officer_request_status` (`status`),
  KEY `idx_officer_request_department` (`department_id`),

  CONSTRAINT `fk_officer_request_department`
    FOREIGN KEY (`department_id`)
    REFERENCES `departments` (`department_id`),

  CONSTRAINT `fk_officer_request_reviewer`
    FOREIGN KEY (`reviewed_by`)
    REFERENCES `users` (`user_id`)
    ON DELETE SET NULL
);
