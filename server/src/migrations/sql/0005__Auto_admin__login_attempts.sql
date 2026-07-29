CREATE TABLE IF NOT EXISTS Auto_Admin__login_attempts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_user_ip_time (username, ip_address, created_at),
    INDEX idx_ip_time (ip_address, created_at)
);
