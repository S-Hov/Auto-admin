CREATE TABLE IF NOT EXISTS Auto_Admin__user_field_permissions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    field_id BIGINT UNSIGNED NOT NULL,
    `action` ENUM('read', 'create', 'update') NOT NULL,
    effect ENUM('allow', 'deny') NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE KEY uq_user_field_permission (user_id, field_id, `action`),
    INDEX idx_user_field_permissions_field (field_id),

    CONSTRAINT fk_user_field_permissions_user FOREIGN KEY (user_id)
        REFERENCES Auto_Admin__users(id) ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT fk_user_field_permissions_field FOREIGN KEY (field_id)
        REFERENCES Auto_Admin__fields(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;
