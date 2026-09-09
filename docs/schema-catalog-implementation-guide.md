# Schema Catalog: инструкция по реализации

## 1. Что мы строим

Schema Catalog — это серверный модуль, который изучает реальную структуру подключённой MySQL-базы и превращает её в безопасную модель, понятную Auto Admin.

Он отвечает на вопросы:

- какие пользовательские таблицы и views существуют;
- какие в них есть колонки и MySQL-типы;
- чем можно однозначно идентифицировать запись;
- какие поля создаёт или вычисляет сама база;
- какие таблицы связаны внешними ключами;
- какие индексы существуют;
- какие объекты относятся к Auto Admin;
- что изменилось с прошлого сканирования.

Schema Catalog не читает пользовательские строки из `orders`, `users` и других таблиц. Он читает только описание структуры из `INFORMATION_SCHEMA`.

### Конкретный пример

Пусть в базе есть:

```sql
CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    avatar_url VARCHAR(500) NULL
);

CREATE TABLE orders (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    status VARCHAR(30) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_orders_status (status),
    CONSTRAINT fk_orders_user
        FOREIGN KEY (user_id) REFERENCES users(id)
);
```

После сканирования Auto Admin должен знать:

```text
База shop
├─ users
│  ├─ id: BIGINT UNSIGNED, primary key, auto increment
│  ├─ email: VARCHAR(255), required, unique
│  └─ avatar_url: VARCHAR(500), nullable
└─ orders
   ├─ id: BIGINT UNSIGNED, primary key, auto increment
   ├─ user_id: BIGINT UNSIGNED, FK → users.id
   ├─ total: DECIMAL(10,2), required
   ├─ status: VARCHAR(30), index idx_orders_status
   └─ created_at: DATETIME, default CURRENT_TIMESTAMP
```

Эти сведения затем используют:

- настройка страниц и бокового меню;
- автоматический выбор полей формы;
- renderer-ы `text`, `number`, `date`, `image_url`;
- автоматические JOIN по foreign key;
- проверка JSON-запросов Query Engine;
- запрет записи в generated и auto increment поля;
- безопасные update/delete по primary или unique key;
- обнаружение изменений пользовательской базы.

## 2. Главная модель данных

Нужно различать три формы одних и тех же сведений.

```text
Строки INFORMATION_SCHEMA
        ↓ нормализация
DBSnapshot в памяти
        ↓ синхронизация
Auto_Admin__resources / fields / constraints / indexes в БД
```

### 2.1. Raw rows

Это непосредственные ответы MySQL. Например, `INFORMATION_SCHEMA.COLUMNS` возвращает:

```text
TABLE_NAME       = orders
COLUMN_NAME      = total
ORDINAL_POSITION = 3
DATA_TYPE        = decimal
COLUMN_TYPE      = decimal(10,2)
IS_NULLABLE      = NO
NUMERIC_PRECISION = 10
NUMERIC_SCALE     = 2
```

Raw-тип должен повторять ответ драйвера. `IS_NULLABLE` здесь ещё строка `YES | NO`, а не boolean.

### 2.2. Нормализованный snapshot

Это удобная для приложения модель:

```text
name: total
position: 3
dataType: decimal
columnType: decimal(10,2)
nullable: false
numericPrecision: 10
numericScale: 2
```

Именно её описывает `schema-catalog.types.ts`.

### 2.3. Сохранённый каталог

Snapshot существует только в памяти процесса. Чтобы к таблице можно было привязать страницу, права и настройки, сведения сохраняются в служебных таблицах и получают стабильные внутренние ID.

Например:

```text
resourceId 15 → shop.orders
fieldId 91    → shop.orders.user_id
fieldId 92    → shop.orders.total
```

Клиент и Page Definition используют `resourceId` и `fieldId`, а не принимаемые извне имена SQL-объектов.

## 3. Границы первой версии

Первая версия поддерживает:

- одну активную MySQL-базу из серверной конфигурации;
- обычные таблицы и views;
- колонки;
- primary и unique constraints;
- foreign keys, включая составные;
- обычные, unique и полнотекстовые индексы;
- generated columns;
- обнаружение добавленных, изменённых и исчезнувших объектов;
- сохранение стабильных внутренних ID;
- кеш текущего каталога;
- ручной повторный scan администратором.

Первая версия не должна:

- сканировать произвольную schema из `req.body`;
- изменять пользовательские таблицы;
- автоматически считать поле с суффиксом `_id` настоящей связью;
- пытаться безошибочно распознавать переименование таблиц и колонок;
- поддерживать несколько СУБД;
- исполнять произвольный SQL из Page Definition;
- разрешать generic CRUD для `Auto_Admin__*`.

Переименование в MVP считается исчезновением старого объекта и появлением нового. Администратор подтверждает перенос настроек вручную.

## 4. Целевая структура файлов

```text
server/src/core/schema-catalog/
├─ schema-catalog.types.ts
├─ information-schema.types.ts
├─ mysql-schema-introspector.ts
├─ schema-snapshot.builder.ts
├─ schema-catalog.repository.ts
├─ schema-catalog.synchronizer.ts
├─ schema-catalog.cache.ts
├─ schema-catalog.service.ts
├─ schema-catalog.errors.ts
└─ index.ts

server/src/modules/schema-catalog/
├─ schema-catalog.controller.ts
├─ schema-catalog.routes.ts
├─ schema-catalog.schemas.ts
├─ schema-catalog.types.ts
└─ index.ts
```

`core/schema-catalog` ничего не знает об Express, `Request`, `Response`, cookie и HTTP-кодах.

`modules/schema-catalog` является HTTP-оболочкой: проверяет вход, вызывает service и возвращает единый API envelope.

## 5. Ответственность каждого файла

### `schema-catalog.types.ts`

Описывает нормализованную runtime-модель базы:

- `DBSnapshot`;
- `DBTable`;
- `DBColumn`;
- `DBKey`;
- `DBForeignKey`;
- `DBIndex`.

Здесь не должно быть интерфейсов `Request`, DTO клиента, renderer-ов или прав.

### `information-schema.types.ts`

Описывает сырые строки MySQL:

- `InformationSchemaTableRow`;
- `InformationSchemaColumnRow`;
- `InformationSchemaConstraintRow`;
- `InformationSchemaForeignKeyRuleRow`;
- `InformationSchemaIndexRow`.

Эти интерфейсы могут расширять `RowDataPacket`. Их имена и типы должны соответствовать aliases в SQL.

### `mysql-schema-introspector.ts`

Только читает `INFORMATION_SCHEMA` через переданный `DbExecutor`.

Он не должен:

- сохранять наши служебные записи;
- вычислять diff;
- работать с Express;
- проверять права текущего пользователя;
- обращаться к Query Engine.

### `schema-snapshot.builder.ts`

Собирает плоские raw rows в дерево `DBSnapshot`.

Он:

- преобразует `YES/NO` в boolean;
- преобразует `BASE TABLE/VIEW` в `table/view`;
- группирует колонки по таблице;
- группирует составные keys по имени constraint;
- сохраняет порядок колонок;
- соединяет FK-колонки с referenced-колонками;
- вычисляет `isServiceTable`.

Builder должен быть чистым: получить массивы → вернуть snapshot. Благодаря этому его легко тестировать без MySQL.

### `schema-catalog.repository.ts`

Работает только со служебными таблицами каталога:

- читает текущий сохранённый каталог;
- создаёт scan record;
- upsert-ит resources и fields;
- сохраняет constraints и indexes;
- помечает исчезнувшие объекты;
- завершает scan record.

Repository не принимает решений о том, что считать изменением и что делать с настройками.

### `schema-catalog.synchronizer.ts`

Сравнивает snapshot с сохранённым каталогом и строит план изменений:

```text
added
changed
unchanged
missing
```

Он решает, какие записи создать, обновить или пометить отсутствующими.

### `schema-catalog.cache.ts`

Хранит уже проверенный активный каталог для Query Engine.

Минимальный интерфейс:

- получить текущий catalog;
- заменить catalog после успешной синхронизации;
- очистить cache;
- определить, загружен ли catalog.

Cache нельзя обновлять до commit транзакции.

### `schema-catalog.service.ts`

Оркестрирует весь use case:

```text
получить соединение
→ взять scan lock
→ создать запись scan
→ выполнить introspection
→ построить snapshot
→ вычислить diff
→ транзакционно сохранить каталог
→ обновить cache
→ освободить lock
→ вернуть summary
```

Именно service отвечает за порядок операции и обработку ожидаемых ошибок.

## 6. Нормализованные типы

### `DBSnapshot`

Поля:

- `schemaName` — отсканированная база;
- `scannedAt` — момент получения snapshot;
- `tables` — все доступные таблицы и views выбранной базы.

Snapshot должен относиться только к одной schema.

### `DBTable`

Поля:

- `name`;
- `type: table | view`;
- `engine: string | null`;
- `comment`;
- `columns`;
- `primaryKey`;
- `uniqueKeys`;
- `foreignKeys`;
- `indexes`;
- `isServiceTable`.

У view `engine` обычно `null`. View в MVP считается read-only независимо от того, допускает ли MySQL обновление конкретного view.

### `DBColumn`

Нужно сохранить:

- имя и позицию;
- `dataType` (`varchar`, `decimal`, `bigint`);
- полный `columnType` (`bigint unsigned`, `decimal(10,2)`, `enum(...)`);
- nullable и default;
- length/precision/scale;
- datetime precision;
- charset и collation;
- auto increment;
- generated-признаки и выражение;
- исходный `extra`;
- comment.

Почему нельзя оставить только `columnType`: парсить строку `decimal(10,2)` или сложный `enum` во всех последующих модулях ненадёжно. MySQL уже отдаёт основные размеры отдельными полями.

### `DBKey`

Содержит имя constraint и упорядоченный массив колонок.

Массив нужен для составного ключа:

```text
PRIMARY KEY (tenant_id, order_id)
```

### `DBForeignKey`

Содержит:

- имя constraint;
- локальные колонки;
- referenced schema/table;
- referenced columns;
- `ON UPDATE`;
- `ON DELETE`.

Позиции массивов образуют пары:

```text
columns[0] → referencedColumns[0]
columns[1] → referencedColumns[1]
```

### `DBIndex`

Содержит:

- имя;
- упорядоченные колонки;
- уникальность;
- строковый `indexType`, например `BTREE` или `FULLTEXT`.

Добавить `indexes: DBIndex[]` в `DBTable`. `INFORMATION_SCHEMA.STATISTICS.INDEX_TYPE` возвращает строку, не число.

Primary/unique constraints и indexes частично дублируются. Это допустимо:

- constraint описывает целостность данных;
- index описывает физический путь поиска.

## 7. Чтение `INFORMATION_SCHEMA`

Не делай один огромный JOIN. При соединении `COLUMNS`, `KEY_COLUMN_USAGE` и `STATISTICS` строки начнут перемножаться, а сборка составных ключей станет ненадёжной.

Сделай несколько простых запросов.

### 7.1. Определить активную schema

Источник schema — серверная конфигурация либо `SELECT DATABASE()` на текущем соединении.

Правило безопасности: controller не принимает имя schema от клиента.

Если `SELECT DATABASE()` возвращает `NULL`, сканирование завершается ожидаемой ошибкой конфигурации.

### 7.2. Таблицы и views

Читать из `INFORMATION_SCHEMA.TABLES`:

- `TABLE_SCHEMA`;
- `TABLE_NAME`;
- `TABLE_TYPE`;
- `ENGINE`;
- `TABLE_COMMENT`.

Фильтр:

```sql
WHERE TABLE_SCHEMA = ?
```

Schema передаётся как значение параметра. Не вставляй её строковой интерполяцией.

Сортируй по `TABLE_NAME`, чтобы результат и тесты были детерминированными.

### 7.3. Колонки

Читать из `INFORMATION_SCHEMA.COLUMNS`:

- `TABLE_NAME`;
- `COLUMN_NAME`;
- `ORDINAL_POSITION`;
- `COLUMN_DEFAULT`;
- `IS_NULLABLE`;
- `DATA_TYPE`;
- `CHARACTER_MAXIMUM_LENGTH`;
- `NUMERIC_PRECISION`;
- `NUMERIC_SCALE`;
- `DATETIME_PRECISION`;
- `COLUMN_TYPE`;
- `EXTRA`;
- `GENERATION_EXPRESSION`;
- `CHARACTER_SET_NAME`;
- `COLLATION_NAME`;
- `COLUMN_COMMENT`.

Сортировка:

```text
TABLE_NAME, ORDINAL_POSITION
```

Не определяй generated column только по непустому выражению. Сохрани `EXTRA` и нормализуй `VIRTUAL GENERATED`/`STORED GENERATED` явно.

### 7.4. Primary и unique constraints

Использовать вместе:

- `INFORMATION_SCHEMA.TABLE_CONSTRAINTS`;
- `INFORMATION_SCHEMA.KEY_COLUMN_USAGE`.

Отбирать `PRIMARY KEY` и `UNIQUE`.

Для группировки нужны:

- table name;
- constraint name;
- constraint type;
- column name;
- ordinal position.

Составной key должен стать одним `DBKey`, а не несколькими ключами с одинаковым именем.

### 7.5. Foreign keys

Колонки связи брать из `KEY_COLUMN_USAGE`, а правила `ON UPDATE/DELETE` — из `REFERENTIAL_CONSTRAINTS`.

Нужны:

- constraint name;
- table/column;
- ordinal position;
- referenced schema/table/column;
- update rule;
- delete rule.

Cross-schema foreign key нужно сохранить в snapshot, но generic CRUD первой версии не должен автоматически разрешать JOIN за пределы активной schema.

### 7.6. Индексы

Читать из `INFORMATION_SCHEMA.STATISTICS`:

- table name;
- index name;
- `NON_UNIQUE`;
- `SEQ_IN_INDEX`;
- column name;
- index type.

Преобразование:

```text
isUnique = NON_UNIQUE === 0
```

Сортировать по table, index name и `SEQ_IN_INDEX`.

Для MySQL 8 functional index `COLUMN_NAME` может быть `NULL`, а выражение находится в `EXPRESSION`. В первой версии допустимо либо сохранить выражение отдельно, либо пометить такой index неподдерживаемым. Нельзя превращать `NULL` в строку `'null'`.

## 8. Как собрать snapshot

Удобный алгоритм builder-а:

1. Создать `Map<tableName, DBTable>` из table rows.
2. Для каждой column row найти таблицу и добавить нормализованную колонку.
3. Сгруппировать constraint rows по паре `tableName + constraintName`.
4. Для каждой группы отсортировать колонки по ordinal position.
5. Записать primary key или unique key в соответствующую таблицу.
6. Аналогично сгруппировать foreign key rows.
7. Проверить равенство количества local и referenced колонок.
8. Сгруппировать index rows и сохранить порядок `SEQ_IN_INDEX`.
9. Вернуть таблицы в стабильном алфавитном порядке.

Если column/constraint ссылается на таблицу, которой нет среди table rows, snapshot нельзя считать надёжным. Builder должен завершиться внутренней ошибкой, а scan — получить статус `failed`.

### `isServiceTable`

Пока правило простое:

```text
tableName начинается с Auto_Admin__
```

Сравнение должно соответствовать принятой политике регистра проекта. Не размазывай проверку префикса по разным файлам: вынеси зарезервированный prefix в одно место.

## 9. Служебные таблицы каталога

Не добавляй все таблицы одним огромным SQL-файлом. Раздели миграции по логическим зависимостям и не изменяй уже применённую миграцию в production-базе.

### `Auto_Admin__schema_scans`

История запусков:

- `id`;
- `status: running | succeeded | failed`;
- `started_at`;
- `finished_at`;
- `schema_name`;
- fingerprint snapshot;
- количество добавленных/изменённых/исчезнувших объектов;
- безопасный код ошибки;
- `created_by`.

Не сохраняй credentials или полный текст потенциально чувствительной SQL-ошибки.

### `Auto_Admin__resources`

Одна запись на физическую таблицу/view:

- стабильный `id`;
- schema name;
- table name;
- object type;
- engine;
- comment;
- `is_service`;
- `state: present | missing`;
- first seen scan;
- last seen scan;
- timestamps.

Нужен unique constraint по schema + table name.

### `Auto_Admin__fields`

Одна запись на колонку:

- стабильный `id`;
- `resource_id`;
- column name и position;
- типовые свойства из `DBColumn`;
- `state: present | missing`;
- first/last seen scan;
- timestamps.

Нужен unique constraint по resource + column name.

### Constraints

Для полноценной поддержки составных ключей лучше разделить:

```text
Auto_Admin__constraints
Auto_Admin__constraint_fields
```

Первая таблица хранит constraint, вторая — его упорядоченные поля. Для foreign key во второй таблице также хранится referenced field или отдельная таблица пар колонок.

Не сохраняй составной ключ строкой `tenant_id,order_id`: это сложно проверять и невозможно надёжно связать с `field_id`.

### Indexes

Аналогично:

```text
Auto_Admin__indexes
Auto_Admin__index_fields
```

Так сохраняются порядок колонок и functional expressions.

## 10. Синхронизация и diff

Snapshot показывает настоящее состояние сейчас. Сохранённый каталог показывает, что Auto Admin видел раньше.

Для каждого resource/field возможны состояния:

- `added` — есть в snapshot, раньше не было;
- `unchanged` — структура совпадает;
- `changed` — объект существует, свойства изменились;
- `missing` — раньше был, сейчас отсутствует.

### Почему нельзя сразу удалять missing

На исчезнувшее поле могут ссылаться:

- Page Definition;
- настройка renderer;
- права;
- меню;
- ручная relation.

Если физически удалить catalog record, мы потеряем причину поломки. Вместо этого ставим `state = missing`, а зависимую страницу — `invalid`.

### Idempotency

Два сканирования неизменившейся базы должны дать:

```text
added = 0
changed = 0
missing = 0
```

Они не должны создавать дубликаты ресурсов, полей или constraints.

### Fingerprint

Для быстрой диагностики можно вычислять SHA-256 канонического snapshot.

Перед hashing нужно:

- стабильно отсортировать таблицы, поля, keys и indexes;
- не включать `scannedAt`;
- использовать одинаковое JSON-представление.

Fingerprint — оптимизация и диагностический признак, а не замена подробного diff.

## 11. Транзакция и scan lock

Сканирование может запустить пользователь двойным кликом или два администратора одновременно.

Используй MySQL named lock с отдельным постоянным соединением:

```text
GET_LOCK('Auto_Admin__schema_catalog_scan', 0)
```

`0` означает: не ждать, а сразу сообщить, что scan уже выполняется.

Named lock принадлежит соединению. Поэтому получить его на одном connection, а освободить на другом нельзя.

Обязательный `finally`:

```text
RELEASE_LOCK(...)
connection.release()
```

Сами изменения служебного каталога сохраняются транзакционно:

```text
begin
→ resources
→ fields
→ constraints
→ indexes
→ scan succeeded
commit
```

При ошибке:

```text
rollback
→ безопасно отметить scan как failed отдельной операцией
→ старый активный cache оставить без изменений
```

Не обещай абсолютный point-in-time snapshot, если другая система одновременно выполняет DDL. Для MVP достаточно обнаружить несогласованность, завершить scan ошибкой и предложить повторить.

## 12. Cache

Query Engine не должен читать `INFORMATION_SCHEMA` при каждом запросе.

Первая версия cache может быть обычным объектом в памяти одного Node-процесса:

```text
catalog
revision/fingerprint
loadedAt
```

Правила:

1. При первом обращении загрузить текущий каталог из служебных таблиц.
2. После успешного scan заменить cache целиком.
3. После failed scan сохранить предыдущую версию.
4. Не менять объекты snapshot после помещения в cache.
5. При нескольких экземплярах сервера in-memory cache уже недостаточен; это отдельный этап после MVP.

Cache хранит производную копию. Источником истины остаются MySQL schema и сохранённый catalog.

## 13. Ошибки и API-коды

Добавь доменные ошибки, а в HTTP-слое преобразуй их в существующий формат API.

Нужны коды уровня:

```text
SCHEMA.SCAN_ALREADY_RUNNING
SCHEMA.SCAN_FAILED
SCHEMA.CATALOG_NOT_READY
SCHEMA.RESOURCE_NOT_FOUND
SCHEMA.FIELD_NOT_FOUND
SCHEMA.CATALOG_CHANGED
```

Технические сведения идут в structured logger. Клиент получает стабильный code и безопасные params, но не SQL, пути сервера и stack trace.

Не делай `try/catch` в каждой repository-функции только ради повторного `throw`. Ошибка должна подняться в service/controller chain и попасть в общий `errorHandler`.

## 14. HTTP API

Минимальные endpoints:

```text
POST /api/schema/scan
GET  /api/schema/status
GET  /api/resources
GET  /api/resources/:resourceId
```

### `POST /api/schema/scan`

Доступен только:

- после успешной авторизации;
- активному администратору;
- когда установка имеет статус `ready`;
- с rate limit;
- при отсутствии другого scan lock.

Ответ возвращает summary, а не весь внутренний snapshot:

```text
scanId
status
addedResources
changedResources
missingResources
addedFields
changedFields
missingFields
```

Для небольшой базы scan может быть синхронным HTTP-запросом. Фоновая очередь и progress polling нужны только после появления реальной проблемы с длительностью.

### `GET /api/resources`

Возвращает безопасное представление пользовательских ресурсов. Не возвращает служебные таблицы, внутренние SQL-выражения и чувствительные metadata обычному менеджеру.

## 15. Installation и onboarding — разные вещи

Не добавляй scan внутрь миграционной транзакции и не откатывай статус установки из `ready`.

Смысл состояний:

```text
installation ready
    = сервер установлен, admin создан, вход возможен

catalog missing
    = администратор ещё не прошёл настройку данных
```

После login клиент получает onboarding status:

```text
schema_scan_required
menu_configuration_required
completed
```

Если scan сломался, администратор всё равно должен войти, увидеть диагностику и повторить операцию. Авторизация не должна зависеть от исправности пользовательской схемы.

## 16. Интеграция с Query Engine

Текущий `UnifiedQuery` содержит строковые `table` и `field`. Такой объект нельзя напрямую принимать от HTTP-клиента как доверенный запрос.

Целевая цепочка:

```text
resourceId / fieldId из Page Definition
        ↓
Schema Catalog resolver
        ↓
проверенные реальные identifiers
        ↓
Permission Policy
        ↓
Authorized Query AST
        ↓
MySqlCompiler
```

Schema Catalog проверяет:

- resource существует и `present`;
- resource не служебный;
- field принадлежит resource;
- field существует и `present`;
- оператор совместим с типом;
- generated/auto increment поле нельзя записывать;
- JOIN соответствует известной или подтверждённой relation.

Компилятор отвечает за корректный SQL и параметры. Он не должен сам читать `INFORMATION_SCHEMA`.

## 17. Интеграция с Page Definition и меню

После готовности каталога создаётся отдельная сущность Page.

```text
Menu Item → pageId → Page Definition → resourceId/fieldId → Schema Catalog
```

Page Definition может описывать:

- один root resource;
- разрешённые joins;
- выбранные fields;
- renderer каждого результата;
- подписи и порядок колонок;
- доступные фильтры и сортировку.

Menu item не должен хранить SQL и не должен быть единственной проверкой прав.

Если поле Page Definition стало `missing`, страница получает статус `invalid`, но её конфигурация не удаляется.

## 18. Порядок реализации

### Этап 1. Завершить normalized types

Результат:

- все типы snapshot определены;
- `DBTable` содержит indexes;
- тип индекса строковый;
- raw-типы ещё не смешаны с normalized.

Критерий: типы описывают пример `users/orders` без `any`.

### Этап 2. Прочитать tables и columns

Реализовать два запроса и raw row types.

Пока не сохранять результат в служебные таблицы.

Критерий: тестовый вызов возвращает таблицы с колонками в правильном порядке.

### Этап 3. Добавить keys и relations

Реализовать primary, unique и foreign keys с поддержкой составных ключей.

Критерий: `orders.user_id → users.id` появляется ровно одной relation.

### Этап 4. Добавить indexes

Реализовать группировку `STATISTICS` по имени и `SEQ_IN_INDEX`.

Критерий: составной index сохраняет порядок колонок.

### Этап 5. Вынести чистый builder и покрыть unit-тестами

Тесты используют массивы raw rows, а не настоящую MySQL.

Критерий: builder детерминирован и не делает I/O.

### Этап 6. Добавить migration служебного каталога

Создать scans, resources, fields, constraints и indexes в порядке foreign-key зависимостей.

Критерий: чистая база успешно проходит весь migration plan.

### Этап 7. Реализовать repository и synchronizer

Сначала построить diff, затем транзакционно применить его.

Критерий: повторный scan не создаёт дубликатов и не меняет ID.

### Этап 8. Добавить lock, service и cache

Критерий: два параллельных запуска не синхронизируют каталог одновременно; failed scan не портит активный cache.

### Этап 9. Добавить защищённый API

Использовать существующие `auth`, `statusReady`, `asyncHandler`, API code catalog и `errorHandler`.

Критерий: неавторизованный или не-admin пользователь не может запустить scan.

### Этап 10. Добавить onboarding UI

После первого входа администратор запускает scan и видит summary. После успеха он переходит к созданию Page/Menu.

Критерий: ошибка scan не ломает login и может быть повторена.

### Этап 11. Подключить Query Engine

Сначала catalog resolver и policy, только затем публичные динамические запросы.

Критерий: неизвестная таблица, колонка или `Auto_Admin__*` не может попасть в compiler.

## 19. Тестирование

### Unit-тесты builder-а

Обязательные сценарии:

- пустая пользовательская база;
- обычная таблица;
- view;
- nullable/default;
- auto increment;
- virtual и stored generated column;
- decimal precision/scale;
- primary key;
- составной primary key;
- unique key;
- foreign key;
- составной foreign key;
- обычный и составной index;
- служебная таблица;
- raw row с неизвестной таблицей;
- нарушенный порядок/пара foreign key.

### Unit-тесты synchronizer-а

- первый scan создаёт каталог;
- одинаковый повторный scan является idempotent;
- новая таблица добавляется;
- удалённая таблица становится missing;
- добавленная колонка получает новый ID;
- изменённый тип определяется как change;
- исчезнувшее поле не удаляет настройки;
- возвращённое поле снова становится present.

### Integration-тест MySQL

Создать отдельную случайную тестовую базу, таблицы, view, indexes и FK. Выполнить настоящий introspector и проверить snapshot.

Использовать существующую стратегию opt-in через `Auto_Admin__RUN_MYSQL_TESTS=1`. Никогда не запускать destructive integration test на базе пользователя.

### Security-тесты

- schema из тела запроса игнорируется/отклоняется;
- manager не запускает scan;
- служебные таблицы не появляются в публичном resource list;
- cross-schema relation не разрешается автоматически;
- неизвестный resourceId не превращается в SQL;
- два scan одновременно не выполняются.

## 20. Наблюдаемость

Логировать структурированно:

- scan ID;
- schema name;
- duration;
- количество tables/fields/relations;
- summary diff;
- status;
- request ID и actor ID для ручного запуска.

Не логировать:

- DB password;
- session token;
- данные строк пользовательских таблиц;
- полный Page Definition без необходимости;
- потенциально чувствительный SQL пользователя.

Полезные метрики позднее:

- длительность scan;
- количество failed scan;
- возраст активного catalog;
- количество invalid pages после schema change.

## 21. Типичные ошибки

### Использовать Query Engine для introspection

Нельзя: Query Engine сам зависит от Schema Catalog. Получится циклическая зависимость.

### Генерировать TypeScript-файлы для пользовательских таблиц

Бесполезно для runtime-базы. Безопасность обеспечивает runtime catalog и валидация, а не сгенерированный после запуска compile-time тип.

### Доверять названиям из клиента

Даже если identifier экранирован, клиент может запросить существующее чувствительное поле. Нужна проверка resourceId/fieldId и прав.

### Смешать scanner, repository и service

Тогда невозможно отдельно тестировать преобразование, diff и ошибки MySQL.

### Удалять missing записи

Это уничтожает настройки и скрывает причину поломки страниц.

### Обновлять cache до commit

Процесс начнёт выполнять запросы по каталогу, которого ещё нет в БД или чья транзакция откатилась.

### Считать `_id` foreign key

Это только подсказка для будущей ручной relation. Настоящий FK существует только в metadata или явно подтверждённой настройке.

### Давать CRUD таблице без уникального идентификатора

Без primary/unique key нельзя гарантировать изменение одной конкретной строки. Default — read-only.

## 22. Definition of Done

Schema Catalog первой версии готов, когда:

- introspector читает только выбранную сервером schema;
- snapshot содержит tables, views, columns, keys, FK и indexes;
- составные объекты сохраняют порядок колонок;
- `Auto_Admin__*` отмечены и закрыты от generic CRUD;
- snapshot нормализован и детерминирован;
- catalog сохраняется транзакционно;
- повторный scan idempotent;
- missing объекты не удаляются физически;
- одновременный scan блокируется;
- cache меняется только после commit;
- есть unit и opt-in MySQL integration tests;
- API доступен только администратору;
- ошибки используют единый каталог code-ов;
- Query Engine разрешает identifiers только через catalog;
- изменение схемы инвалидирует зависимые Page Definition, но не удаляет их;
- login и восстановление остаются доступны при failed scan.

После этого можно безопасно переходить к Page Definition, настройке меню и универсальной таблице.
