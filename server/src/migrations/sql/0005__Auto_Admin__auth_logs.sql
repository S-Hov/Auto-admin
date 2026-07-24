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