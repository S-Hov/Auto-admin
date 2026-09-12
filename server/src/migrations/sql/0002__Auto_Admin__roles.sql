CREATE TABLE IF NOT EXISTS Auto_Admin__roles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `key` VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    rights ENUM('full', 'read_only', 'manager', 'none', 'custom') NOT NULL DEFAULT 'read_only',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;