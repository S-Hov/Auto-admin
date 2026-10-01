CREATE TABLE IF NOT EXISTS Auto_Admin__user_resource_permissions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    resource_id BIGINT UNSIGNED NOT NULL,
    `action` ENUM('read', 'create', 'update', 'delete') NOT NULL,
    effect ENUM('allow', 'deny') NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE KEY uq_user_resource_permission (user_id, resource_id, `action`),
    INDEX idx_user_resource_permissions_resource (resource_id),

    CONSTRAINT fk_user_resource_permissions_user FOREIGN KEY (user_id)
        REFERENCES Auto_Admin__users(id) ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT fk_user_resource_permissions_resource FOREIGN KEY (resource_id)
        REFERENCES Auto_Admin__resources(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;
