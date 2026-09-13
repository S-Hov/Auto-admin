CREATE TABLE IF NOT EXISTS Auto_Admin__constraint_fields (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    constraint_id BIGINT UNSIGNED NOT NULL,
    ordinal_position INT UNSIGNED NOT NULL,
    field_id BIGINT UNSIGNED NOT NULL,
    referenced_field_id BIGINT UNSIGNED NULL,
    referenced_column_name VARCHAR(64) NULL COLLATE utf8mb4_bin,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE KEY uq_constraint_fields_ordinal (constraint_id, ordinal_position),
    UNIQUE KEY uq_constraint_fields_field (constraint_id, field_id),

    CONSTRAINT fk_constraint_fields_constraint FOREIGN KEY (constraint_id)
        REFERENCES Auto_Admin__constraints(id) ON DELETE CASCADE,

    CONSTRAINT fk_constraint_fields_field FOREIGN KEY (field_id)
        REFERENCES Auto_Admin__fields(id) ON DELETE RESTRICT,

    CONSTRAINT fk_constraint_fields_referenced_field FOREIGN KEY (referenced_field_id)
        REFERENCES Auto_Admin__fields(id) ON DELETE SET NULL,

    INDEX idx_field_id (field_id),
    INDEX idx_referenced_field_id (referenced_field_id)
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;