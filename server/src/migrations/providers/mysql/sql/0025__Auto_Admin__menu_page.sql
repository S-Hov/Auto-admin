ALTER TABLE Auto_Admin__menu
    ADD COLUMN page_id BIGINT UNSIGNED NULL,
    ADD INDEX idx_menu_page (page_id),
    ADD CONSTRAINT fk_menu_page FOREIGN KEY (page_id)
        REFERENCES Auto_Admin__pages(id) ON DELETE RESTRICT;
