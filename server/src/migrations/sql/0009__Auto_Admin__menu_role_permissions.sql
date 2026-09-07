CREATE TABLE IF NOT EXISTS Auto_Admin__menu_role_permissions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    menu_id BIGINT UNSIGNED NOT NULL,
    role_id BIGINT UNSIGNED NOT NULL,
    
    can_view BOOLEAN NOT NULL DEFAULT FALSE,
    can_create BOOLEAN NOT NULL DEFAULT FALSE,
    can_update BOOLEAN NOT NULL DEFAULT FALSE,
    can_delete BOOLEAN NOT NULL DEFAULT FALSE,

    CONSTRAINT fk_menu_role_perm_menu FOREIGN KEY (menu_id) 
        REFERENCES Auto_Admin__menu(id) ON DELETE CASCADE,
    CONSTRAINT fk_menu_role_perm_role FOREIGN KEY (role_id) 
        REFERENCES Auto_Admin__roles(id) ON DELETE CASCADE,
        
    UNIQUE KEY uq_menu_role (menu_id, role_id)
);