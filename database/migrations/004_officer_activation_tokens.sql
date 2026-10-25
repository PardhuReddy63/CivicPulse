USE `civicpulse_db`;

CREATE TABLE IF NOT EXISTS `officer_activation_tokens` (
  `activation_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `request_id` BIGINT UNSIGNED NOT NULL,
  `token_hash` CHAR(64) NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `used_at` DATETIME DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`activation_id`),
  UNIQUE KEY `uq_officer_activation_token_hash` (`token_hash`),
  KEY `idx_officer_activation_request` (`request_id`),
  KEY `idx_officer_activation_expiry` (`expires_at`),

  CONSTRAINT `fk_officer_activation_request`
    FOREIGN KEY (`request_id`)
    REFERENCES `officer_registration_requests` (`request_id`)
);
