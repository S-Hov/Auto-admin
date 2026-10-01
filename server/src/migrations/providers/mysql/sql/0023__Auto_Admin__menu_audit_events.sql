CREATE TABLE IF NOT EXISTS Auto_Admin__menu_audit_events (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    menu_id BIGINT UNSIGNED NOT NULL,
    action ENUM('create', 'update', 'delete', 'permission') NOT NULL,
    actor_user_id BIGINT UNSIGNED NULL,
    previous_value JSON NOT NULL,
    new_value JSON NOT NULL,
    request_id VARCHAR(64) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX idx_menu_audit_item_created (menu_id, created_at),
    CONSTRAINT fk_menu_audit_actor FOREIGN KEY (actor_user_id)
        REFERENCES Auto_Admin__users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
