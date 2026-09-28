CREATE TABLE IF NOT EXISTS Auto_Admin__indexes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    resource_id BIGINT UNSIGNED NOT NULL,
    index_name VARCHAR(64) NOT NULL COLLATE utf8mb4_bin,
    is_unique BOOLEAN NOT NULL,
    index_type VARCHAR(64) NOT NULL,
    is_visible BOOLEAN NOT NULL,
    comment TEXT NULL,
    state ENUM('present', 'missing') NOT NULL DEFAULT 'present',
    first_seen_scan_id BIGINT UNSIGNED NOT NULL,
    last_seen_scan_id BIGINT UNSIGNED NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE KEY uq_indexes (resource_id, index_name),

    CONSTRAINT fk_indexes_resource FOREIGN KEY (resource_id)
        REFERENCES Auto_Admin__resources(id) ON DELETE CASCADE,
    
    CONSTRAINT fk_indexes_first_seen FOREIGN KEY (first_seen_scan_id)
        REFERENCES Auto_Admin__schema_scans(id) ON DELETE RESTRICT,
    
    CONSTRAINT fk_indexes_last_seen FOREIGN KEY (last_seen_scan_id)
        REFERENCES Auto_Admin__schema_scans(id) ON DELETE RESTRICT,

    INDEX idx_resource_id_state (resource_id, state)
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;