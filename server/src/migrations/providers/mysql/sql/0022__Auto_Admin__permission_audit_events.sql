CREATE TABLE IF NOT EXISTS Auto_Admin__permission_audit_events (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    actor_user_id BIGINT UNSIGNED NULL,
    subject_type ENUM('role', 'user') NOT NULL,
    subject_id BIGINT UNSIGNED NOT NULL,
    target_type ENUM('resource', 'field') NOT NULL,
    target_id BIGINT UNSIGNED NOT NULL,
    `action` VARCHAR(16) NOT NULL,
    previous_effect ENUM('allow', 'deny') NULL,
    new_effect ENUM('allow', 'deny') NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    request_id VARCHAR(64) NULL,

    INDEX idx_permission_audit_actor_created (actor_user_id, created_at),
    INDEX idx_permission_audit_subject (subject_type, subject_id, created_at),
    INDEX idx_permission_audit_target (target_type, target_id, created_at),
    INDEX idx_permission_audit_created_at (created_at),

    CONSTRAINT fk_permission_audit_actor FOREIGN KEY (actor_user_id)
        REFERENCES Auto_Admin__users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;
