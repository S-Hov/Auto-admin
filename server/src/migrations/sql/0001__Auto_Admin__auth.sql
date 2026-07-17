CREATE TABLE IF NOT EXISTS Auto_Admin__roles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `key` VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    rights ENUM('full', 'read_only', 'manager', 'none', 'custom') NOT NULL DEFAULT 'read_only',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Auto_Admin__users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    role_id BIGINT UNSIGNED NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES Auto_Admin__roles(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_users_role_id (role_id)
);

CREATE TABLE IF NOT EXISTS Auto_Admin__auth_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NULL,
    event_type VARCHAR(50) NOT NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_auth_logs_user FOREIGN KEY (user_id) REFERENCES Auto_Admin__users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_auth_logs_user_id (user_id),
    INDEX idx_auth_logs_created_at (created_at)
);