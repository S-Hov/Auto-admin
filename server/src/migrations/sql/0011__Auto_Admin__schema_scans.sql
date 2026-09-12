CREATE TABLE IF NOT EXISTS Auto_Admin__schema_scans (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    status ENUM('running', 'succeeded', 'failed') NOT NULL,
    schema_name VARCHAR(64) NOT NULL,
    started_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    finished_at DATETIME(3) NULL,
    snapshot_fingerprint CHAR(64) NULL,
    added_resources INT UNSIGNED NOT NULL DEFAULT 0,
    changed_resources INT UNSIGNED NOT NULL DEFAULT 0,
    missing_resources INT UNSIGNED NOT NULL DEFAULT 0,
    added_fields INT UNSIGNED NOT NULL DEFAULT 0,
    changed_fields INT UNSIGNED NOT NULL DEFAULT 0,
    missing_fields INT UNSIGNED NOT NULL DEFAULT 0,
    error_code VARCHAR(128) NULL,
    created_by BIGINT UNSIGNED NULL,

    CONSTRAINT fk_schema_scans_created_by FOREIGN KEY (created_by)
        REFERENCES Auto_Admin__users(id) ON DELETE SET NULL,

    INDEX idx_schema_scans_status_started_at (status, started_at)
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;