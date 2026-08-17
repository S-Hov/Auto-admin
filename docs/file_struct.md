# Архитектура и структура бэкенда Auto Admin

## 1. Общий архитектурный обзор

Бэкенд Auto Admin реализован на базе **Node.js, Express 5, TypeScript и MySQL2** и спроектирован по принципу **модульного монолита (Modular Monolith)**.

### Ключевые архитектурные слои:
```text
┌─────────────────────────────────────────────────────────────┐
│                    HTTP & Entrypoint                        │
│             (app.ts, routes/ApiRouter.ts)                   │
├──────────────────────────────┬──────────────────────────────┤
│      Shared Infrastructure   │       Domain Modules         │
│  - Middlewares (auth, guard) │  - bootstrap (state machine) │
│  - API Response Formatters   │  - install (setup & admin)   │
│  - Error Handling & Utils    │  - auth (sessions & rbac)    │
│  - Constants & Types         │  - schema/introspection ...  │
├──────────────────────────────┴──────────────────────────────┤
│               Database & Persistence Layer                  │
│       - Connection Pool (db/)                               │
│       - Migration Engine (migrations/)                      │
│       - MySQL 8.x (Auto_Admin__* + User Database)           │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Полная карта файловой структуры (`server/src/`)

```text
server/src/
├── app.ts                         # Точка входа: инициализация Express, CORS, глобальных middleware
│
├── constants/                     # Глобальные неизменяемые константы
│   ├── cookies.ts                 # Имена кук (напр. AUTH_SESSION)
│   └── pagePaths.ts               # Маршруты перенаправлений клиента
│
├── db/                            # Слой подключения к MySQL и транзакций
│   ├── databaseConfig.ts          # Валидация наличия переменных окружения БД
│   ├── checkConnection.ts         # Проверка доступности подключения к MySQL
│   ├── db.types.ts                # TypeScript-типы системных таблиц AutoAdmin
│   └── index.ts                   # Экспорт общего пула (getPool) и withTransaction
│
├── migrations/                    # Автономная подсистема миграций служебных таблиц
│   ├── sql/                       # SQL-скрипты миграций (0001..0007)
│   ├── config.ts                  # Константы (имя таблицы истории, имя блокировки)
│   ├── migration.catalog.ts       # Сканирование, валидация и SHA-256 хеширование файлов
│   ├── migration.db.ts            # Выделенное одиночное соединение (multipleStatements)
│   ├── migration.errors.ts        # Доменные классы ошибок миграций
│   ├── migration.lock.ts          # Распределенные именованные блокировки MySQL (GET_LOCK)
│   ├── migration.plan.ts          # Построение плана и обработка повторов (Recovery)
│   ├── migration.repository.ts    # Запросы к таблице Auto_Admin__migration_history
│   ├── migration.runner.ts        # Исполнение миграций и транзакционный контроль
│   └── migration.types.ts         # Типы дескрипторов, плана и истории
│
├── modules/                       # Изолированные доменные модули (бизнес-логика)
│   ├── bootstrap/                 # Определение текущей стадии жизненного цикла системы
│   ├── install/                   # Проверка БД, запуск миграций и регистрация админа
│   └── auth/                      # Логин, логаут, сессии, rate-limiting и /me
│
├── routes/                        # Верхнеуровневая маршрутизация
│   └── ApiRouter.ts               # Агрегатор модульных роутеров (/install, /auth, /bootstrap)
│
├── shared/                        # Общий переиспользуемый код для всех модулей
│   ├── api/                       # Форматирование ответов API и ошибки
│   │   ├── errors/                # Фабрики ошибок (badRequest, unauthorized, conflict...)
│   │   ├── response.ts            # Базовые классы ApiError
│   │   ├── response.types.ts      # Типы формата ответа { success, message, data, error }
│   │   └── success.ts             # Хелпер успешного ответа ok(res, message, data)
│   └── middleware/                # Глобальные и защитные middleware
│       ├── auth.middleware.ts     # Проверка авторизации и инъекция req.auth (requireAuth)
│       ├── canConfigureDatabase.ts# Защита от переконфигурации уже настроенной БД
│       ├── checkInstallationStatus.ts # Guard-мидлвары статусов установки
│       ├── errorHandler.ts        # Централизованный обработчик ошибок Express
│       ├── logger.ts              # Логирование входящих HTTP-запросов
│       ├── requirePendingMigrations.ts # Проверка наличия невыполненных миграций
│       └── validate.ts            # Валидация входных данных через Zod-схемы
│
├── types/                         # Глобальные декларации типов TypeScript
│   ├── environment.d.ts           # Типизация переменных process.env
│   └── express.d.ts               # Расширение интерфейса Express.Request (req.auth)
│
└── utils/                         # Общие чистые утилиты
    ├── asyncHandler.ts            # Обертка async контроллеров для перехвата исключений
    ├── checkAuthToken.ts          # Валидация формата сессионного токена
    └── getRequestMeta.ts          # Извлечение IP-адреса и User-Agent из запроса
```

---

## 3. Детальное описание слоев

### 3.1. Уровень приложения и маршрутизации (`app.ts`, `routes/`)
* **`app.ts`** — инициализирует Express-приложение. Подключает CORS (с allowlist доверенных источников), парсер JSON, парсер cookies, логгер, монтирует роутер `/api` и вешает в самом конце глобальный `errorHandler`.
* **`routes/ApiRouter.ts`** — объединяет роутеры функциональных модулей в единое дерево API:
  * `/api/install` ➔ модуль установки (роутер `installRouter`);
  * `/api/auth` ➔ модуль авторизации (защищён `statusReady`, роутер `authRouter`);
  * `/api/bootstrap` ➔ определение стадии готовности системы (`bootstrapRouter`).

---

### 3.2. Слой базы данных (`db/`)
* **`getPool()`**: Создаёт и возвращает глобальный пул соединений (Singleton `mysql.Pool`). Пул имеет `multipleStatements: false` для защиты от SQL-инъекций в приложении.
* **`resetPool()`**: Корректно закрывает пул при изменении настроек подключения (например, после первичного конфигурирования БД).
* **`withTransaction<T>()`**: Управляет жизненным циклом транзакций:
  * `BEGIN TRANSACTION` ➔ исполнение коллбека ➔ `COMMIT`.
  * При любой ошибке ➔ автоматический `ROLLBACK`.
  * В блоке `finally` ➔ гарантированный возврат соединения в пул `connection.release()`.

---

### 3.3. Слой общих утилит и защиты (`shared/`)

#### Стандарт API-ответов (`shared/api/`):
Любой ответ сервера стандартизирован:
* **Успех (2xx):** `{ success: true, message: string, data: T }` через функцию `ok(res, msg, data)`.
* **Ошибка (4xx, 5xx):** `{ success: false, message: string, error: { code, details } }` через класс `ApiError`.

#### Система Middleware (`shared/middleware/`):
* **`validate(schema)`**: Валидирует `req.body`, `req.query` или `req.params` через схемы Zod. При ошибке возвращает `400 Bad Request` со списком некорректных полей.
* **`requireAuth`**: Извлекает токен сессии из HttpOnly cookie, валидирует его через публичный `auth.queries`, находит активную сессию в БД и прикрепляет данные пользователя к объекту `req.auth`.
* **State Guards (`canConfigureDatabase`, `requirePendingMigrations`, `statusMigrated`, `statusReady`)**: Защищают эндпоинты от несанкционированного вызова не в свою стадию установки.
* **`errorHandler`**: Ловит любые исключения, отделяет ожидаемые бизнес-ошибки (`ApiError`) от непредвиденных системных сбоев (500) и логирует их.

---

## 4. Доменные модули (`modules/`) и стандарт инкапсуляции

Каждый модуль в каталоге `modules/` — это законченный изолированный домен.

### Стандартная структура файлов модуля:
```text
modules/<name>/
├── <name>.routes.ts        # Описание URL-маршрутов
├── <name>.controller.ts    # Транспорт (Request / Response)
├── <name>.service.ts       # Бизнес-сценарии и транзакции
├── <name>.repository.ts    # Низкоуровневый SQL
├── <name>.queries.ts       # Публичные функции чтения для внешнего мира
├── <name>.types.ts         # Типы данных модуля
├── schema/                 # Zod-схемы валидации
└── index.ts                # Единственный публичный фасад (Public API)
```

### Главный контракт границ (Module Boundary Contract):
* **Внутри модуля:** Компоненты взаимодействуют напрямую (`routes` ➔ `controller` ➔ `service` ➔ `repository`).
* **Снаружи модуля:** Никакой внешний файл (другой модуль или middleware) не имеет права импортировать `service` или `repository` напрямую. Взаимодействие происходит **строго через `index.ts`**, который отдает наружу функции из `*.queries.ts`.

---

## 5. Сквозной жизненный цикл запроса (Request Lifecycle)

```text
HTTP Клиент (React)
      │
      ▼
1. Express App (app.ts)
      │  ├─ cors()
      │  ├─ express.json()
      │  ├─ cookieParser()
      │  └─ logger()
      ▼
2. ApiRouter (/api)
      │  └─ Routing to Module (напр. /api/auth/login)
      ▼
3. Middlewares
      │  ├─ State Guard (напр. statusReady)
      │  ├─ Auth Guard (напр. requireAuth)
      │  └─ Validator (validate(schema))
      ▼
4. Controller (auth.controller.ts)
      │  └─ Извлечение параметров из req, вызов сервиса
      ▼
5. Service (auth.service.ts)
      │  ├─ Бизнес-логика (хеширование паролей, генерация токена)
      │  ├─ Контроль попыток (rate limiting)
      │  └─ Вызов репозитория / транзакции
      ▼
6. Repository (auth.repository.ts)
      │  └─ Параметризованные SQL-запросы к MySQL
      ▼
7. Response Formatter (shared/api/success.ts)
      │  └─ Установка HttpOnly Cookie + возврат JSON { success: true, ... }
      ▼
HTTP Клиент получает результат
```