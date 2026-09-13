CREATE TABLE IF NOT EXISTS Auto_Admin__constraints (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    resource_id BIGINT UNSIGNED NOT NULL,
    constraint_name VARCHAR(64) NOT NULL COLLATE utf8mb4_bin,
    constraint_type ENUM('primary', 'unique', 'foreign') NOT NULL,
    referenced_schema_name VARCHAR(64) NULL COLLATE utf8mb4_bin,
    referenced_table_name VARCHAR(64) NULL COLLATE utf8mb4_bin,
    referenced_resource_id BIGINT UNSIGNED NULL,
    on_update ENUM('NO ACTION', 'RESTRICT', 'CASCADE', 'SET NULL', 'SET DEFAULT') NULL,
    on_delete ENUM('NO ACTION', 'RESTRICT', 'CASCADE', 'SET NULL', 'SET DEFAULT') NULL,
    state ENUM('present', 'missing') NOT NULL DEFAULT 'present',
    first_seen_scan_id BIGINT UNSIGNED NOT NULL,
    last_seen_scan_id BIGINT UNSIGNED NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE KEY uq_constraints (resource_id, constraint_name),

    CONSTRAINT fk_constraints_resource FOREIGN KEY (resource_id)
        REFERENCES Auto_Admin__resources(id) ON DELETE CASCADE,

    CONSTRAINT fk_constraints_referenced_resource FOREIGN KEY (referenced_resource_id)
        REFERENCES Auto_Admin__resources(id) ON DELETE SET NULL,
    
    CONSTRAINT fk_constraints_first_seen FOREIGN KEY (first_seen_scan_id)
        REFERENCES Auto_Admin__schema_scans(id) ON DELETE RESTRICT,
    
    CONSTRAINT fk_constraints_last_seen FOREIGN KEY (last_seen_scan_id)
        REFERENCES Auto_Admin__schema_scans(id) ON DELETE RESTRICT,

    INDEX idx_resource_id_state (resource_id, state),
    INDEX idx_referenced_resource (referenced_resource_id)
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;