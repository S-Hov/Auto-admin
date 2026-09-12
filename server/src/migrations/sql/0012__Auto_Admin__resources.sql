CREATE TABLE IF NOT EXISTS Auto_Admin__resources (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    schema_name VARCHAR(64) NOT NULL COLLATE utf8mb4_bin,
    table_name VARCHAR(64) NOT NULL COLLATE utf8mb4_bin,
    object_type ENUM('table', 'view') NOT NULL,
    engine VARCHAR(64) NULL,
    comment TEXT NULL,
    is_service BOOLEAN NOT NULL DEFAULT FALSE,
    state ENUM('present', 'missing') NOT NULL DEFAULT 'present',
    first_seen_scan_id BIGINT UNSIGNED NOT NULL,
    last_seen_scan_id BIGINT UNSIGNED NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE KEY uq_resources (schema_name, table_name),

    CONSTRAINT fk_resources_first_seen FOREIGN KEY (first_seen_scan_id)
        REFERENCES Auto_Admin__schema_scans(id) ON DELETE RESTRICT,
    
    CONSTRAINT fk_resources_last_seen FOREIGN KEY (last_seen_scan_id)
        REFERENCES Auto_Admin__schema_scans(id) ON DELETE RESTRICT,

    INDEX idx_state_is_service (state, is_service)
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;
