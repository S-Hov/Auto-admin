INSERT INTO Auto_Admin__roles (`key`, name, rights)
VALUES
    ('user', 'User', 'read_only'),
    ('manager', 'Manager', 'manager'),
    ('admin', 'Admin', 'full')
ON DUPLICATE KEY UPDATE 
    name = VALUES(name),
    rights = VALUES(rights);
