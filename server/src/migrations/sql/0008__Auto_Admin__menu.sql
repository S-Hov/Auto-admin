CREATE TABLE IF NOT EXISTS Auto_Admin__menu (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    parent_id BIGINT UNSIGNED NULL,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(150) NOT NULL,
    icon VARCHAR(255) NULL,
    icon_type ENUM('icon', 'svg', 'image', 'video') NOT NULL DEFAULT 'icon',
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by BIGINT UNSIGNED NULL,

    CONSTRAINT fk_menu_parent FOREIGN KEY (parent_id) 
        REFERENCES Auto_Admin__menu(id) ON DELETE CASCADE,
    CONSTRAINT fk_menu_updated_by FOREIGN KEY (updated_by) 
        REFERENCES Auto_Admin__users(id) ON DELETE SET NULL,
        
    INDEX idx_menu_parent_order (parent_id, sort_order)
);