CREATE TABLE IF NOT EXISTS Auto_Admin__pages (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    config JSON NOT NULL,
    revision INT UNSIGNED NOT NULL DEFAULT 1,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    created_by BIGINT UNSIGNED NULL,
    updated_by BIGINT UNSIGNED NULL,

    CONSTRAINT chk_pages_revision CHECK (revision >= 1),
    CONSTRAINT chk_pages_config_object CHECK (JSON_TYPE(config) = 'OBJECT'),
    CONSTRAINT fk_pages_created_by FOREIGN KEY (created_by)
        REFERENCES Auto_Admin__users(id) ON DELETE SET NULL,
    CONSTRAINT fk_pages_updated_by FOREIGN KEY (updated_by)
        REFERENCES Auto_Admin__users(id) ON DELETE SET NULL,

    INDEX idx_pages_created_by (created_by),
    INDEX idx_pages_updated_by (updated_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
