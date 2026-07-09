INSERT INTO Auto_Admin__roles (key, name)
VALUES
    ('user', 'User', 'read_only'),
    ('manager', 'Manager', 'manager'),
    ('admin', 'Admin', 'full')
ON CONFLICT (key) DO UPDATE
SET name = EXCLUDED.name;
