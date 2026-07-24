CREATE TABLE IF NOT EXISTS Auto_Admin__installation (
    id INT NOT NULL DEFAULT 1,
    status ENUM('new', 'migrated', 'ready') NOT NULL DEFAULT 'new',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT chk_only_one_row CHECK (id = 1)
);