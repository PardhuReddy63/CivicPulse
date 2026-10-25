USE `civicpulse_db`;

INSERT INTO `departments` (`name`, `active`)
VALUES
  ('Sanitation & Solid Waste', 1),
  ('Electricity & Power', 1),
  ('Water Works & Drainage', 1),
  ('Roads & Infrastructure', 1),
  ('Public Health & Safety', 1)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);
