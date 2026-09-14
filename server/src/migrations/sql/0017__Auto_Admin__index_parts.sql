CREATE TABLE IF NOT EXISTS Auto_Admin__index_parts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    index_id BIGINT UNSIGNED NOT NULL,
    ordinal_position INT UNSIGNED NOT NULL,
    field_id BIGINT UNSIGNED NULL,
    expression LONGTEXT COLLATE utf8mb4_bin NULL,
    prefix_length INT UNSIGNED NULL,
    sort_direction ENUM('ASC', 'DESC') NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE KEY uq_index_parts_by_index_position (index_id, ordinal_position),
    
    CONSTRAINT fk_index_parts_index FOREIGN KEY (index_id)
        REFERENCES Auto_Admin__indexes(id) ON DELETE CASCADE,
        
    CONSTRAINT fk_index_parts_field FOREIGN KEY (field_id)
        REFERENCES Auto_Admin__fields(id) ON DELETE RESTRICT,
    
    CONSTRAINT chk_index_parts_source CHECK ((field_id IS NOT NULL AND expression IS NULL) OR (field_id IS NULL AND expression IS NOT NULL AND CHAR_LENGTH(TRIM(expression)) > 0))
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;