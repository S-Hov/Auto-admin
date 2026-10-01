CREATE TABLE IF NOT EXISTS Auto_Admin__role_field_permissions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    role_id BIGINT UNSIGNED NOT NULL,
    field_id BIGINT UNSIGNED NOT NULL,
    `action` ENUM('read', 'create', 'update') NOT NULL,
    effect ENUM('allow', 'deny') NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE KEY uq_role_field_permission (role_id, field_id, `action`),
    INDEX idx_role_field_permissions_field (field_id),

    CONSTRAINT fk_role_field_permissions_role FOREIGN KEY (role_id)
        REFERENCES Auto_Admin__roles(id) ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT fk_role_field_permissions_field FOREIGN KEY (field_id)
        REFERENCES Auto_Admin__fields(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;
