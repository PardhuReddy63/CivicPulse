USE `civicpulse_db`;

SET @column_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'must_change_password'
);

SET @migration_statement = IF(
  @column_exists = 0,
  'ALTER TABLE `users` ADD COLUMN `must_change_password` TINYINT(1) NOT NULL DEFAULT 0 AFTER `verified`',
  'SELECT 1'
);

PREPARE migration_statement FROM @migration_statement;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;
