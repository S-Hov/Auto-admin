CREATE TABLE IF NOT EXISTS Auto_Admin__fields (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    resource_id BIGINT UNSIGNED NOT NULL,
    column_name VARCHAR(64) NOT NULL COLLATE utf8mb4_bin,
    ordinal_position INT UNSIGNED NOT NULL,
    data_type VARCHAR(64) NOT NULL,
    column_type TEXT NOT NULL,
    is_nullable BOOLEAN NOT NULL,
    default_value TEXT NULL,
    character_maximum_length BIGINT UNSIGNED NULL,
    numeric_precision INT UNSIGNED NULL,
    numeric_scale INT UNSIGNED NULL,
    datetime_precision INT UNSIGNED NULL,
    character_set_name VARCHAR(64) NULL,
    collation_name VARCHAR(64) NULL,
    is_auto_increment BOOLEAN NOT NULL DEFAULT FALSE,
    is_generated BOOLEAN NOT NULL DEFAULT FALSE,
    generation_expression LONGTEXT NULL,
    extra VARCHAR(255) NOT NULL DEFAULT '',
    comment TEXT NULL,
    state ENUM('present', 'missing') DEFAULT 'present',
    first_seen_scan_id BIGINT UNSIGNED NOT NULL,
    last_seen_scan_id BIGINT UNSIGNED NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE KEY uq_fields (resource_id, column_name),

    CONSTRAINT fk_fields_resource FOREIGN KEY (resource_id)
        REFERENCES Auto_Admin__resources(id) ON DELETE RESTRICT,

    CONSTRAINT fk_fields_first_seen FOREIGN KEY (first_seen_scan_id)
        REFERENCES Auto_Admin__schema_scans(id) ON DELETE RESTRICT,
    
    CONSTRAINT fk_fields_last_seen FOREIGN KEY (last_seen_scan_id)
        REFERENCES Auto_Admin__schema_scans(id) ON DELETE RESTRICT,

    INDEX idx_resource_id_state_ordinal (resource_id, state, ordinal_position)
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;
