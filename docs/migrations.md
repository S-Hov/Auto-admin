# Подсистема миграций Auto Admin

## 1. Назначение и концепция

Подсистема миграций Auto Admin предназначена для автоматического и безопасного развёртывания системных таблиц панели управления (`Auto_Admin__*`) в существующей базе данных пользователя (MySQL 8.x).

### Ключевые архитектурные принципы:
1. **Неприкосновенность данных пользователя:** Миграции создают и модифицируют **исключительно** служебные таблицы с префиксом `Auto_Admin__`. Таблицы и данные пользовательского приложения никогда не затрагиваются мигратором.
2. **Пошаговое выполнение (Step-by-Step Execution):** Миграции могут выполняться по одной с фиксацией прогресса на клиенте (UI Wizard), что обеспечивает прозрачность и интерактивность процесса установки.
3. **Изоляция и безопасность (Security Isolation):** Флаг `multipleStatements: true` включается только на выделенном соединении мигратора и полностью изолирован от основного пула приложения.
4. **Отказоустойчивость и повтор (Fault-Tolerance & Recovery):** Сбой миграции фиксируется в истории, не блокирует систему намертво и позволяет повторить запуск после исправления ошибки без ручного вмешательства в БД.
5. **Распределённые блокировки (Distributed Locking):** Защита от одновременного запуска миграций несколькими процессами/контейнерами через именованные блокировки MySQL (`GET_LOCK`).

---

## 2. Структура файлов подсистемы

```text
server/src/migrations/
├── sql/                             # Каталог SQL-файлов миграций
│   ├── 0001__Auto_Admin__installation.sql
│   ├── 0002__Auto_Admin__roles.sql
│   ├── 0003__Auto_Admin__users.sql
│   ├── 0004__Auto_Admin__sessions.sql
│   ├── 0005__Auto_admin__login_attempts.sql
│   ├── 0006__Auto_Admin__auth_logs.sql
│   └── 0007__Auto_Admin__seed_roles.sql
├── config.ts                        # Константы (имя таблицы истории, имя лока)
├── migration.catalog.ts             # Сканирование файлов, валидация имен и SHA-256
├── migration.db.ts                  # Фабрика выделенного соединения мигратора
├── migration.errors.ts              # Доменные классы ошибок миграций
├── migration.lock.ts                # Управление блокировками GET_LOCK / RELEASE_LOCK
├── migration.plan.ts                # Построение плана и валидация порядка/целостности
├── migration.repository.ts          # Слой работы с таблицей истории миграций
├── migration.runner.ts              # Раннер исполнения миграций и транзакционный контроль
└── migration.types.ts               # TypeScript-типы и интерфейсы
```

---

## 3. Таблица истории миграций

Вся история выполнения хранится в служебной таблице `Auto_Admin__migration_history`:

```sql
CREATE TABLE IF NOT EXISTS `Auto_Admin__migration_history` (
    version VARCHAR(32) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) UNIQUE NOT NULL,
    checksum CHAR(64) NOT NULL,
    status ENUM('running', 'applied', 'failed') NOT NULL,
    started_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    finished_at DATETIME(3) NULL,
    execution_ms BIGINT UNSIGNED NULL,
    error_message TEXT NULL,
    attempt_count INT UNSIGNED NOT NULL DEFAULT 1,
    app_version VARCHAR(64) NULL,
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Описание полей:
* `version`: Номер версии (4 цифры, например `0001`). Первичный ключ.
* `name`: Человекочитаемое название миграции.
* `file_name`: Полное имя SQL-файла.
* `checksum`: Контрольная сумма SHA-256 от нормализованного текста SQL.
* `status`: Текущий статус (`running`, `applied`, `failed`).
* `started_at` / `finished_at`: Временные метки начала и завершения с миллисекундной точностью.
* `execution_ms`: Время выполнения скрипта в миллисекундах.
* `error_message`: Текст ошибки MySQL в случае сбоя (до 4000 символов).
* `attempt_count`: Счетчик попыток выполнения (инкрементируется при повторах).
* `app_version`: Версия приложения Auto Admin на момент применения.

---

## 4. Описание компонентов

### 4.1. Каталог миграций (`migration.catalog.ts`)
* Сканирует директорию `sql/`.
* Проверяет формат имен файлов по регулярному выражению: `/^(\d{4})__([a-zA-Z0-9_]+)\.sql$/`.
* Проверяет отсутствие дубликатов версий и имен.
* Сортирует файлы по возрастанию версии.
* **Нормализация строк:** Заменяет все Windows-переводы строк `\r\n` на Linux `\n` и обрезает краевые пробелы (`.trim()`).
* Вычисляет детерминированный SHA-256 хеш от нормализованной строки в кодировке UTF-8.

### 4.2. Управление блокировками (`migration.lock.ts`)
* Использует функцию MySQL `GET_LOCK('auto-admin:migrations', timeoutSeconds)`.
* При `timeout = 0` попытка взятия лока неблокирующая: если лок занят другим процессом, немедленно выбрасывается `MigrationLockUnavailableError`.
* Снятие лока (`RELEASE_LOCK`) выполняется в блоке `finally`. Если лок уже был снят (например, при разрыве соединения), пишется некритичный `console.warn`, не перетирая исходные ошибки SQL.
* При завершении сессии MySQL автоматически освобождает все именованные блокировки.

### 4.3. Соединение мигратора (`migration.db.ts`)
* Создает прямое одиночное соединение `mysql.createConnection(...)` (а не пул `createPool`).
* Явно включает `multipleStatements: true`, что позволяет выполнять в одном `.sql` файле несколько команд, разделенных `;`.
* В конце жизненного цикла раннера соединение гарантированно закрывается через `await connection.end()`, исключая утечки соединений в памяти Node.js.

### 4.4. Построение плана (`migration.plan.ts`)
Сверяет локальный каталог файлов с историей в базе данных:
1. **Валидация примененных миграций:** Для всех ранее примененных миграций (`applied`) строго сверяются порядок, версия, имя, имя файла и SHA-256 хеш. Если хеш изменился, выбрасывается `Migration checksum mismatch`.
2. **Обработка упавших миграций (Recovery):** Если последняя запись в истории имеет статус `failed` или `running`:
   * Она не считается примененной (`applied = history.slice(0, -1)`).
   * Она ставится во главу очереди на выполнение (`pending = catalog.slice(applied.length)`).
   * Для неё не требуется совпадение старого хеша (разработчик мог исправить ошибку в файле).

### 4.5. Раннер (`migration.runner.ts`)
Управляет исполнением одной миграции (`applyNextMigration(expectedVersion)`):
1. Открывает соединение `createMigrationConnection()`.
2. Захватывает блокировку `GET_LOCK`.
3. Загружает текущий план и проверяет, что `expectedVersion === plan.next.version`.
4. Записывает миграцию в историю со статусом `running` (с использованием `ON DUPLICATE KEY UPDATE` для корректного инкремента `attempt_count` при повторах).
5. Замеряет время и выполняет SQL-скрипт `await connection.query(next.sql)`.
6. При успехе: обновляет статус на `applied`, фиксирует `finished_at` и `execution_ms`.
7. При ошибке: обновляет статус на `failed`, записывает `error_message` и пробрасывает исходную ошибку.
8. В блоке `finally`: освобождает лог и закрывает соединение `connection.end()`.

---

## 5. Правила написания новых SQL-миграций

1. **Именование файлов:**
   Формат: `XXXX__Auto_Admin__<feature_name>.sql`, где `XXXX` — четырехзначный порядковый номер с ведущими нулями (например, `0008__Auto_Admin__permissions.sql`).
2. **Идемпотентность DDL (MySQL):**
   * Все команды создания таблиц должны содержать `CREATE TABLE IF NOT EXISTS`.
   * Все вставки начальных данных (seeds) должны использовать `INSERT ... ON DUPLICATE KEY UPDATE` или `INSERT IGNORE`.
   * *Причина:* В MySQL команды DDL вызывают неявный `COMMIT` и не могут быть откатаны транзакцией.
3. **Изоляция префикса:**
   Все системные объекты обязаны иметь префикс `Auto_Admin__`. Создание таблиц без этого префикса категорически запрещено.

---

## 6. Сборка и деплой (Production Build)

Компилятор TypeScript (`tsc`) компилирует только `.ts` файлы и игнорирует `.sql` файлы.

Для гарантии доставки SQL-файлов в продакшн в `package.json` настроен кроссплатформенный скрипт сборки:

```json
"scripts": {
  "build": "tsc && node -e \"require('fs').cpSync('src/migrations/sql', 'dist/migrations/sql', { recursive: true })\""
}
```

При выполнении `npm run build` все SQL-миграции копируются в директорию `dist/migrations/sql/`, откуда они читаются скомпилированным приложением `dist/app.js`.
