CREATE TABLE IF NOT EXISTS Auto_Admin__menu_user_permissions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    menu_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    
    can_view BOOLEAN NOT NULL DEFAULT FALSE,
    can_create BOOLEAN NOT NULL DEFAULT FALSE,
    can_update BOOLEAN NOT NULL DEFAULT FALSE,
    can_delete BOOLEAN NOT NULL DEFAULT FALSE,

    CONSTRAINT fk_menu_user_perm_menu FOREIGN KEY (menu_id) 
        REFERENCES Auto_Admin__menu(id) ON DELETE CASCADE,
    CONSTRAINT fk_menu_user_perm_user FOREIGN KEY (user_id) 
        REFERENCES Auto_Admin__users(id) ON DELETE CASCADE,
        
    UNIQUE KEY uq_menu_user (menu_id, user_id)
);