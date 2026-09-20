# Multi-Database Architecture: план подготовки Auto Admin

## 1. Назначение документа

Этот документ фиксирует архитектурный план перехода Auto Admin от неявной привязки к MySQL к системе, в которой тип активной СУБД выбирается явно.

Документ нужен как долговременная точка восстановления контекста. После перезапуска чата или длительного перерыва разработку следует продолжать, сверяясь с разделами «Принятые решения», «Этапы реализации» и «Текущее состояние».

На первом этапе Auto Admin по-прежнему реально поддерживает только MySQL. PostgreSQL и SQLite учитываются архитектурой, но не объявляются работающими до появления полного набора реализаций и тестов.

## 2. Цель

Нужно получить архитектуру, в которой:

- активная СУБД явно задаётся в конфигурации;
- существует каталог известных и реально поддерживаемых СУБД;
- бизнес-сервисы не импортируют `mysql2` и не выбирают SQL-диалект;
- каждый модуль может иметь отдельную реализацию repository для каждой СУБД;
- Query Engine выбирает правильные compiler и driver;
- Schema Catalog выбирает правильные introspector, persistence repository и scan lock;
- Migration Engine выбирает собственные SQL-файлы, history repository, lock и verification;
- неподдерживаемая комбинация СУБД и подсистемы завершается явной контролируемой ошибкой;
- добавление PostgreSQL или SQLite не требует переписывания бизнес-логики приложения.

## 3. Что есть сейчас

Проект фактически является MySQL-приложением, хотя это не выражено единым архитектурным решением.

MySQL-зависимости находятся в нескольких местах:

1. `server/src/db`
   - создание pool через `mysql2`;
   - типы `Pool`, `PoolConnection`, `RowDataPacket`, `ResultSetHeader`;
   - транзакции;
   - проверка подключения.
2. Query Engine
   - `MySqlCompiler`;
   - `MySqlDriver`;
   - прямое создание MySQL driver внутри service и pipeline;
   - MySQL placeholders и экранирование идентификаторов.
3. Schema Catalog
   - чтение `INFORMATION_SCHEMA`;
   - MySQL raw row types;
   - MySQL repository SQL;
   - `GET_LOCK` для scan lock;
   - `ON DUPLICATE KEY UPDATE`.
4. Migration Engine
   - все SQL-файлы написаны для MySQL;
   - migration history создаётся MySQL SQL;
   - migration lock использует `GET_LOCK`;
   - verification читает MySQL `information_schema`;
   - recovery repository использует MySQL-синтаксис.
5. Системные repositories
   - auth;
   - install;
   - регистрация администратора;
   - login attempts cleanup;
   - будущие menu/page/permission repositories.

Особенно диалектозависимы конструкции `DATE_SUB`, `<=>`, обратные кавычки, `NOW()`, `AUTO_INCREMENT`, `ENUM`, `UNSIGNED`, `ON DUPLICATE KEY UPDATE` и `ON UPDATE CURRENT_TIMESTAMP`.

## 4. Термины

### Database type

Вид СУБД:

```text
mysql
postgresql
sqlite
```

Рекомендуемая переменная окружения:

```env
Auto_Admin__DB_TYPE=mysql
```

`DB_TYPE` нельзя путать с `DB_DATABASE`:

- `DB_TYPE=mysql` — используемый SQL-диалект и драйвер;
- `DB_DATABASE=shop` — имя конкретной базы пользователя.

### Database descriptor

Статическое описание известной СУБД: отображаемое имя, стандартный port, общий статус и готовность отдельных подсистем.

### Database provider

Реализация общих инфраструктурных операций для конкретной СУБД: подключение, pool, проверка соединения, транзакция и завершение работы.

Provider базы не должен содержать `AuthRepository`, `MenuRepository` и другие бизнес-repositories.

### Dialect implementation

Реализация конкретной подсистемы для определённой СУБД, например:

- `MySqlAuthRepository`;
- `MySqlQueryCompiler`;
- `MySqlSchemaIntrospector`;
- `MySqlMigrationProvider`.

### Composition root

Единственное место, где при запуске приложения читается конфигурация и выбираются конкретные реализации интерфейсов.

## 5. Главные архитектурные правила

### 5.1. Выбор выполняется один раз

Нельзя читать `DB_TYPE` и выполнять `switch` внутри каждой repository-функции или каждого HTTP-запроса.

Целевая последовательность:

```text
запуск приложения
→ прочитать DB_TYPE
→ проверить поддержку
→ создать Database Provider
→ выбрать реализации подсистем и repositories
→ передать их сервисам
→ запустить HTTP-сервер
```

### 5.2. Бизнес-сервис зависит от контракта

Например, `AuthService` зависит от `AuthRepository`, а не от `MySqlAuthRepository`.

```text
AuthService → AuthRepository contract ← MySqlAuthRepository
```

Внутри `AuthService` не должно быть:

- импорта `mysql2`;
- проверки `DB_TYPE`;
- MySQL SQL;
- создания MySQL connection.

### 5.3. Repositories остаются внутри бизнес-модулей

MySQL-реализация Auth Repository относится к Auth Module, а не к Database Module.

Database Module предоставляет инфраструктуру подключения. Он не должен знать про пользователей, роли, меню, страницы и авторизацию.

### 5.4. Неполная поддержка не считается полной

Поддержка подключения к PostgreSQL ещё не означает поддержку PostgreSQL проектом. Готовность должна учитываться по подсистемам:

```text
connection
systemRepositories
queryEngine
schemaCatalog
migrations
```

Пока все необходимые подсистемы не реализованы и не проверены, СУБД имеет статус `planned`.

### 5.5. Никаких фиктивных реализаций

На первом этапе не нужно создавать пустые классы PostgreSQL и SQLite, которые бросают `Not implemented` из каждого метода.

Достаточно:

- описать типы `postgresql` и `sqlite` в каталоге;
- отметить подсистемы как неподдерживаемые;
- выдавать одну понятную ошибку при попытке выбрать неподдерживаемую СУБД.

## 6. Database Module

Рекомендуемая структура:

```text
server/src/db/
├─ index.ts
├─ database.types.ts
├─ database.catalog.ts
├─ database.config.ts
├─ database.errors.ts
├─ database-provider.interface.ts
├─ database-provider.registry.ts
└─ providers/
   └─ mysql/
      ├─ mysql.provider.ts
      ├─ mysql.connection.ts
      └─ mysql.transaction.ts
```

В будущем появятся:

```text
providers/postgresql/
providers/sqlite/
```

### Ответственность Database Module

- определить активный `DatabaseType`;
- вернуть descriptor СУБД;
- проверить готовность подсистемы;
- создать pool или connection;
- выполнить callback в транзакции;
- проверить соединение;
- корректно закрыть ресурсы.

### Чего Database Module не делает

- не содержит SQL авторизации;
- не содержит миграции;
- не строит `DBSnapshot`;
- не компилирует `UnifiedQuery`;
- не знает структуру Page/Menu;
- не выбирает права пользователей.

## 7. Каталог СУБД

Первая версия каталога должна отражать реальное состояние:

| СУБД | Общий статус | Connection | Repositories | Query Engine | Schema Catalog | Migrations |
|---|---|---:|---:|---:|---:|---:|
| MySQL | supported | да | да | да | да | да |
| PostgreSQL | planned | нет | нет | нет | нет | нет |
| SQLite | planned | нет | нет | нет | нет | нет |

Каталог является статической конфигурацией приложения, а не служебной таблицей пользовательской базы.

Позже он может использоваться:

- установочным API;
- формой выбора СУБД;
- проверкой startup configuration;
- диагностикой;
- feature flags, зависящими от возможностей СУБД.

## 8. Переменные окружения и установка

На подготовительном этапе:

```env
Auto_Admin__DB_TYPE=mysql
```

Если переменная отсутствует, для обратной совместимости используется `mysql`.

После появления выбора в установщике запрос проверки подключения должен содержать `type`. После успешной проверки установщик сохраняет его вместе с остальными параметрами:

```text
Auto_Admin__DB_TYPE
Auto_Admin__DB_HOST
Auto_Admin__DB_PORT
Auto_Admin__DB_DATABASE
Auto_Admin__DB_USERNAME
Auto_Admin__DB_PASSWORD
```

Для SQLite форма конфигурации будет другой: ей не нужны host, port, username и password. Поэтому validation schema подключения в будущем должна стать discriminated union по `type`, а не одной общей схемой со всеми обязательными сетевыми полями.

Тип СУБД считается конфигурацией запуска. Он не переключается между HTTP-запросами. Смена установленной СУБД — отдельная административная операция с перезапуском и проверкой совместимости.

## 9. Repositories бизнес-модулей

Рекомендуемая структура на примере Auth:

```text
server/src/modules/auth/
├─ auth.service.ts
├─ auth.controller.ts
├─ auth.types.ts
└─ repository/
   ├─ auth.repository.interface.ts
   ├─ auth.repository.factory.ts
   └─ mysql/
      ├─ mysql-auth.repository.ts
      └─ mysql-auth.repository.types.ts
```

Позже:

```text
repository/postgresql/postgresql-auth.repository.ts
repository/sqlite/sqlite-auth.repository.ts
```

Та же структура применяется к:

- install;
- register admin;
- menu;
- permissions;
- page definitions;
- другим модулям с собственным SQL.

### Repository factory

Factory получает активный Database Provider или `DatabaseType` и один раз создаёт нужную реализацию.

Factory не должен выбираться заново при каждом вызове метода.

### Repository contract

Контракт описывает операции предметной области, а не SQL-драйвер:

```text
getUserByUsername
createSession
getActiveSessionByTokenHash
revokeSessionByTokenHash
getLoginAttempts
```

В контракт нельзя выносить `RowDataPacket`, `ResultSetHeader`, `PoolConnection` и другие типы конкретного драйвера.

## 10. Транзакции

Сейчас MySQL connection местами передаётся из service в repository. Это протекание реализации драйвера в бизнес-слой.

Целевая схема:

```text
Database Provider
→ открывает transaction context
→ создаёт scoped repositories на этом context
→ callback выполняет бизнес-операцию
→ provider делает commit или rollback
```

Нужно отдельно спроектировать общий transaction context. Он не должен экспортировать `mysql.PoolConnection`.

Возможная форма ответственности:

```text
database.transaction(context => ...)
repositoryFactory.create(context)
```

На первом подготовительном этапе нельзя торопиться с универсальным `query()`-интерфейсом. MySQL, PostgreSQL и SQLite возвращают разные структуры результатов. Сначала следует определить реальные требования существующих repositories.

## 11. Query Engine

Общими остаются:

- `UnifiedQuery`;
- Query AST;
- pipeline definition;
- context resolver;
- единый `CompiledQuery`;
- единый `QueryResult`.

Диалектозависимыми являются:

- compiler;
- driver;
- placeholders;
- экранирование identifiers;
- `RETURNING`;
- регистронезависимый поиск;
- JSON operations;
- особенности limit/offset;
- извлечение `insertId` и `affectedRows`.

Структура:

```text
core/query-engine/
├─ compiler/
│  ├─ query-compiler.interface.ts
│  └─ mysql/
│     └─ mysql.compiler.ts
├─ drivers/
│  ├─ database-driver.interface.ts
│  └─ mysql/
│     └─ mysql.driver.ts
├─ query-engine.provider.ts
├─ query-engine.service.ts
└─ pipeline/
```

Целевая цепочка:

```text
UnifiedQuery
→ активный QueryCompiler
→ CompiledQuery
→ активный DatabaseDriver
→ QueryResult
```

`QueryEngineService` и `PipelineExecutor` не должны напрямую импортировать `MySqlCompiler` и `MySqlDriver`.

## 12. Schema Catalog

Общими остаются:

- нормализованный `DBSnapshot`;
- stored types;
- diff;
- cache;
- fingerprint;
- общая последовательность scan;
- состояния `present/missing`.

Диалектозависимыми являются:

- raw metadata types;
- introspection;
- persistence repositories;
- scan lock;
- часть нормализации типов и возможностей индексов.

Источники метаданных:

```text
MySQL      → INFORMATION_SCHEMA
PostgreSQL → information_schema + pg_catalog
SQLite     → PRAGMA table_info/index_list/foreign_key_list
```

Рекомендуемая структура:

```text
core/schema-catalog/
├─ types/
├─ cache/
├─ synchronizer/
├─ schema-catalog.service.ts
└─ providers/
   ├─ schema-catalog-provider.interface.ts
   └─ mysql/
      ├─ mysql-information-schema.types.ts
      ├─ mysql-schema-introspector.ts
      ├─ mysql-catalog.repository.ts
      └─ mysql-schema-scan-lock.ts
```

Каждый provider обязан возвращать одну и ту же нормализованную модель каталога. Raw metadata разных СУБД не должны выходить за пределы provider.

## 13. Migration Engine

Разнести только SQL-файлы недостаточно. От СУБД зависят:

- каталог SQL-файлов;
- создание migration history;
- SQL history repository;
- lock;
- выполнение migration SQL;
- verification;
- recovery audit repository.

Общими остаются:

- версия и имя миграции;
- checksum;
- построение migration plan;
- проверка порядка;
- состояния `running/applied/failed`;
- общая оркестрация runner и recovery.

Рекомендуемая структура:

```text
server/src/migrations/
├─ migration.types.ts
├─ migration.plan.ts
├─ migration.runner.ts
├─ migration.recovery.ts
├─ migration-provider.interface.ts
└─ providers/
   └─ mysql/
      ├─ sql/
      │  ├─ 0001__Auto_Admin__installation.sql
      │  └─ ...
      ├─ mysql-migration.catalog.ts
      ├─ mysql-migration.repository.ts
      ├─ mysql-migration.lock.ts
      ├─ mysql-migration.verification.ts
      ├─ mysql-migration-recovery.repository.ts
      └─ mysql-migration.provider.ts
```

В будущем PostgreSQL и SQLite получают собственные каталоги файлов. Логические номера миграций рекомендуется сохранять одинаковыми между диалектами, но содержимое и checksum будут разными.

Примеры lock-механизмов:

```text
MySQL      → GET_LOCK / RELEASE_LOCK
PostgreSQL → advisory lock
SQLite     → process/file lock с учётом одного writer
```

## 14. Bootstrap и Install

Bootstrap не должен содержать диалектный SQL. Он оркестрирует:

```text
Database Provider → проверить конфигурацию и соединение
Migration Provider → получить migration plan
Install Repository → прочитать installation status
```

Install flow в будущем:

```text
пользователь выбирает DB_TYPE
→ вводит параметры, подходящие типу
→ provider проверяет подключение
→ конфигурация безопасно сохраняется
→ создаётся runtime provider
→ запускается каталог миграций выбранного диалекта
```

Пока UI выбора не реализован, `mysql` используется по умолчанию.

## 15. Composition Root

Нужно определить одно место сборки runtime-зависимостей. Оно может находиться, например, в:

```text
server/src/app.dependencies.ts
```

или внутри отдельного bootstrap infrastructure module.

Его ответственность:

```text
прочитать конфигурацию
→ получить Database Provider
→ создать dialect providers
→ создать repositories
→ создать services
→ передать services контроллерам/routes
```

Нельзя превращать composition root в service locator, который вызывается из каждой функции. После сборки готовые зависимости передаются потребителям явно или через ограниченные module-level singleton instances.

## 16. Порядок реализации

### Этап 1. Database Module — подготовка фундамента

Добавить:

- `DatabaseType`;
- каталог СУБД;
- статусы `supported/planned`;
- матрицу поддержки подсистем;
- `Auto_Admin__DB_TYPE` с default `mysql`;
- безопасную ошибку unsupported database/subsystem;
- интерфейс Database Provider;
- registry единственного MySQL provider.

На этом этапе поведение приложения не должно измениться.

Критерий: проект явно знает, что активная база — MySQL, и не может молча запустить MySQL-код при выбранном PostgreSQL.

### Этап 2. Connection lifecycle

Перенести в MySQL provider:

- создание pool;
- reset/close;
- check connection;
- получение конфигурации;
- транзакционный lifecycle.

Убрать прямой импорт `mysql2` из общих сервисов.

Критерий: bootstrap и install работают через Database Provider, сохраняя текущее поведение.

### Этап 3. Первый repository как шаблон

Начать с Auth Repository:

- описать контракт;
- перенести SQL в `repository/mysql`;
- создать factory;
- передать repository в Auth Service;
- не менять внешний HTTP API.

После проверки использовать Auth как образец для остальных модулей.

Критерий: Auth Service не импортирует `mysql2`, `getPool` и MySQL repository напрямую.

### Этап 4. Остальные системные repositories

Последовательно перенести:

1. register admin;
2. install;
3. login attempts cleanup;
4. menu/permissions;
5. новые Page repositories.

Критерий: весь SQL бизнес-модулей расположен в dialect-specific repository implementations.

### Этап 5. Query Engine

- вынести общий контракт compiler;
- вынести `CompiledQuery` из MySQL-файла;
- создать Query Engine provider registry;
- перестать создавать MySQL compiler/driver внутри service и pipeline;
- отдельно спроектировать транзакционные pipeline.

Критерий: Query Engine Service не содержит слова `MySql` и не импортирует `mysql2`.

### Этап 6. Schema Catalog

- ввести provider contract;
- переместить MySQL raw types/introspector/repositories/lock в MySQL provider;
- оставить snapshot, diff, cache и общие types независимыми;
- внедрить provider в Schema Catalog Service.

Критерий: service оркестрирует scan, не зная источник системных metadata и механизм lock.

### Этап 7. Migration Engine

- ввести Migration Provider;
- переместить MySQL SQL в provider directory;
- разделить общий runner и MySQL history/lock/verification/recovery repositories;
- выбирать каталог по активному `DB_TYPE`;
- сохранить совместимость истории существующей MySQL-установки.

Критерий: общий migration runner не импортирует `mysql2` и не содержит MySQL SQL.

### Этап 8. Полный аудит MySQL leakage

Проверить весь `server/src` поиском:

```text
mysql2
PoolConnection
RowDataPacket
ResultSetHeader
INFORMATION_SCHEMA
GET_LOCK
ON DUPLICATE KEY
DATE_SUB
AUTO_INCREMENT
```

Каждое совпадение должно находиться либо в MySQL provider/repository, либо в MySQL-тесте.

### Этап 9. Подготовка UI выбора

Только после стабилизации backend architecture:

- endpoint каталога поддерживаемых СУБД;
- выбор типа в installer UI;
- разные формы параметров подключения;
- запрет выбора `planned` providers.

## 17. Тестовая стратегия

### Общие contract tests

Для repository contracts следует определить одинаковые сценарии, которые позже сможет пройти каждая реализация.

Например для Auth Repository:

- пользователь находится по username;
- активная session читается;
- revoked session не считается активной;
- login attempts считаются одинаково по смыслу;
- cleanup возвращает количество удалённых записей.

### Диалектные tests

- MySQL repositories — на отдельной MySQL test database;
- PostgreSQL repositories — на отдельной PostgreSQL test database;
- SQLite repositories — на отдельном временном файле или in-memory database, если поведение совпадает с production mode.

### Registry tests

- `mysql` возвращает рабочий provider;
- `postgresql` и `sqlite` пока дают контролируемую unsupported error;
- неизвестное значение не проходит env validation;
- отсутствующее значение даёт `mysql`.

### Regression

На каждом этапе должны проходить существующие MySQL unit tests. Integration tests запускаются только на специально выделенных test databases.

## 18. Что пока не делаем

- не реализуем PostgreSQL SQL;
- не реализуем SQLite SQL;
- не устанавливаем `pg` или SQLite driver;
- не создаём фиктивные provider-классы с пустыми методами;
- не меняем публичный API без необходимости;
- не разрешаем переключать СУБД во время обработки запроса;
- не строим универсальный SQL builder для служебных repositories;
- не смешиваем Database Provider с бизнес-repositories;
- не объявляем СУБД поддерживаемой частично.

## 19. Риски и вопросы, которые нужно решать отдельно

### Универсальный transaction context

Нужно определить, как сервис запускает несколько repository-операций в одной транзакции без передачи `mysql.PoolConnection`. Это проектируется после аудита существующих транзакционных use cases.

### Различия типов данных

`BIGINT`, boolean, date/time, JSON и decimal возвращаются драйверами по-разному. Нормализация должна происходить на границе driver/repository, а не в контроллерах.

### SQLite namespaces

В SQLite нет schema в том же смысле, что в MySQL/PostgreSQL. Общая модель Schema Catalog должна допускать provider-specific трактовку namespace.

### Migration checksums

SQL разных диалектов имеет разные checksum. Migration history хранится внутри выбранной базы, поэтому это допустимо, но recovery API всегда должен использовать каталог активного provider.

### Изменение DB_TYPE после установки

Простая замена `DB_TYPE` не переносит служебные данные Auto Admin. Миграция между СУБД является отдельной будущей задачей и не входит в multi-database runtime architecture.

## 20. Принятые решения

На момент создания документа согласованы следующие решения:

1. Создаётся отдельный Database Module.
2. Активная СУБД задаётся через `Auto_Admin__DB_TYPE`.
3. По умолчанию используется MySQL.
4. Реально поддерживается только MySQL.
5. PostgreSQL и SQLite учитываются как `planned`.
6. Реализация repository выбирается один раз, а не при каждом вызове.
7. Dialect repositories хранятся внутри соответствующих бизнес-модулей.
8. Database Module не знает о бизнес-repositories.
9. Query Engine, Schema Catalog и Migration Engine имеют собственные dialect providers.
10. Общая бизнес-логика не импортирует типы конкретного DB driver.
11. Сначала создаётся фундамент и переносится существующий MySQL-код без изменения поведения.
12. PostgreSQL и SQLite реализуются только после завершения архитектурного разделения MySQL.

## 21. Текущее состояние

На момент создания документа:

- архитектурный план согласован;
- код multi-database architecture ещё не реализуется;
- следующий этап — «Этап 1. Database Module — подготовка фундамента»;
- разработчик пишет код самостоятельно;
- наставник объясняет задачи, помогает проектировать и проверяет реализацию;
- текущая рабочая СУБД — MySQL.

## 22. Как восстановить контекст

После потери контекста нужно:

1. Прочитать этот документ полностью.
2. Проверить раздел «Текущее состояние».
3. Посмотреть `git log` и `git status`.
4. Сравнить код с критериями текущего этапа.
5. Не начинать следующий этап, пока критерий текущего не выполнен.
6. Не писать PostgreSQL/SQLite реализации раньше завершения отделения MySQL.
7. Не менять код вместо разработчика без его прямой просьбы.

