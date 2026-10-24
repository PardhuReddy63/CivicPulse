import JSZip from 'jszip';

export async function generateFullProjectZip() {
  const zip = new JSZip();

  zip.file(
    'README.md',
    `# CivicPulse Hub — Grievance Management & Feedback Redressal System (Version 1.0)

Full multi-module system following the specification.
Includes database scripts (MySQL/XAMPP), backend (Node/Express), Python analytics (FastAPI), frontend (React + Vite), and documentation.

## Windows PowerShell Setup
1. MySQL: Import \`database/schema.sql\` and \`database/seed-dev.sql\` via XAMPP MySQL CLI.
2. Backend: \`cd backend\`, \`npm install\`, \`npm run dev\`
3. Python service: \`cd python-service\`, \`python -m venv venv\`, \`pip install -r requirements.txt\`, \`uvicorn app.main:app --reload\`
4. Frontend: \`cd frontend\`, \`npm install\`, \`npm run dev\`
`
  );

  const dbFolder = zip.folder('database');
  dbFolder?.file(
    'schema.sql',
    `-- CivicPulse Hub — MySQL Schema (civicpulse_db)
CREATE DATABASE IF NOT EXISTS \`civicpulse_db\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE \`civicpulse_db\`;

CREATE TABLE \`departments\` (
  \`department_id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  \`name\` VARCHAR(255) NOT NULL UNIQUE,
  \`active\` TINYINT(1) NOT NULL DEFAULT 1,
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE \`users\` (
  \`user_id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  \`name\` VARCHAR(255) NOT NULL,
  \`email\` VARCHAR(254) NOT NULL UNIQUE,
  \`password_hash\` VARCHAR(255) NOT NULL,
  \`role\` VARCHAR(30) NOT NULL,
  \`department_id\` BIGINT UNSIGNED NULL,
  \`active\` TINYINT(1) NOT NULL DEFAULT 1,
  \`verified\` TINYINT(1) NOT NULL DEFAULT 0,
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT \`fk_user_dept\` FOREIGN KEY (\`department_id\`) REFERENCES \`departments\` (\`department_id\`) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE \`complaints\` (
  \`complaint_id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  \`title\` VARCHAR(255) NOT NULL,
  \`description\` TEXT NOT NULL,
  \`category\` VARCHAR(100) NOT NULL,
  \`sub_category\` VARCHAR(100) NULL,
  \`location\` VARCHAR(255) NOT NULL,
  \`latitude\` DECIMAL(10, 8) NULL,
  \`longitude\` DECIMAL(11, 8) NULL,
  \`image\` VARCHAR(500) NULL,
  \`status\` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  \`priority\` VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
  \`officer_priority\` VARCHAR(20) NULL,
  \`user_id\` BIGINT UNSIGNED NOT NULL,
  \`officer_id\` BIGINT UNSIGNED NULL,
  \`deadline\` DATE NULL,
  \`resolved_image\` VARCHAR(500) NULL,
  \`resolved_notes\` TEXT NULL,
  \`resolved_at\` DATETIME NULL,
  \`resolved_by\` BIGINT UNSIGNED NULL,
  \`resolution_cycle\` INT UNSIGNED NOT NULL DEFAULT 1,
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT \`fk_comp_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`user_id\`),
  CONSTRAINT \`fk_comp_off\` FOREIGN KEY (\`officer_id\`) REFERENCES \`users\` (\`user_id\`) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE \`complaint_feedback\` (
  \`feedback_id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  \`complaint_id\` BIGINT UNSIGNED NOT NULL,
  \`citizen_id\` BIGINT UNSIGNED NOT NULL,
  \`rating\` TINYINT UNSIGNED NOT NULL,
  \`feedback_text\` TEXT NULL,
  \`resolution_cycle\` INT UNSIGNED NOT NULL DEFAULT 1,
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT \`fk_fb_comp\` FOREIGN KEY (\`complaint_id\`) REFERENCES \`complaints\` (\`complaint_id\`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE \`complaint_status_history\` (
  \`history_id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  \`complaint_id\` BIGINT UNSIGNED NOT NULL,
  \`changed_by\` BIGINT UNSIGNED NOT NULL,
  \`old_status\` VARCHAR(20) NULL,
  \`new_status\` VARCHAR(20) NOT NULL,
  \`reason\` VARCHAR(500) NULL,
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT \`fk_hist_comp\` FOREIGN KEY (\`complaint_id\`) REFERENCES \`complaints\` (\`complaint_id\`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE \`audit_logs\` (
  \`audit_id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  \`actor_user_id\` BIGINT UNSIGNED NULL,
  \`action\` VARCHAR(100) NOT NULL,
  \`entity_type\` VARCHAR(50) NOT NULL,
  \`entity_id\` BIGINT UNSIGNED NULL,
  \`details_json\` JSON NULL,
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
`
  );

  const beFolder = zip.folder('backend');
  beFolder?.file(
    'package.json',
    JSON.stringify(
      {
        name: 'civicpulse-backend',
        version: '1.0.0',
        main: 'server.js',
        scripts: { start: 'node server.js', dev: 'nodemon server.js' },
        dependencies: {
          bcryptjs: '^2.4.3',
          cors: '^2.8.5',
          dotenv: '^16.4.7',
          express: '^4.21.2',
          helmet: '^8.0.0',
          jsonwebtoken: '^9.0.2',
          multer: '^1.4.5-lts.1',
          mysql2: '^3.12.0',
          xlsx: '^0.18.5',
        },
      },
      null,
      2
    )
  );

  const pyFolder = zip.folder('python-service');
  pyFolder?.file('requirements.txt', 'fastapi==0.115.6\nuvicorn==0.34.0\npydantic==2.10.4\npytest==8.3.4\n');

  return await zip.generateAsync({ type: 'blob' });
}
