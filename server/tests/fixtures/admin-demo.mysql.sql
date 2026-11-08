-- Демонстрационная база для ручной проверки Auto Admin на MySQL 8.4.
-- Импорт из корня проекта:
-- docker compose exec -T mysql mysql --default-character-set=utf8mb4 -uroot -proot < server/tests/fixtures/admin-demo.mysql.sql
-- В настройках Auto Admin выберите базу auto_admin_demo и запустите сканирование схемы.
-- При повторном импорте клиент mysql без --force остановится на CREATE DATABASE.
-- Для нового экземпляра замените имя базы в CREATE DATABASE и USE.
-- Все данные синтетические. Заполнение детерминировано и не требует внешних файлов.

CREATE DATABASE auto_admin_demo CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE auto_admin_demo;
SET NAMES utf8mb4;

-- Клиенты, адреса и сотрудники.

CREATE TABLE countries (
    code CHAR(2) PRIMARY KEY,
    name VARCHAR(80) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE cities (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    country_code CHAR(2) NOT NULL,
    name VARCHAR(100) NOT NULL,
    UNIQUE KEY uq_city (country_code, name),
    FOREIGN KEY (country_code) REFERENCES countries (code)
) ENGINE=InnoDB;

CREATE TABLE customers (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(180) NOT NULL UNIQUE,
    display_name VARCHAR(120) NOT NULL,
    phone VARCHAR(32),
    segment ENUM('retail', 'business', 'vip') NOT NULL DEFAULT 'retail',
    marketing_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
    birth_date DATE,
    preferences JSON,
    notes TEXT,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX ix_customers_segment_date (segment, created_at DESC, id)
) ENGINE=InnoDB COMMENT='Клиенты интернет-магазина';

CREATE TABLE customer_addresses (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_id INT UNSIGNED NOT NULL,
    city_id INT UNSIGNED NOT NULL,
    address_line VARCHAR(180) NOT NULL,
    postal_code VARCHAR(16) NOT NULL,
    kind ENUM('home', 'office', 'pickup') NOT NULL,
    delivery_note VARCHAR(255),
    UNIQUE KEY uq_customer_address (customer_id, id),
    FOREIGN KEY (customer_id) REFERENCES customers (id),
    FOREIGN KEY (city_id) REFERENCES cities (id)
) ENGINE=InnoDB;

CREATE TABLE customer_tags (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(80) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE customer_tag_links (
    customer_id INT UNSIGNED NOT NULL,
    tag_id INT UNSIGNED NOT NULL,
    PRIMARY KEY (customer_id, tag_id),
    FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES customer_tags (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE staff (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    manager_id INT UNSIGNED,
    display_name VARCHAR(120) NOT NULL,
    email VARCHAR(180) NOT NULL UNIQUE,
    department ENUM('operations', 'warehouse', 'support', 'finance') NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    FOREIGN KEY (manager_id) REFERENCES staff (id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Каталог, поставщики и склад.

CREATE TABLE categories (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    parent_id INT UNSIGNED,
    slug VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    FOREIGN KEY (parent_id) REFERENCES categories (id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE brands (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL UNIQUE,
    website VARCHAR(255)
) ENGINE=InnoDB;

CREATE TABLE suppliers (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    country_code CHAR(2) NOT NULL,
    company_name VARCHAR(160) NOT NULL UNIQUE,
    contact_email VARCHAR(180),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    FOREIGN KEY (country_code) REFERENCES countries (code)
) ENGINE=InnoDB;

CREATE TABLE products (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    brand_id INT UNSIGNED NOT NULL,
    slug VARCHAR(150) NOT NULL UNIQUE,
    name VARCHAR(180) NOT NULL,
    description TEXT,
    status ENUM('draft', 'active', 'archived') NOT NULL DEFAULT 'draft',
    metadata JSON,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX ix_products_status_name (status, name),
    FULLTEXT KEY ft_products_text (name, description),
    FOREIGN KEY (brand_id) REFERENCES brands (id)
) ENGINE=InnoDB;

CREATE TABLE product_variants (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id INT UNSIGNED NOT NULL,
    sku VARCHAR(40) NOT NULL UNIQUE,
    color VARCHAR(40) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    weight_kg DECIMAL(7,3),
    barcode BINARY(8) UNIQUE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE KEY uq_product_color (product_id, color),
    FOREIGN KEY (product_id) REFERENCES products (id)
) ENGINE=InnoDB;

CREATE TABLE product_categories (
    product_id INT UNSIGNED NOT NULL,
    category_id INT UNSIGNED NOT NULL,
    PRIMARY KEY (product_id, category_id),
    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE product_suppliers (
    product_id INT UNSIGNED NOT NULL,
    supplier_id INT UNSIGNED NOT NULL,
    supplier_sku VARCHAR(40) NOT NULL,
    unit_cost DECIMAL(10,2) NOT NULL CHECK (unit_cost >= 0),
    lead_days SMALLINT UNSIGNED NOT NULL,
    PRIMARY KEY (product_id, supplier_id),
    UNIQUE KEY uq_supplier_sku (supplier_id, supplier_sku),
    FOREIGN KEY (product_id) REFERENCES products (id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
) ENGINE=InnoDB;

CREATE TABLE warehouses (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    city_id INT UNSIGNED NOT NULL,
    manager_id INT UNSIGNED,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    opened_on DATE NOT NULL,
    FOREIGN KEY (city_id) REFERENCES cities (id),
    FOREIGN KEY (manager_id) REFERENCES staff (id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE warehouse_stock (
    warehouse_id INT UNSIGNED NOT NULL,
    variant_id INT UNSIGNED NOT NULL,
    on_hand INT UNSIGNED NOT NULL DEFAULT 0,
    reserved INT UNSIGNED NOT NULL DEFAULT 0,
    available INT GENERATED ALWAYS AS (on_hand - reserved) STORED,
    bin_code VARCHAR(24),
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (warehouse_id, variant_id),
    CHECK (reserved <= on_hand),
    FOREIGN KEY (warehouse_id) REFERENCES warehouses (id),
    FOREIGN KEY (variant_id) REFERENCES product_variants (id)
) ENGINE=InnoDB;

CREATE TABLE stock_movements (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    warehouse_id INT UNSIGNED NOT NULL,
    variant_id INT UNSIGNED NOT NULL,
    staff_id INT UNSIGNED,
    reason ENUM('receipt', 'sale', 'return', 'adjustment') NOT NULL,
    quantity_delta INT NOT NULL CHECK (quantity_delta <> 0),
    occurred_at DATETIME NOT NULL,
    INDEX ix_stock_movement_date (warehouse_id, variant_id, occurred_at DESC),
    FOREIGN KEY (warehouse_id, variant_id) REFERENCES warehouse_stock (warehouse_id, variant_id),
    FOREIGN KEY (staff_id) REFERENCES staff (id) ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='Исторические операции по складу';

-- Заказы, оплата, доставка и возвраты.

CREATE TABLE coupons (
    code VARCHAR(30) PRIMARY KEY,
    percent_off DECIMAL(5,2) NOT NULL CHECK (percent_off BETWEEN 0.01 AND 100),
    starts_on DATE NOT NULL,
    ends_on DATE NOT NULL,
    CHECK (ends_on >= starts_on)
) ENGINE=InnoDB;

CREATE TABLE sales_channels (
    code VARCHAR(16) PRIMARY KEY,
    name VARCHAR(80) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE orders (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_number VARCHAR(28) NOT NULL UNIQUE,
    customer_id INT UNSIGNED NOT NULL,
    address_id INT UNSIGNED NOT NULL,
    channel_code VARCHAR(16) NOT NULL,
    coupon_code VARCHAR(30),
    status ENUM('pending', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded') NOT NULL DEFAULT 'pending',
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    shipping_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(12,2) GENERATED ALWAYS AS (subtotal - discount_amount + shipping_fee) STORED,
    currency CHAR(3) NOT NULL DEFAULT 'RUB',
    customer_comment TEXT,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    CHECK (subtotal >= 0 AND discount_amount BETWEEN 0 AND subtotal AND shipping_fee >= 0),
    INDEX ix_orders_status_date (status, created_at DESC, id DESC),
    INDEX ix_orders_customer_date (customer_id, created_at DESC),
    FOREIGN KEY (customer_id, address_id) REFERENCES customer_addresses (customer_id, id),
    FOREIGN KEY (channel_code) REFERENCES sales_channels (code),
    FOREIGN KEY (coupon_code) REFERENCES coupons (code) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE order_items (
    order_id BIGINT UNSIGNED NOT NULL,
    line_no SMALLINT UNSIGNED NOT NULL,
    variant_id INT UNSIGNED NOT NULL,
    quantity SMALLINT UNSIGNED NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    line_total DECIMAL(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    PRIMARY KEY (order_id, line_no),
    FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
    FOREIGN KEY (variant_id) REFERENCES product_variants (id)
) ENGINE=InnoDB;

CREATE TABLE order_status_history (
    order_id BIGINT UNSIGNED NOT NULL,
    step_no SMALLINT UNSIGNED NOT NULL,
    status ENUM('pending', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded') NOT NULL,
    changed_at DATETIME(3) NOT NULL,
    PRIMARY KEY (order_id, step_no),
    INDEX ix_history_date (changed_at),
    FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE payment_methods (
    code VARCHAR(16) PRIMARY KEY,
    name VARCHAR(80) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE payments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT UNSIGNED NOT NULL,
    method_code VARCHAR(16) NOT NULL,
    provider_reference VARCHAR(50) UNIQUE,
    status ENUM('authorized', 'captured', 'failed', 'refunded') NOT NULL,
    amount DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
    failure_message VARCHAR(255),
    details JSON,
    created_at DATETIME NOT NULL,
    INDEX ix_payments_order_date (order_id, created_at),
    FOREIGN KEY (order_id) REFERENCES orders (id),
    FOREIGN KEY (method_code) REFERENCES payment_methods (code)
) ENGINE=InnoDB;

CREATE TABLE carriers (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE shipments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT UNSIGNED NOT NULL,
    warehouse_id INT UNSIGNED NOT NULL,
    carrier_id INT UNSIGNED NOT NULL,
    tracking_number VARCHAR(50) NOT NULL UNIQUE,
    status ENUM('in_transit', 'delivered') NOT NULL,
    shipped_at DATETIME NOT NULL,
    delivered_at DATETIME,
    UNIQUE KEY uq_shipment_order (order_id, id),
    CHECK (delivered_at IS NULL OR delivered_at >= shipped_at),
    FOREIGN KEY (order_id) REFERENCES orders (id),
    FOREIGN KEY (warehouse_id) REFERENCES warehouses (id),
    FOREIGN KEY (carrier_id) REFERENCES carriers (id)
) ENGINE=InnoDB;

CREATE TABLE shipment_items (
    order_id BIGINT UNSIGNED NOT NULL,
    shipment_id BIGINT UNSIGNED NOT NULL,
    line_no SMALLINT UNSIGNED NOT NULL,
    quantity SMALLINT UNSIGNED NOT NULL CHECK (quantity > 0),
    PRIMARY KEY (order_id, shipment_id, line_no),
    FOREIGN KEY (order_id, shipment_id) REFERENCES shipments (order_id, id) ON DELETE CASCADE,
    FOREIGN KEY (order_id, line_no) REFERENCES order_items (order_id, line_no)
) ENGINE=InnoDB;

CREATE TABLE return_reasons (
    code VARCHAR(20) PRIMARY KEY,
    label VARCHAR(100) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE returns (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT UNSIGNED NOT NULL UNIQUE,
    reason_code VARCHAR(20) NOT NULL,
    status ENUM('requested', 'approved', 'rejected', 'completed') NOT NULL,
    requested_at DATETIME NOT NULL,
    resolved_at DATETIME,
    UNIQUE KEY uq_return_order (order_id, id),
    CHECK (resolved_at IS NULL OR resolved_at >= requested_at),
    FOREIGN KEY (order_id) REFERENCES orders (id),
    FOREIGN KEY (reason_code) REFERENCES return_reasons (code)
) ENGINE=InnoDB;

CREATE TABLE return_items (
    order_id BIGINT UNSIGNED NOT NULL,
    return_id BIGINT UNSIGNED NOT NULL,
    line_no SMALLINT UNSIGNED NOT NULL,
    quantity SMALLINT UNSIGNED NOT NULL CHECK (quantity > 0),
    PRIMARY KEY (order_id, return_id, line_no),
    FOREIGN KEY (order_id, return_id) REFERENCES returns (order_id, id) ON DELETE CASCADE,
    FOREIGN KEY (order_id, line_no) REFERENCES order_items (order_id, line_no)
) ENGINE=InnoDB;

CREATE TABLE reviews (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_id INT UNSIGNED NOT NULL,
    product_id INT UNSIGNED NOT NULL,
    rating TINYINT UNSIGNED NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title VARCHAR(140),
    body TEXT,
    status ENUM('pending', 'published', 'hidden') NOT NULL,
    submitted_at DATETIME NOT NULL,
    UNIQUE KEY uq_review_customer_product (customer_id, product_id),
    INDEX ix_reviews_product_status (product_id, status, submitted_at DESC),
    FOREIGN KEY (customer_id) REFERENCES customers (id),
    FOREIGN KEY (product_id) REFERENCES products (id)
) ENGINE=InnoDB;

-- Поддержка, аудит и интеграции.

CREATE TABLE support_queues (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    sla_hours SMALLINT UNSIGNED NOT NULL
) ENGINE=InnoDB;

CREATE TABLE support_tickets (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_id INT UNSIGNED NOT NULL,
    order_id BIGINT UNSIGNED,
    queue_id INT UNSIGNED NOT NULL,
    assignee_id INT UNSIGNED,
    subject VARCHAR(200) NOT NULL,
    status ENUM('open', 'waiting', 'resolved', 'closed') NOT NULL DEFAULT 'open',
    priority ENUM('low', 'normal', 'high', 'urgent') NOT NULL DEFAULT 'normal',
    opened_at DATETIME NOT NULL,
    closed_at DATETIME,
    INDEX ix_ticket_queue_status_date (queue_id, status, opened_at DESC),
    FOREIGN KEY (customer_id) REFERENCES customers (id),
    FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE SET NULL,
    FOREIGN KEY (queue_id) REFERENCES support_queues (id),
    FOREIGN KEY (assignee_id) REFERENCES staff (id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE ticket_messages (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ticket_id BIGINT UNSIGNED NOT NULL,
    sender_staff_id INT UNSIGNED,
    body TEXT NOT NULL,
    is_internal BOOLEAN NOT NULL DEFAULT FALSE,
    sent_at DATETIME NOT NULL,
    INDEX ix_message_ticket_date (ticket_id, sent_at, id),
    FOREIGN KEY (ticket_id) REFERENCES support_tickets (id) ON DELETE CASCADE,
    FOREIGN KEY (sender_staff_id) REFERENCES staff (id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE audit_events (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    actor_id INT UNSIGNED,
    entity_type VARCHAR(40) NOT NULL,
    entity_id BIGINT UNSIGNED NOT NULL,
    event_type VARCHAR(40) NOT NULL,
    payload JSON NOT NULL,
    occurred_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX ix_audit_entity_date (entity_type, entity_id, occurred_at DESC),
    INDEX ix_audit_date (occurred_at DESC, id DESC),
    FOREIGN KEY (actor_id) REFERENCES staff (id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE import_errors (
    batch_code VARCHAR(40) NOT NULL,
    source_line INT UNSIGNED,
    error_message VARCHAR(255) NOT NULL,
    raw_data JSON,
    logged_at DATETIME NOT NULL,
    INDEX ix_import_batch_line (batch_code, source_line)
) ENGINE=InnoDB COMMENT='Таблица без первичного ключа, допускает полные дубликаты';

CREATE TABLE integration_outbox (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    event_type VARCHAR(80) NOT NULL,
    payload JSON NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    published_at DATETIME,
    INDEX ix_outbox_pending (published_at, id)
) ENGINE=InnoDB COMMENT='Изначально пустая таблица для проверки UI и CRUD';

CREATE VIEW v_order_summary AS
SELECT o.id, o.order_number, o.status, o.created_at, c.display_name AS customer_name,
       o.channel_code, o.total_amount, o.currency, s.tracking_number
FROM orders AS o
JOIN customers AS c ON c.id = o.customer_id
LEFT JOIN shipments AS s ON s.order_id = o.id;

CREATE VIEW v_stock_by_variant AS
SELECT v.id AS variant_id, v.sku, p.name AS product_name,
       COUNT(ws.warehouse_id) AS warehouse_count, COALESCE(SUM(ws.available), 0) AS available
FROM product_variants AS v
JOIN products AS p ON p.id = v.product_id
LEFT JOIN warehouse_stock AS ws ON ws.variant_id = v.id
GROUP BY v.id, v.sku, p.name;

CREATE VIEW v_daily_sales AS
SELECT DATE(created_at) AS sales_date, channel_code, currency,
       COUNT(*) AS order_count, SUM(total_amount) AS gross_amount
FROM orders
WHERE status IN ('paid', 'shipped', 'delivered')
GROUP BY DATE(created_at), channel_code, currency;

-- Временная последовательность 1..32000 для генерации строк.

CREATE TEMPORARY TABLE seed_numbers (n INT UNSIGNED PRIMARY KEY);

INSERT INTO seed_numbers (n)
WITH digits (d) AS (
    SELECT 0 UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
    UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9
)
SELECT 1 + a.d + 10 * b.d + 100 * c.d + 1000 * d.d + 10000 * e.d
FROM digits AS a CROSS JOIN digits AS b CROSS JOIN digits AS c
CROSS JOIN digits AS d CROSS JOIN digits AS e
WHERE a.d + 10 * b.d + 100 * c.d + 1000 * d.d + 10000 * e.d < 32000;

SET @demo_previous_time_zone = @@session.time_zone;
SET SESSION time_zone = '+00:00';
START TRANSACTION;

INSERT INTO countries VALUES
    ('RU', 'Россия'), ('AM', 'Հայաստան'), ('KZ', 'Қазақстан'), ('GE', 'საქართველო');

INSERT INTO cities (id, country_code, name) VALUES
    (1, 'RU', 'Москва'), (2, 'RU', 'Санкт-Петербург'), (3, 'RU', 'Казань'),
    (4, 'RU', 'Екатеринбург'), (5, 'RU', 'Новосибирск'), (6, 'AM', 'Երևան'),
    (7, 'AM', 'Գյումրի'), (8, 'KZ', 'Алматы'), (9, 'KZ', 'Астана'),
    (10, 'GE', 'თბილისი'), (11, 'GE', 'ბათუმი'), (12, 'RU', 'Владивосток');

INSERT INTO customers
    (id, email, display_name, phone, segment, marketing_opt_in, birth_date, preferences, notes, created_at)
SELECT n, CONCAT('customer.', n, '@example.test'),
       CONCAT(ELT(1 + MOD(n, 10), 'Анна', 'Лев', 'Софья', 'Илья', 'Арам', 'Мариам',
                  'Zoë', '李雷', 'نور', 'Sam'), ' ',
              ELT(1 + MOD(n DIV 10, 12), 'Волкова', 'Соколов', 'Миронова', 'Григорян',
                  'Алиев', 'О''Нил', 'Núñez', 'Lee', 'Smith', 'Kim', 'De Luca', 'Новак')),
       IF(MOD(n, 7) = 0, NULL, CONCAT('+1 202 555 ', LPAD(100 + MOD(n, 100), 4, '0'))),
       CASE WHEN MOD(n, 17) = 0 THEN 'vip' WHEN MOD(n, 5) = 0 THEN 'business' ELSE 'retail' END,
       MOD(n, 4) = 0,
       IF(MOD(n, 6) = 0, NULL, DATE_ADD('1960-01-01', INTERVAL MOD(n * 29, 16000) DAY)),
       CASE MOD(n, 8)
           WHEN 0 THEN NULL
           WHEN 1 THEN JSON_OBJECT()
           ELSE JSON_OBJECT('language', ELT(1 + MOD(n, 4), 'ru', 'en', 'hy', 'kk'),
                            'notifications', JSON_ARRAY('email', IF(MOD(n, 2) = 0, 'sms', NULL)))
       END,
       CASE MOD(n, 13)
           WHEN 0 THEN ''
           WHEN 1 THEN CONCAT('Первая строка', CHAR(10), 'Вторая строка 🛒')
           WHEN 2 THEN 'Для поиска: 100%_тест, O''Neil, "кавычки", <b>разметка</b>'
           ELSE NULL
       END,
       TIMESTAMPADD(SECOND, MOD(n * 1879, 6000000), '2024-01-01 09:00:00')
FROM seed_numbers WHERE n <= 5000 ORDER BY n;

INSERT INTO customer_addresses (id, customer_id, city_id, address_line, postal_code, kind, delivery_note)
SELECT n, 1 + MOD(n - 1, 5000), 1 + MOD(n * 7, 12),
       CONCAT(ELT(1 + MOD(n, 5), 'ул. Мира', 'пр. Лесной', 'ул. Садовая', 'Oak Street', 'Rue du Parc'),
              ', ', 1 + MOD(n, 180), ', кв. ', 1 + MOD(n * 11, 240)),
       LPAD(MOD(n * 1237, 1000000), 6, '0'),
       IF(n <= 5000, 'home', IF(MOD(n, 2) = 0, 'office', 'pickup')),
       IF(MOD(n, 9) = 0, 'Позвонить перед доставкой', NULL)
FROM seed_numbers WHERE n <= 7500 ORDER BY n;

INSERT INTO customer_tags (id, name) VALUES
    (1, 'Новый клиент'), (2, 'Лояльный'), (3, 'Оптовый'), (4, 'Подарки'),
    (5, 'Самовывоз'), (6, 'Международный'), (7, 'Ранний доступ'), (8, 'Возврат');

INSERT INTO customer_tag_links
SELECT id, 1 + MOD(id, 4) FROM customers WHERE MOD(id, 5) <> 0
UNION ALL
SELECT id, 5 + MOD(id DIV 7, 4) FROM customers WHERE MOD(id, 3) = 0;

INSERT INTO staff (id, display_name, email, department) VALUES
    (1, 'Руководитель операций', 'operations@example.test', 'operations'),
    (2, 'Руководитель склада', 'warehouse@example.test', 'warehouse'),
    (3, 'Руководитель поддержки', 'support@example.test', 'support'),
    (4, 'Руководитель финансов', 'finance@example.test', 'finance');

INSERT INTO staff (id, manager_id, display_name, email, department, active)
SELECT n, 1 + MOD(n, 4), CONCAT('Сотрудник ', n), CONCAT('staff.', n, '@example.test'),
       ELT(1 + MOD(n, 4), 'operations', 'warehouse', 'support', 'finance'), MOD(n, 19) <> 0
FROM seed_numbers WHERE n BETWEEN 5 AND 124 ORDER BY n;

INSERT INTO categories (id, slug, name, sort_order) VALUES
    (1, 'electronics', 'Электроника', 10), (2, 'home', 'Дом и кухня', 20),
    (3, 'sports', 'Спорт', 30), (4, 'books', 'Книги', 40),
    (5, 'office', 'Офис', 50), (6, 'travel', 'Путешествия', 60);

INSERT INTO categories (id, parent_id, slug, name, sort_order) VALUES
    (7, 1, 'audio', 'Аудио', 10), (8, 1, 'accessories', 'Аксессуары', 20),
    (9, 2, 'kitchen', 'Кухонные принадлежности', 10), (10, 2, 'lighting', 'Освещение', 20),
    (11, 3, 'fitness', 'Фитнес', 10), (12, 3, 'outdoor', 'Туризм', 20),
    (13, 4, 'fiction', 'Художественная литература', 10), (14, 4, 'nonfiction', 'Нон-фикшн', 20),
    (15, 5, 'stationery', 'Канцтовары', 10), (16, 5, 'storage', 'Хранение', 20),
    (17, 6, 'luggage', 'Багаж', 10), (18, 6, 'travel-accessories', 'Дорожные аксессуары', 20);

INSERT INTO categories (id, parent_id, slug, name, sort_order) VALUES
    (19, 7, 'headphones', 'Наушники', 10), (20, 7, 'speakers', 'Колонки', 20),
    (21, 9, 'mugs', 'Кружки', 10), (22, 9, 'containers', 'Контейнеры', 20),
    (23, 11, 'yoga', 'Йога', 10), (24, 11, 'training', 'Тренировки', 20),
    (25, 15, 'notebooks', 'Блокноты', 10), (26, 15, 'pens', 'Ручки', 20);

INSERT INTO brands (id, name, website)
SELECT n, CONCAT(ELT(1 + MOD(n, 6), 'Север', 'Контур', 'Орион', 'Atlas', 'Маяк', 'Vega'),
                 ' ', LPAD(n, 2, '0')),
       IF(MOD(n, 4) = 0, NULL, CONCAT('https://brand-', n, '.example.test'))
FROM seed_numbers WHERE n <= 60 ORDER BY n;

INSERT INTO suppliers (id, country_code, company_name, contact_email, active)
SELECT n, ELT(1 + MOD(n, 4), 'RU', 'AM', 'KZ', 'GE'), CONCAT('Поставщик ', LPAD(n, 2, '0')),
       IF(MOD(n, 6) = 0, NULL, CONCAT('supplier.', n, '@example.test')), MOD(n, 13) <> 0
FROM seed_numbers WHERE n <= 80 ORDER BY n;

INSERT INTO products (id, brand_id, slug, name, description, status, metadata, created_at)
SELECT n, 1 + MOD(n * 13, 60), CONCAT('product-', LPAD(n, 5, '0')),
       CONCAT(ELT(1 + MOD(n, 8), 'Наушники', 'Колонка', 'Кружка', 'Контейнер',
                  'Коврик', 'Эспандер', 'Блокнот', 'Ручка'),
              ' ', ELT(1 + MOD(n DIV 8, 4), 'Базовая серия', 'Премиум', 'Лайт', 'Плюс'),
              ' ', LPAD(n, 4, '0')),
       CASE MOD(n, 23)
           WHEN 0 THEN NULL
           WHEN 1 THEN CONCAT('Характеристики:', CHAR(10), REPEAT('Подробное описание товара. ', 100))
           ELSE CONCAT('Серия ', 1 + MOD(n, 30), '. Модель №', n, '.')
       END,
       CASE WHEN MOD(n, 23) = 0 THEN 'draft' WHEN MOD(n, 29) = 0 THEN 'archived' ELSE 'active' END,
       JSON_OBJECT('warranty_months', ELT(1 + MOD(n, 3), 6, 12, 24) + 0,
                   'labels', JSON_ARRAY('demo', IF(MOD(n, 5) = 0, 'bestseller', 'standard')),
                   'dimensions_cm', JSON_OBJECT('width', 4 + MOD(n, 45), 'height', 2 + MOD(n, 26))),
       TIMESTAMPADD(DAY, MOD(n, 600), '2022-01-01 08:00:00')
FROM seed_numbers WHERE n <= 2400 ORDER BY n;

INSERT INTO product_variants (id, product_id, sku, color, unit_price, weight_kg, barcode, active)
SELECT (p.id - 1) * 3 + s.n, p.id, CONCAT('SKU-', LPAD(p.id, 5, '0'), '-', s.n),
       ELT(s.n, 'чёрный', 'белый', 'синий'), 199 + MOD(p.id * 173 + s.n * 37, 50000) / 10,
       IF(MOD(p.id + s.n, 13) = 0, NULL, (50 + MOD(p.id * 37 + s.n, 18000)) / 1000),
       IF(MOD(p.id, 15) = 0, NULL, UNHEX(LPAD(HEX((p.id - 1) * 3 + s.n), 16, '0'))),
       p.status = 'active' AND (s.n < 3 OR MOD(p.id, 17) <> 0)
FROM products AS p CROSS JOIN seed_numbers AS s WHERE s.n <= 3
ORDER BY p.id, s.n;

INSERT INTO product_categories
SELECT id, 19 + MOD(id, 8) FROM products
UNION ALL
SELECT id, 8 + MOD(id DIV 4, 2) * 10 FROM products WHERE MOD(id, 3) = 0;

INSERT INTO product_suppliers
SELECT id, 1 + MOD(id * 17, 80), CONCAT('A-', id), 75 + MOD(id * 71, 30000) / 10, 2 + MOD(id, 25)
FROM products
UNION ALL
SELECT id, 1 + MOD(id * 17 + 19, 80), CONCAT('B-', id), 80 + MOD(id * 79, 30000) / 10, 3 + MOD(id, 30)
FROM products WHERE MOD(id, 3) = 0;

INSERT INTO warehouses (id, city_id, manager_id, code, name, opened_on)
SELECT n, n, IF(MOD(n, 6) = 0, NULL, 5 + 4 * (n - 1)),
       CONCAT('WH-', LPAD(n, 2, '0')), CONCAT('Склад • ', c.name),
       DATE_ADD('2020-01-01', INTERVAL n * 73 DAY)
FROM seed_numbers AS s JOIN cities AS c ON c.id = s.n ORDER BY n;

INSERT INTO warehouse_stock (warehouse_id, variant_id, on_hand, reserved, bin_code, updated_at)
SELECT w.id, v.id, MOD(v.id * 31 + w.id * 17, 251),
       LEAST(MOD(v.id * 31 + w.id * 17, 251), MOD(v.id + w.id, 33)),
       IF(MOD(v.id + w.id, 23) = 0, NULL, CONCAT('A', w.id, '-', LPAD(MOD(v.id, 250), 3, '0'))),
       TIMESTAMPADD(HOUR, MOD(v.id + w.id, 720), '2025-07-01 00:00:00')
FROM warehouses AS w CROSS JOIN product_variants AS v
WHERE MOD(v.id + w.id, 4) <> 0;

INSERT INTO stock_movements (id, warehouse_id, variant_id, staff_id, reason, quantity_delta, occurred_at)
SELECT n, ws.warehouse_id, ws.variant_id,
       IF(MOD(n, 7) = 0, NULL, 5 + 4 * MOD(n DIV 7, 30)),
       ELT(1 + MOD(n, 4), 'receipt', 'sale', 'return', 'adjustment'),
       IF(MOD(n, 2) = 0, 1, -1) * (1 + MOD(CAST(n AS SIGNED) * 7, 48)),
       TIMESTAMPADD(MINUTE, MOD(n * 29, 650000), '2024-03-01 00:00:00')
FROM seed_numbers
JOIN warehouse_stock AS ws
    ON ws.warehouse_id = 1 + MOD(n DIV 11, 12) AND ws.variant_id = 1 + MOD(n * 37, 7200)
WHERE n <= 32000 ORDER BY n;

INSERT INTO coupons VALUES
    ('WELCOME5', 5, '2024-01-01', '2025-12-31'),
    ('SPRING10', 10, '2024-01-01', '2025-12-31'),
    ('PARTNER15', 15, '2024-01-01', '2025-12-31'),
    ('OLD20', 20, '2022-01-01', '2022-12-31');

INSERT INTO sales_channels VALUES
    ('web', 'Интернет-магазин'), ('mobile', 'Мобильное приложение'),
    ('partner', 'Партнёр'), ('phone', 'Заказ по телефону');

INSERT INTO orders
    (id, order_number, customer_id, address_id, channel_code, coupon_code, status,
     shipping_fee, currency, customer_comment, created_at)
WITH order_seed AS (
    SELECT n, 1 + MOD(CRC32(CONCAT('customer:', n)), 5000) AS customer_id,
           MOD(CRC32(CONCAT('state:', n)), 100) AS state_roll
    FROM seed_numbers WHERE n <= 15000
)
SELECT n, CONCAT('ORD-', LPAD(n, 7, '0')), customer_id,
       IF(customer_id <= 2500 AND MOD(n, 3) = 0, customer_id + 5000, customer_id),
       ELT(1 + MOD(n DIV 7, 4), 'web', 'mobile', 'partner', 'phone'),
       IF(MOD(n, 5) = 0, ELT(1 + MOD(n DIV 5, 3), 'WELCOME5', 'SPRING10', 'PARTNER15'), NULL),
       CASE
           WHEN state_roll < 12 THEN 'pending'
           WHEN state_roll < 22 THEN 'paid'
           WHEN state_roll < 35 THEN 'shipped'
           WHEN state_roll < 88 THEN 'delivered'
           WHEN state_roll < 96 THEN 'cancelled'
           ELSE 'refunded'
       END,
       IF(MOD(n, 4) = 0, 0, 199 + MOD(n, 6) * 50),
       IF(MOD(n, 13) = 0, 'KZT', 'RUB'),
       CASE MOD(n, 17)
           WHEN 0 THEN ''
           WHEN 1 THEN 'Подарок 🎁. Чек приложите к заказу.'
           WHEN 2 THEN CONCAT('Доставить после 18:00.', CHAR(10), 'Позвонить заранее.')
           ELSE NULL
       END,
       TIMESTAMPADD(MICROSECOND, MOD(n, 1000) * 1000,
           TIMESTAMPADD(MINUTE, MOD(n * 1879, 777600), '2024-04-01 00:00:00'))
FROM order_seed ORDER BY n;

INSERT INTO order_items (order_id, line_no, variant_id, quantity, unit_price)
SELECT o.id, s.n, v.id, 1 + MOD(o.id + s.n * 3, 4), v.unit_price
FROM orders AS o
JOIN seed_numbers AS s ON s.n <= 5 AND s.n <= 1 + MOD(o.id, 5)
JOIN product_variants AS v ON v.id = 1 + MOD(o.id * 137 + s.n * 239, 7200)
ORDER BY o.id, s.n;

UPDATE orders AS o
JOIN (
    SELECT order_id, SUM(line_total) AS subtotal FROM order_items GROUP BY order_id
) AS item_totals ON item_totals.order_id = o.id
LEFT JOIN coupons AS c ON c.code = o.coupon_code
SET o.subtotal = item_totals.subtotal,
    o.discount_amount = ROUND(item_totals.subtotal * COALESCE(c.percent_off, 0) / 100, 2);

INSERT INTO order_status_history (order_id, step_no, status, changed_at)
SELECT id, 1, 'pending', created_at FROM orders
UNION ALL
SELECT id, 2, 'paid', TIMESTAMPADD(MINUTE, 20, created_at)
FROM orders WHERE status IN ('paid', 'shipped', 'delivered', 'refunded')
UNION ALL
SELECT id, 3, 'shipped', TIMESTAMPADD(DAY, 1, created_at)
FROM orders WHERE status IN ('shipped', 'delivered', 'refunded')
UNION ALL
SELECT id, 4, 'delivered', TIMESTAMPADD(DAY, 3, created_at)
FROM orders WHERE status IN ('delivered', 'refunded')
UNION ALL
SELECT id, 2, 'cancelled', TIMESTAMPADD(HOUR, 2, created_at)
FROM orders WHERE status = 'cancelled'
UNION ALL
SELECT id, 5, 'refunded', TIMESTAMPADD(DAY, 10, created_at)
FROM orders WHERE status = 'refunded';

INSERT INTO payment_methods VALUES
    ('card', 'Банковская карта'), ('transfer', 'Банковский перевод'),
    ('wallet', 'Электронный кошелёк'), ('cash', 'Наличные');

INSERT INTO payments (id, order_id, method_code, provider_reference, status, amount, failure_message, details, created_at)
SELECT id, id, ELT(1 + MOD(id DIV 5, 4), 'card', 'transfer', 'wallet', 'cash'),
       IF(status = 'cancelled', NULL, CONCAT('PAY-', LPAD(id, 7, '0'))),
       CASE status WHEN 'cancelled' THEN 'failed' WHEN 'pending' THEN 'authorized' ELSE 'captured' END,
       total_amount,
       IF(status = 'cancelled', 'Истекло время подтверждения оплаты', NULL),
       JSON_OBJECT('provider', ELT(1 + MOD(id DIV 5, 4), 'DemoPay', 'DemoBank', 'DemoWallet', 'CashDesk'),
                   'attempt', 1, 'test_mode', CAST('true' AS JSON)),
       TIMESTAMPADD(MINUTE, 20, created_at)
FROM orders WHERE status NOT IN ('pending', 'cancelled') OR MOD(id, 3) = 0
ORDER BY id;

INSERT INTO payments (id, order_id, method_code, provider_reference, status, amount, details, created_at)
SELECT 15000 + id, id, ELT(1 + MOD(id DIV 5, 4), 'card', 'transfer', 'wallet', 'cash'),
       CONCAT('REF-', LPAD(id, 7, '0')), 'refunded', total_amount,
       JSON_OBJECT('reason', 'order_return'), TIMESTAMPADD(DAY, 10, created_at)
FROM orders WHERE status = 'refunded' ORDER BY id;

INSERT INTO carriers (id, name) VALUES
    (1, 'Демо Экспресс'), (2, 'Северная доставка'), (3, 'Demo Post'), (4, 'Городской курьер');

INSERT INTO shipments (id, order_id, warehouse_id, carrier_id, tracking_number, status, shipped_at, delivered_at)
SELECT id, id, 1 + MOD(id DIV 3, 12), 1 + MOD(id DIV 7, 4), CONCAT('DEMO', LPAD(id, 9, '0')),
       IF(status = 'shipped', 'in_transit', 'delivered'),
       TIMESTAMPADD(DAY, 1, created_at),
       IF(status = 'shipped', NULL, TIMESTAMPADD(DAY, 3, created_at))
FROM orders WHERE status IN ('shipped', 'delivered', 'refunded') ORDER BY id;

INSERT INTO shipment_items (order_id, shipment_id, line_no, quantity)
SELECT s.order_id, s.id, i.line_no, i.quantity
FROM shipments AS s JOIN order_items AS i ON i.order_id = s.order_id;

INSERT INTO return_reasons VALUES
    ('defect', 'Брак'), ('wrong_item', 'Не тот товар'),
    ('size', 'Не подошёл размер'), ('changed_mind', 'Покупатель передумал');

INSERT INTO returns (id, order_id, reason_code, status, requested_at, resolved_at)
SELECT id, id, ELT(1 + MOD(id DIV 7, 4), 'defect', 'wrong_item', 'size', 'changed_mind'),
       CASE WHEN status = 'refunded' THEN 'completed'
            WHEN MOD(id DIV 11, 3) = 0 THEN 'requested'
            WHEN MOD(id DIV 11, 3) = 1 THEN 'approved'
            ELSE 'rejected'
       END,
       TIMESTAMPADD(DAY, 6, created_at),
       CASE WHEN status = 'refunded' THEN TIMESTAMPADD(DAY, 10, created_at)
            WHEN MOD(id DIV 11, 3) <> 0 THEN TIMESTAMPADD(DAY, 8, created_at)
       END
FROM orders WHERE status = 'refunded' OR (status = 'delivered' AND MOD(id, 11) = 0)
ORDER BY id;

INSERT INTO return_items (order_id, return_id, line_no, quantity)
SELECT r.order_id, r.id, i.line_no, IF(r.status = 'completed', i.quantity, 1)
FROM returns AS r JOIN order_items AS i ON i.order_id = r.order_id
WHERE r.status = 'completed' OR i.line_no = 1;

INSERT INTO reviews (id, customer_id, product_id, rating, title, body, status, submitted_at)
WITH purchases AS (
    SELECT o.customer_id, v.product_id, MAX(o.created_at) AS ordered_at
    FROM orders AS o
    JOIN order_items AS i ON i.order_id = o.id AND i.line_no = 1
    JOIN product_variants AS v ON v.id = i.variant_id
    WHERE o.status = 'delivered' AND MOD(o.id, 3) <> 0
    GROUP BY o.customer_id, v.product_id
), numbered AS (
    SELECT ROW_NUMBER() OVER (ORDER BY customer_id, product_id) AS n, customer_id, product_id, ordered_at
    FROM purchases
)
SELECT n, customer_id, product_id, 1 + MOD(n, 5),
       CASE MOD(n, 4) WHEN 0 THEN NULL WHEN 1 THEN '' ELSE 'Отзыв о покупке' END,
       CASE MOD(n, 5) WHEN 0 THEN NULL WHEN 1 THEN 'Есть замечания к упаковке'
            WHEN 2 THEN 'Товар соответствует описанию, доставка вовремя'
            WHEN 3 THEN 'Хорошее качество'
            ELSE CONCAT('Отличная покупка ⭐', CHAR(10), 'Закажу ещё')
       END,
       CASE WHEN MOD(n, 19) = 0 THEN 'hidden' WHEN MOD(n, 7) = 0 THEN 'pending' ELSE 'published' END,
       TIMESTAMPADD(DAY, 5 + MOD(n, 14), ordered_at)
FROM numbered ORDER BY n;

INSERT INTO support_queues (id, name, sla_hours) VALUES
    (1, 'Доставка', 12), (2, 'Оплата', 8), (3, 'Возвраты', 24), (4, 'Общие вопросы', 48);

INSERT INTO support_tickets
    (id, customer_id, order_id, queue_id, assignee_id, subject, status, priority, opened_at, closed_at)
SELECT n, IF(MOD(n, 7) = 0, 1 + MOD(n * 11, 5000), o.customer_id),
       IF(MOD(n, 7) = 0, NULL, o.id), 1 + MOD(n DIV 7, 4),
       IF(MOD(n, 6) = 0, NULL, 6 + 4 * MOD(n DIV 6, 30)),
       ELT(1 + MOD(n DIV 7, 4), 'Где мой заказ?', 'Вопрос по оплате',
           'Как оформить возврат?', 'Вопрос по личному кабинету'),
       ELT(1 + MOD(n, 4), 'open', 'waiting', 'resolved', 'closed'),
       ELT(1 + MOD(n DIV 5, 4), 'low', 'normal', 'high', 'urgent'),
       TIMESTAMPADD(HOUR, 6 + MOD(n, 144), o.created_at),
       IF(MOD(n, 4) >= 2, TIMESTAMPADD(HOUR, 36 + MOD(n, 144), o.created_at), NULL)
FROM seed_numbers JOIN orders AS o ON o.id = 1 + MOD(n * 113, 15000)
WHERE n <= 3200 ORDER BY n;

INSERT INTO ticket_messages (id, ticket_id, sender_staff_id, body, is_internal, sent_at)
SELECT (t.id - 1) * 6 + s.n, t.id, IF(MOD(s.n, 2) = 0, COALESCE(t.assignee_id, 3), NULL),
       ELT(s.n, CONCAT(t.subject, ' Подскажите, пожалуйста.'), 'Здравствуйте! Проверим информацию.',
           'Спасибо, добавил детали в обращение.', 'Служебная заметка: уточнить детали в соседней очереди.',
           'Ожидаю вашего ответа.', 'Обновили статус обращения.'),
       s.n = 4,
       TIMESTAMPADD(HOUR, (s.n - 1) * 3, t.opened_at)
FROM support_tickets AS t
JOIN seed_numbers AS s ON s.n <= 6 AND s.n <= 1 + MOD(t.id, 6)
ORDER BY t.id, s.n;

INSERT INTO audit_events (id, actor_id, entity_type, entity_id, event_type, payload, occurred_at)
SELECT (o.id - 1) * 4 + s.n,
       IF(s.n = 1 OR MOD(o.id, 7) = 0, NULL, 1 + MOD(o.id + s.n, 124)),
       'order', o.id,
       ELT(s.n, 'created', 'validated', 'viewed', 'status_changed'),
       JSON_OBJECT('order_number', o.order_number, 'source', o.channel_code,
                   'snapshot', JSON_OBJECT('status', IF(s.n = 1, 'pending', o.status),
                                           'total', o.total_amount, 'currency', o.currency)),
       TIMESTAMPADD(DAY, ELT(s.n, 0, 1, 4, 11) + 0, o.created_at)
FROM orders AS o
JOIN seed_numbers AS s ON s.n <= 4
ORDER BY o.id, s.n;

INSERT INTO import_errors (batch_code, source_line, error_message, raw_data, logged_at)
SELECT CONCAT('BATCH-', LPAD(1 + MOD(n DIV 25, 24), 3, '0')), 1 + MOD(n, 25),
       ELT(1 + MOD(n DIV 3, 4), 'Неверный формат email', 'Пустое обязательное поле',
           'Товар не найден', 'Не удалось разобрать дату'),
       JSON_OBJECT('input', ELT(1 + MOD(n DIV 3, 4), 'bad-email', '', 'UNKNOWN-SKU', '2025-02-30')),
       TIMESTAMPADD(SECOND, n * 17, '2025-06-15 12:00:00')
FROM seed_numbers WHERE n <= 600;

INSERT INTO import_errors (batch_code, source_line, error_message, raw_data, logged_at) VALUES
    ('BATCH-DUPLICATE', NULL, 'Заголовок файла повреждён', NULL, '2025-06-16 09:00:00'),
    ('BATCH-DUPLICATE', NULL, 'Заголовок файла повреждён', NULL, '2025-06-16 09:00:00');

COMMIT;
SET SESSION time_zone = @demo_previous_time_zone;
DROP TEMPORARY TABLE seed_numbers;
