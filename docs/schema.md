# Auto Admin: архитектура и план развития

## 1. Назначение проекта

Auto Admin — самостоятельная административная панель, которая подключается к существующей базе данных, изучает её структуру и сразу создаёт безопасный базовый интерфейс для просмотра и редактирования данных.

Главная ценность продукта: пользователь разворачивает админку за несколько действий, получает рабочий интерфейс без ручного описания каждой таблицы, а затем один раз настраивает отображение, связи и права доступа.

Основной сценарий:

1. Владелец запускает Auto Admin и подключает базу.
2. Система создаёт только собственные служебные таблицы, не изменяя таблицы приложения.
3. Владелец создаёт первого администратора.
4. Система сканирует таблицы, колонки, ключи и связи.
5. Администратор сразу видит исходные данные.
6. В настройках он выбирает подписи, основные и дополнительные поля, типы отображения, связи и права.
7. Сохранённая конфигурация применяется во всех следующих сессиях.

## 2. Границы первой версии

MVP поддерживает только MySQL 8.x. «Подключение к любой базе данных» остаётся целью продукта, но реализуется через адаптеры после стабилизации MySQL-версии. Одновременная поддержка нескольких СУБД на раннем этапе сильно усложнит introspection, типы полей, quoting идентификаторов, пагинацию и транзакции.

В MVP входят:

- безопасная установка и повторный запуск;
- вход, выход, сессия и первый администратор;
- сканирование таблиц, колонок, первичных и внешних ключей;
- просмотр таблицы с серверной пагинацией, сортировкой и фильтрами;
- просмотр одной записи;
- настройка видимости, подписи и представления поля;
- основные и дополнительные поля;
- автоматические и ручные связи;
- CRUD только после явного разрешения;
- роли и права на уровне таблицы и действия;
- журнал административных действий.

Не входят в MVP:

- другие СУБД;
- конструктор дашбордов;
- произвольные SQL-запросы;
- сложные workflow;
- произвольный row-level security;
- собственное файловое хранилище;
- плагины и пользовательский JavaScript;
- изменение структуры пользовательских таблиц.

## 3. Текущее состояние

На 15 июля 2026 года в проекте есть:

- React + TypeScript клиент на Vite;
- Express + TypeScript сервер;
- подключение к MySQL через `mysql2`;
- проверка подключения и создание `.Auto-Admin.env`;
- собственный механизм SQL-миграций;
- служебные таблицы ролей, пользователей и журнала авторизации;
- интерфейс запуска миграций;
- форма и серверный код создания первого администратора;
- заготовки авторизации и ролей;
- единый формат API-ответов.

Это нормальная основа прототипа. Переписывать проект с нуля не нужно, но до динамических таблиц необходимо закрыть проблемы установки, авторизации и безопасности из раздела 14.

## 4. Архитектурные принципы

1. **Таблицы пользователя неприкосновенны.** Миграции Auto Admin работают только со служебными объектами с зарезервированным префиксом.
2. **Метаданные отделены от данных.** Служебная схема известна заранее, пользовательская обнаруживается во время выполнения.
3. **Сервер ничему не доверяет.** Имена таблиц и колонок, фильтры, сортировка, relations и body проверяются по каталогу и правам.
4. **Безопасность задаётся на сервере.** Скрытая кнопка React не является проверкой доступа.
5. **Defaults безопасны.** После сканирования чтение доступно только администратору, запись выключена до настройки.
6. **Настройки дополняют реальную схему, но не заменяют её.**
7. **MVP остаётся простым.** Новая библиотека добавляется под конкретную потребность.

## 5. Целевая архитектура

```text
React application
  ├─ installation wizard
  ├─ authentication screens
  ├─ universal data table and record form
  └─ configuration and access screens
                 │ HTTPS / JSON
                 ▼
Express API
  ├─ installation
  ├─ authentication and sessions
  ├─ schema introspection
  ├─ metadata and configuration
  ├─ authorization policy
  ├─ dynamic data gateway
  └─ audit
                 │
                 ▼
DatabaseAdapter
  └─ MySqlAdapter (MVP)
       ├─ Auto_Admin__* service tables
       ├─ INFORMATION_SCHEMA (read only)
       └─ application tables (by permissions)
```

Служебный слой работает только с `Auto_Admin__*`: установкой, пользователями, сессиями, ролями, правами, каталогом структуры, настройками и аудитом.

Динамический слой не принимает произвольный SQL. Он строит запрос только из объектов каталога, разрешённых операций, валидированных параметров и параметризованных значений.

React получает описание ресурса и данные от API. Универсальные `DataTable`, `RecordView` и `RecordForm` выбирают renderer/editor по типу и настройке поля.

## 6. Выбор технологий

Оставить в MVP:

- Node.js, TypeScript и Express 5;
- `mysql2/promise`;
- Zod;
- React, Vite, React Router и React Hook Form;
- текущие SQL-миграции после их укрепления.

Добавлять по мере необходимости:

- `@tanstack/react-table` при создании универсальной таблицы, сохраняя пагинацию и фильтры серверными;
- готовый доступный UI-kit перед масштабированием интерфейса;
- структурированный logger, например Pino;
- rate limiting и session storage вместе с авторизацией.

Пока не добавлять Knex и Drizzle одновременно с `mysql2`. Knex не делает произвольные идентификаторы из URL автоматически безопасными, а Drizzle не решает неизвестную схему. Сначала нужен собственный интерфейс `DatabaseAdapter` и небольшой безопасный query builder. Реализацию адаптера позже можно перевести на Knex без изменения доменных модулей.

Переход с Express на Fastify тоже не приоритет: раньше узким местом станут база и запросы, а не JSON-сериализация.

## 7. Служебная модель данных

Точные типы фиксируются миграциями. Логически нужны следующие таблицы.

Установка:

- `Auto_Admin__installation`: статус `new | database_configured | migrated | admin_created | ready`;
- `Auto_Admin__schema_migrations`: имя, checksum и время;
- `Auto_Admin__settings`: версия приложения и общие настройки.

Авторизация:

- `Auto_Admin__users`;
- `Auto_Admin__roles`;
- `Auto_Admin__user_roles`;
- `Auto_Admin__sessions` с hash токена, expiry и revoke;
- `Auto_Admin__auth_logs`.

Каталог схемы:

- `Auto_Admin__resources`: таблица/view, внутренний ID, schema/table name и статус;
- `Auto_Admin__fields`: DB type, nullable, default, generated, primary/unique, порядок;
- `Auto_Admin__relations`: реальный FK или ручная связь;
- `Auto_Admin__schema_scans`: история сканирований и diff.

Настройки:

- `Auto_Admin__resource_settings`: подпись, меню, page size, default sort, CRUD;
- `Auto_Admin__field_settings`: подпись, renderer/editor, видимость, секция `primary | additional`, порядок, read-only, searchable, sortable, masking;
- `Auto_Admin__relation_settings`: display field и поведение выбора.

Права и аудит:

- `Auto_Admin__permissions`: role, resource и action `list | read | create | update | delete | configure | export`;
- `Auto_Admin__field_permissions`: чтение/изменение поля;
- `Auto_Admin__audit_log`: actor, action, resource, key, request ID, result и безопасный diff.

Имена пользовательских объектов хранятся в каталоге, но API обращается к ним по внутреннему ID или slug. Нельзя напрямую подставлять `req.params.tableName` в SQL.

## 8. Интроспекция и изменение схемы

MySQL-адаптер читает `INFORMATION_SCHEMA.TABLES`, `COLUMNS`, `TABLE_CONSTRAINTS`, `KEY_COLUMN_USAGE` и `STATISTICS` только для выбранной базы.

Первичное сканирование:

1. Исключает служебные таблицы.
2. Создаёт resources и fields.
3. Находит primary, unique и foreign keys.
4. Выбирает безопасные renderer/editor по DB type.
5. Таблицы без поддерживаемого уникального ключа делает read-only.
6. Создаёт defaults, не перезаписывая будущие настройки пользователя.

Повторное сканирование вычисляет diff:

- новые объекты добавляются с безопасным default;
- удалённые помечаются отсутствующими, но настройки сразу не удаляются;
- изменение типа помечает несовместимые renderer/editor;
- сломанная ручная relation выключается и показывается как проблема.

Суффикс `_id` — только подсказка. Он не является настоящей связью без FK или подтверждения администратора.

## 9. Представления и связи

Типы отображения MVP:

- text, long text, code;
- integer, decimal, currency;
- boolean;
- date, datetime, time;
- enum/select;
- URL, email и image by URL;
- JSON viewer;
- relation.

`image URL` сначала только отображает внешнюю картинку. Загрузка файла требует отдельного storage adapter.

Для каждого поля отдельно задаются показ в списке, карточке и форме, секция `primary` или `additional` и порядок. Поэтому список остаётся компактным, а «Дополнительные данные» раскрывают полную запись.

Foreign key нельзя заменять строкой имени. API сохраняет исходный ID и возвращает рядом отображение:

```json
{
  "user_id": 25,
  "user_id_display": {
    "label": "Иван Петров",
    "resourceId": "users",
    "recordKey": 25
  }
}
```

Для большой связанной таблицы selector использует серверный поиск и пагинацию. Ручная relation создаётся только между совместимыми колонками.

## 10. Безопасный динамический SQL

Перед запросом сервер:

1. Проверяет сессию и состояние `ready`.
2. Находит resource по внутреннему ID.
3. Проверяет право на действие.
4. Сверяет resource и fields с каталогом.
5. Оставляет только разрешённые поля.
6. Валидирует значения по DB types.
7. Quoting идентификаторов выполняет адаптер.
8. Значения передаются параметрами; применяются limit и timeout.
9. Составная операция выполняется транзакционно.
10. Действие записывается в audit log.

Ограничения:

- идентификаторы не берутся напрямую из URL/body;
- динамический API не использует `SELECT *`;
- list всегда ограничен;
- фильтры и сортировка имеют allowlist;
- update/delete требует однозначного primary/unique key;
- generated и read-only поля отклоняются;
- массовых update/delete нет в MVP;
- views по умолчанию read-only;
- системные таблицы и другие schemas недоступны;
- DB-пользователь имеет минимальные привилегии.

`BIGINT` нельзя безусловно превращать в JavaScript `number`. Большие значения передаются строкой. Для `mysql2` безопаснее `supportBigNumbers: true` и `bigNumberStrings: true` либо явный type casting.

## 11. Установка и первый администратор

Удаление кода регистрации после запроса не используется. Оно зависит от `tsx/dist`, конфликтует с контейнерами и read-only images, ломает повторное развёртывание и не защищает от параллельных запросов.

Установка — конечный автомат:

```text
new → database_configured → migrated → admin_created → ready
```

Правила:

- bootstrap доступен только в `new` и требует одноразовый installation token из server logs;
- credentials записываются атомарно с file mode `0600`;
- миграции запускает сервер, клиент показывает прогресс;
- первый admin создаётся транзакционно с блокировкой состояния;
- username имеет unique constraint;
- повторный admin отклоняется;
- после `ready` bootstrap endpoints возвращают `404` или `409`;
- повторный старт читает состояние из базы;
- reset установки — отдельная локальная CLI-команда, не HTTP endpoint.

В production предпочтительны Docker secrets, orchestrator или environment. Web-запись `.Auto-Admin.env` можно оставить для self-hosted сценария, но секреты нельзя возвращать в API и логи.

## 12. Авторизация и права

Для браузерной панели подходят opaque sessions:

- случайный token хранится в `HttpOnly; Secure; SameSite=Lax` cookie;
- в базе хранится только hash;
- есть expiry, revoke и rotation;
- login защищён rate limit;
- смена пароля/деактивация отзывают сессии;
- state-changing запросы имеют CSRF strategy.

JWT не нужен сам по себе: серверные сессии проще отозвать.

RBAC:

```text
session → active user → role permission → resource permission
        → field read/write permission → operation constraints
```

`admin` имеет все действия. Остальным ролям выдаются явные permissions. UI visibility и security permission — разные настройки.

## 13. API MVP

Installation:

- `GET /api/install/status`
- `POST /api/install/database`
- `POST /api/install/migrations`
- `POST /api/install/admin`

Authentication:

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

Schema/config:

- `GET /api/resources`
- `POST /api/schema/scan`
- `GET /api/schema/scans/:id`
- `GET|PATCH /api/resources/:resourceId/config`
- `PATCH /api/resources/:resourceId/fields/:fieldId/config`
- `POST /api/resources/:resourceId/relations`

Data:

- `GET /api/resources/:resourceId/records`
- `GET /api/resources/:resourceId/records/:recordKey`
- `POST /api/resources/:resourceId/records`
- `PATCH /api/resources/:resourceId/records/:recordKey`
- `DELETE /api/resources/:resourceId/records/:recordKey`

API использует request ID и стабильные error codes, не возвращает SQL, stack trace и credentials.

## 14. Аудит текущего кода

### Общая оценка

Код не «ужасный». Для раннего прототипа есть разумное разделение routes/controllers/services/repositories, strict TypeScript, Zod и параметризованные SQL-значения. Основная проблема — незавершённая граница installation/auth. Проект пока нельзя безопасно публиковать в сеть, но его можно довести до MVP без полного переписывания.

### Блокеры

1. **Installation API публичный.** `/api/install/check-connection` может перезаписать credentials, миграции не защищены состоянием/token.
2. **Самоудаление ненадёжно.** `fs.rmSync(__dirname, recursive)` зависит от среды и допускает race condition.
3. **Создание admin не атомарно.** Нет транзакции, блокировки и unique username.
4. **Audit INSERT сломан.** `register_success` передан без кавычек/placeholder и будет воспринят как колонка.
5. **Ошибки dynamic route не передаются Express.** Возвращается `ApiError` или вызывается `internal()` без `throw/next`; запрос может зависнуть.
6. **Контракт пароля расходится.** Схемы используют `confirmPassword`, controller читает `confirmPassword`.
7. **Auth отсутствует как законченная функция.** Routes не подключены, handlers пусты, сессий и guards нет.
8. **`multipleStatements: true` включён в общем pool.** В runtime pool это нужно выключить; миграциям нужен отдельный механизм.

### Высокий приоритет

- атомарная запись env и server-side Zod validation подключения;
- migration checksum и lock от параллельного запуска;
- точное имя migration из allowlist вместо `startsWith`;
- корректный путь SQL-файлов при запуске из `dist`;
- unique/normalized username;
- законченный login response;
- `string/number` вместо `String/Number`, меньше `any`;
- секреты и username не писать в production logs;
- удалить `registerNewAdmin[backup]`, историю хранить в Git.

### Средний приоритет

- единый стиль URL и имён функций;
- убрать debug logs, мёртвые функции и параметры;
- для HTTP 204 не отправлять JSON body;
- graceful shutdown;
- CORS из конфигурации;
- общий server/client API contract;
- заменить шаблонный README;
- общий formatter/linter для client и server.

### Фактическая проверка

- сервер проходит `tsc --noEmit`;
- client typecheck не проходит из-за трёх неиспользуемых сущностей в auth form и `apiClient.ts`;
- test scripts и тесты отсутствуют;
- `.Auto-Admin.env` исключён из Git правилом `*.env`;
- до переработки `docs/schema.md` был новым неотслеживаемым файлом.

## 15. План развития

### Этап 0. Стабилизация

Исправить блокеры, заменить self-delete на installation state/token, укрепить миграции, добавить validation, build/lint/test scripts и документацию запуска.

**Готово, когда:** чистая установка повторяема, параллельный запрос не создаёт второго admin, после `ready` install API закрыт, проверки зелёные.

### Этап 1. Авторизация

Реализовать login/logout/me, sessions, cookies, rate limit, revoke/expiry, React/API guards и смену пароля.

**Готово, когда:** неавторизованный пользователь не получает данные или метаданные.

### Этап 2. Каталог MySQL

Добавить `DatabaseAdapter`, `MySqlAdapter`, первичный/повторный scan, resources, fields, relations, diff и безопасные defaults.

**Готово, когда:** тестовая схема превращается в стабильный каталог без изменения таблиц пользователя.

### Этап 3. Read-only автоадминка

Список ресурсов, универсальная таблица, серверные pagination/sort/filter, карточка, сериализация date/decimal/bigint/JSON и read-only fallback.

**Готово, когда:** после scan безопасно просматриваются большие поддерживаемые таблицы.

### Этап 4. Настройка представления

Resource/field settings, подписи, порядок, hide/show, основные/дополнительные поля, renderers, preview и reset.

**Готово, когда:** настройки переживают повторный scan и одинаково применяются в UI.

### Этап 5. Relations

Реальные FK, display field, серверный search, ручные relations, переход к записи и защита от N+1.

**Готово, когда:** `user_id = 25` отображается именем, но исходный ID сохраняется и редактируется.

### Этап 6. Безопасный CRUD

Type-aware формы, field allowlist, validation, concurrency check, delete/FK handling и audit diff.

**Готово, когда:** запрещённые операции отклоняются сервером, разрешённые фиксируются в audit.

### Этап 7. Роли и права

Редактор ролей, resource/action и field permissions, policy engine и permission matrix tests.

**Готово, когда:** менеджер не может обойти ограничения прямым API-запросом.

### Этап 8. Production readiness

Security headers, HTTPS/secrets guide, structured logs, health/metrics, backup config, non-root Docker image, CI, load tests и upgrade/rollback.

После MVP: contract tests адаптера, PostgreSQL, dashboards, import/export, storage adapters, row-level policies и plugin SDK.

## 16. Тестирование

Unit:

- Zod и DB type → UI type;
- permission resolution;
- identifier quoting/query plan;
- schema diff;
- audit masking.

Integration с реальным MySQL:

- чистая и повторная установка;
- параллельный bootstrap;
- migrations/checksum;
- introspection сложных ключей и FK;
- CRUD, транзакции и constraints;
- запрет неизвестных/служебных identifiers;
- bigint/decimal/date round trips.

E2E:

- install wizard и recovery;
- login/session/logout;
- scan и просмотр;
- настройка, relation и CRUD;
- попытки обхода RBAC;
- повторный scan после изменения схемы.

Минимальный CI gate:

```text
format check → lint → typecheck → unit → MySQL integration → client build → e2e smoke
```

## 17. Ближайший backlog

Выполнять в таком порядке:

1. Удалить runtime self-delete и backup-копию.
2. Добавить migration с installation state, unique username и sessions.
3. Защитить install endpoints token и состоянием.
4. Исправить register transaction, audit INSERT и error propagation.
5. Завершить login/logout/me и подключить auth router.
6. Добавить тесты установки и авторизации на реальном MySQL.
7. Починить client typecheck и настроить CI gate.
8. Выделить `DatabaseAdapter` без смены `mysql2`.
9. Реализовать read-only introspection catalog.
10. Показать универсальный список одной выбранной таблицы.

После десятого пункта получится первый вертикальный срез: безопасная установка → вход → scan → автоматический просмотр. На нём следует проверить идею до конструктора и полного CRUD.

## 18. Критерий успеха MVP

Новый пользователь должен суметь:

1. Запустить Auto Admin по инструкции.
2. Подключить MySQL без изменения исходного кода.
3. Безопасно создать первого admin.
4. Войти и просканировать схему.
5. Увидеть таблицы и записи.
6. Настроить видимость, основные/дополнительные поля и image URL.
7. Настроить автоматическую или ручную relation.
8. Выдать менеджеру ограниченный доступ.
9. Выполнить разрешённый CRUD и увидеть audit event.
10. Перезапустить или обновить сервис без потери настроек и изменения пользовательских таблиц.

Всё, что не помогает пройти этот сценарий безопаснее или проще, не является приоритетом первой версии.
