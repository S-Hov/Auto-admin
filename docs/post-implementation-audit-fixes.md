# Остаточные исправления после выполнения двух планов

Дата аудита: 1 сентября 2026 года  
Проверенный commit: `17a0344`  
Проверенные документы:

- `docs/api-codes-and-localization-guide.md`;
- `docs/production-hardening-followup.md`.

## Итог аудита

Оба плана выполнены частично. Основа стала заметно лучше, но проект пока нельзя считать готовым к production.

Автоматические проверки:

- server TypeScript — успешно;
- client TypeScript — ошибка;
- client ESLint — 12 ошибок;
- `npm audit --omit=dev` server — 0 известных уязвимостей;
- `npm audit --omit=dev` client — 0 известных уязвимостей;
- автоматические тесты — отсутствуют;
- Docker/HTTP/MySQL-тесты не выполнены, потому что Docker integration недоступна в текущей WSL-сессии;
- Git working tree до создания этого отчёта был чистым; единственное новое изменение после аудита — этот документ.

Что уже выполнено правильно:

- создан типизированный каталог error codes;
- `ApiError` и error helpers используют обязательный `ErrorCode`;
- error response больше не зависит от русской строки;
- клиент имеет `ApiClientError`, i18next, русские и английские API-словари и общий `apiMessage`;
- текущие серверные error codes имеют переводы в обоих словарях;
- исправлен API-порт клиента;
- клиент знает `migration_recovery_required`;
- завершённые миграции возвращают `409`;
- обычная настройка БД запрещена при `database_unavailable`;
- DB-схема валидирует целый port и максимальные длины;
- JSON body ограничен 64 KiB;
- CORS env-переменная переименована правильно;
- auth aggregates преобразуются в числа;
- добавлен индекс `(username, created_at)`;
- добавлена repository-функция очистки старых login attempts;
- добавлены request ID и измерение длительности запросов.

Ниже задачи расположены в обязательном порядке. Не переходить к следующему этапу, пока критерии текущего не выполнены.

---

## Этап 1. Вернуть зелёную клиентскую сборку

Это первый шаг. Пока TypeScript и ESLint не проходят, остальные изменения нельзя надёжно проверять.

### 1.1. Исправить logout error handling

Файл:

```text
client/src/app/routing/layouts/AdminLayout.tsx
```

Проблема:

```ts
import type { ApiError } from '../../../shared/api/apiClient';
```

`apiClient.ts` больше не экспортирует `ApiError`, поэтому client TypeScript падает с `TS2305`.

Дополнительно logout всё ещё показывает `error.message`, обходя новый `apiMessage`.

Нужно:

1. Удалить старый импорт `ApiError`.
2. Использовать `apiMessage(error)` так же, как в остальных формах.
3. Параметр callback оставить `unknown`, чтобы helper сам различал `ApiClientError` и сетевую ошибку.

Критерий: ошибка logout переводится через общий механизм, а TypeScript больше не сообщает `TS2305`.

### 1.2. Исправить ESLint-ошибки

Текущий lint показывает 12 ошибок:

- `AuthProvider.tsx` — синхронные `setState` внутри effect;
- `BootstrapProvider.tsx` — синхронный вызов обновления состояния из effect и неиспользуемый `error`;
- `router.tsx` — правило Fast Refresh для lazy-компонентов/экспортов;
- `apiClient.ts` — explicit `any`;
- `types.ts` — explicit `any` в старом интерфейсе.

Не отключать правила глобально только ради зелёного lint. Для каждого места понять причину:

- убрать неиспользуемую переменную;
- отделить инициализацию provider от производного состояния;
- вынести компоненты/loader из router-файла либо настроить структуру экспортов корректно;
- заменить `any` на `unknown` и runtime narrowing;
- удалить устаревший интерфейс, если он больше нигде не используется.

### Проверка этапа

```bash
cd client
npx tsc -b --noEmit
npm run lint
```

Обе команды должны завершиться с exit code `0`.

Рекомендуемый коммит:

```text
fix(client): restore typecheck and lint after api error refactor
```

---

## Этап 2. Завершить безопасный client API parser

Файлы:

```text
client/src/shared/api/apiClient.ts
client/src/shared/api/types.ts
client/src/shared/api/ApiClientError.ts
```

### Текущие проблемы

- JSON записывается в `let data: any`;
- свойства `data.code`, `data.params` и `data.details` читаются без runtime-проверки;
- повреждённый успешный response без `success` возвращается как ожидаемый generic `T`;
- большой старый блок parsing оставлен комментарием;
- строка `COMMON.UNKNOWN_ERROR` захардкожена в сетевом слое;
- старый интерфейс `ApiError` содержит `any` и больше не соответствует новой архитектуре.

### Что нужно сделать

1. Результат `JSON.parse` хранить как `unknown`.
2. Создать runtime guards:
   - `isApiErrorPayload`;
   - `isApiSuccessPayload`.
3. Guard ошибки должен фактически проверить:
   - payload является объектом;
   - `success === false`;
   - `code` является непустой строкой;
   - `params`, если есть, является объектом с разрешёнными primitive-значениями.
4. Для HTTP error с не-JSON body создавать безопасную клиентскую ошибку/fallback, не притворяясь, что proxy response соответствует API-контракту.
5. Для HTTP 2xx с повреждённым контрактом выбрасывать отдельную contract error, а не возвращать `data as T` без проверки.
6. Удалить закомментированный legacy parser.
7. Удалить устаревший `ApiError` из `types.ts`, если поиск подтверждает, что он больше не используется.
8. Не показывать toast из `apiClient`: это по-прежнему ответственность UI.

### Важное ограничение TypeScript

Generic `T` не проверяет JSON во время выполнения. На этом этапе достаточно проверить общий envelope. Поле `data` конкретного endpoint позднее можно валидировать Zod-схемой или generated OpenAPI client.

### Критерии этапа

- в `client/src/shared/api` нет `any`;
- malformed error response не ломает приложение;
- malformed success response не выдаётся за корректный `T`;
- неизвестный server code приводит к безопасному fallback;
- сетевой слой не содержит UI-текстов.

Рекомендуемый коммит:

```text
refactor(client-api): validate response envelopes at runtime
```

---

## Этап 3. Завершить success codes и убрать server message

План локализации сейчас выполнен только для error path. Успешные ответы всё ещё содержат русское `message`, а формы читают `response.message`.

### 3.1. Создать каталог success codes

Создать:

```text
server/src/shared/api/codes/success-codes.ts
```

Минимальные коды:

```text
COMMON.OK
AUTH.LOGIN_SUCCEEDED
AUTH.LOGOUT_SUCCEEDED
INSTALL.DATABASE_CONNECTED
INSTALL.MIGRATION_PLAN_RECEIVED
INSTALL.MIGRATION_APPLIED
INSTALL.ADMIN_CREATED
BOOTSTRAP.STATUS_RECEIVED
```

Тип `SuccessCode` вывести из объекта через `as const` так же, как `ErrorCode`.

### 3.2. Переделать success response

Изменить:

```text
server/src/shared/api/response.types.ts
server/src/shared/api/response.ts
server/src/shared/api/success.ts
```

Целевой контракт:

```json
{
  "success": true,
  "code": "AUTH.LOGIN_SUCCEEDED",
  "data": {}
}
```

Убрать из success envelope:

- пользовательский `message`;
- дублирующий `status` в JSON.

HTTP status остаётся в настоящем HTTP response.

`noContent(204)` не должен отправлять JSON body. Если клиенту нужен code, использовать `200`.

### 3.3. Перевести контроллеры

Изменить:

```text
server/src/modules/auth/auth.controller.ts
server/src/modules/bootstrap/bootstrap.controller.ts
server/src/modules/install/install.controller.ts
server/src/modules/install/registerNewAdmin/register.controller.ts
```

Контроллер передаёт success code и data, а не русскую строку.

### 3.4. Добавить success translations

Изменить:

```text
client/src/shared/i18n/locales/ru/api.ts
client/src/shared/i18n/locales/en/api.ts
```

Русский и английский словари должны иметь одинаковую структуру.

### 3.5. Перевести клиентские формы

Сейчас `response.message` используется в:

```text
client/src/features/auth-form/ui/CreateAdminForm.tsx
client/src/features/create-admin/ui/CreateAdminForm.tsx
client/src/features/install-database/ui/InstallDatabaseForm.tsx
client/src/features/run-migrations/ui/runMigrationsForm.tsx
```

После этапа ни одна форма не должна читать server message.

### Проверка этапа

```bash
rg "response\.message|extractMessage" client/src
```

Результат должен быть пустым.

Рекомендуемый коммит:

```text
refactor(api): replace success messages with localized result codes
```

---

## Этап 4. Завершить профессиональную server validation

Файл `server/src/shared/middleware/validate.ts` по-прежнему отправляет `issue.message`, то есть русский текст Zod становится частью wire-контракта.

### Создать

```text
server/src/shared/api/validation/validation.types.ts
server/src/shared/api/validation/map-zod-issue.ts
client/src/shared/api/apply-field-errors.ts
```

### Добавить validation codes

В error catalog добавить:

```text
VALIDATION.REQUIRED
VALIDATION.INVALID_TYPE
VALIDATION.STRING_TOO_SHORT
VALIDATION.STRING_TOO_LONG
VALIDATION.NUMBER_TOO_SMALL
VALIDATION.NUMBER_TOO_LARGE
VALIDATION.PASSWORDS_DO_NOT_MATCH
VALIDATION.INVALID_VALUE
```

### Новый field error

Каждая ошибка поля должна содержать:

```json
{
  "field": "password",
  "code": "VALIDATION.STRING_TOO_SHORT",
  "params": { "min": 12 }
}
```

Не отправлять `issue.message` клиенту.

### Клиент

Helper `apply-field-errors.ts` должен:

- получить `setError` React Hook Form;
- проверить, что server field входит в allowlist полей этой формы;
- перевести field code;
- установить ошибку конкретному input;
- неизвестные/общие ошибки оставить для toast.

### Проверка этапа

- server validation response не содержит русского текста;
- ошибки появляются под правильными полями;
- password и token никогда не возвращаются в details/params;
- ru/en имеют переводы всех validation codes.

Рекомендуемый коммит:

```text
feat(validation): return localized field error codes
```

---

## Этап 5. Завершить реальную поддержку нескольких языков

Сейчас i18next всегда запускается с `lng: 'ru'`. Переключателя и состояния языка нет, а почти весь обычный UI остаётся захардкожен по-русски.

### Создать UI-словари

```text
client/src/shared/i18n/locales/ru/common.ts
client/src/shared/i18n/locales/en/common.ts
```

Добавить namespace `common` в `resources.ts`.

### Создать provider

```text
client/src/app/providers/i18n/LanguageContext.ts
client/src/app/providers/i18n/LanguageProvider.tsx
```

Provider должен:

- разрешать только `ru | en`;
- вызывать `i18n.changeLanguage`;
- читать сохранённый язык;
- безопасно сохранять выбор в `localStorage`;
- использовать browser language только при первом выборе;
- иметь fallback.

Язык не является секретом, поэтому `localStorage` для него допустим.

### Перевести обычный UI

API-словарь не предназначен для кнопок и заголовков. Перевести через `common`/feature namespaces:

- login/install/admin/migrations формы;
- AppGate states;
- AdminLayout;
- loaders;
- кнопки и placeholders.

### Улучшить `apiMessage`

- неизвестный code показывает fallback;
- в development неизвестный code логируется как warning;
- migration conflict использует `expectedVersion` и `actualVersion` в переводе;
- server details не показываются автоматически.

### Критерий этапа

Переключение `ru → en → ru` меняет весь доступный интерфейс без перезагрузки страницы и без нового запроса к серверу.

Рекомендуемый коммит:

```text
feat(i18n): add language provider and translate application ui
```

---

## Этап 6. Завершить безопасное сохранение DB-конфигурации

Файл:

```text
server/src/modules/install/install.service.ts
```

Уникальный temp-файл добавлен, но два параллельных запроса могут пройти старую bootstrap-проверку и по очереди заменить `.env`.

Нужно:

1. Добавить process-local mutex для операции настройки БД.
2. После получения mutex повторно проверить bootstrap state.
3. Обычную настройку разрешать только в `database_required` — middleware это уже делает, service должен защищать инвариант повторно непосредственно перед записью.
4. Хранить путь временного файла и удалять его в `finally`, если rename не завершился.
5. После успешного rename обновлять `process.env`.
6. После этого сбрасывать pool.
7. Не превращать filesystem error в `400`.

Также исправить `server/src/db/checkConnection.ts`:

- убрать `(rows as any)`;
- описать тип строки `SELECT VERSION()` через mysql2 `RowDataPacket`;
- подключить нормальный logger вместо отдельного `console.error`.

### Обязательные тесты

- два параллельных запроса не приводят к last-write-wins;
- temp-файл удаляется после искусственной ошибки rename;
- filesystem error возвращает безопасный `500`;
- password не появляется в логе.

Рекомендуемый коммит:

```text
fix(install): serialize and safely persist database configuration
```

---

## Этап 7. Реализовать настоящий migration recovery

Сейчас есть только bootstrap stage и блокирующий экран клиента. Recovery API отсутствует.

Нужно реализовать требования из `production-hardening-plan.md`:

- setup/recovery token;
- migration advisory lock;
- повторное чтение catalog/history после lock;
- version + checksum как optimistic precondition;
- явные решения `retry` и `mark-applied`;
- schema verification перед `mark-applied`;
- отдельная история recovery events/attempts;
- отсутствие автоматического retry;
- клиентский recovery UI без показа SQL, file path и полного error message.

### Текущее восстановление installation status

Bootstrap уже исправляет случай `plan complete + installation status new`, вызывая `markMigrationsCompleted`. Это полезно, но нужно закрепить интеграционным тестом и проверить параллельные bootstrap/admin запросы.

Рекомендуемые коммиты:

```text
feat(migrations): add guarded recovery service and audit history
feat(client): add migration recovery workflow
```

---

## Этап 8. Завершить auth abuse protection

Что уже сделано:

- попытка резервируется до bcrypt;
- aggregate values превращаются в числа;
- добавлен `(username, created_at)`;
- repository имеет `cleanOldLoginAttempts`.

Что осталось:

1. Вызвать retention cleanup из отдельной фоновой задачи/scheduler. Сейчас функция нигде не используется, поэтому таблица продолжает расти.
2. Добавить route-level burst limiter до MySQL и bcrypt.
3. Добавить небольшой limiter на регистрацию первого администратора.
4. Добавить limiter на `/install/check-connection`.
5. Добавлять `Retry-After` при `429`.
6. Вынести лимиты и окна времени в типизированный config.
7. Настроить точный `trust proxy` под production reverse proxy. Не использовать `true` без ограничения hops/IP.
8. Измерить bcrypt cost на целевом сервере.

### Обязательные тесты

- последовательный brute force;
- 20 параллельных login;
- один username с разных IP;
- разные usernames с одного IP;
- правильный пароль при уже активной блокировке;
- настоящий IP за доверенным proxy;
- retention удаляет только старые записи.

Рекомендуемый коммит:

```text
security(auth): complete rate limits proxy policy and retention
```

---

## Этап 9. Завершить env, logging и shutdown

### Env

В `server/src/config/env.ts`:

- PORT сделать целым числом `1..65535`;
- HOST trim + min length;
- системные значения читать через `envConfig` последовательно;
- DB env оставить динамическими, потому что они появляются после первой настройки;
- добавить CORS пример в `.env.example`;
- документировать жизненный цикл setup token.

### Setup token

Сейчас server требует token при каждом старте, а клиент хранит его в `sessionStorage` и показывает input как `text`.

Нужно выбрать одну production-модель:

- постоянный recovery secret во внешнем secret store с ротацией;
- либо token можно выключить после `ready`, а recovery требует временно включить новый.

На клиенте:

- хранить setup token в React memory/context;
- после reload запрашивать повторно;
- очищать централизованно при `ready`;
- input сделать `password` с отдельным осознанным показом.

### Logging

Текущий `console.log({ ... })` не является гарантированным JSON logger.

Нужно:

- Pino или аналогичный structured logger;
- redaction cookie, authorization, setup-token и password;
- request ID;
- server-only stack для неизвестных ошибок;
- логировать неожиданные bootstrap errors перед `system_error`;
- установить listener `finish` до вызова `next()`, иначе синхронно завершившийся response может не попасть в access log;
- не доверять произвольному клиентскому `x-request-id` без проверки длины/формата.

Request-ID middleware лучше подключить до JSON parser, чтобы ошибки body parsing тоже получили trace ID.

### Shutdown

Добавить флаг начала shutdown. Повторные SIGINT/SIGTERM не должны запускать второй cleanup и второй аварийный таймер.

### Таймауты

Добавить отдельные политики:

- HTTP headers/request timeout;
- MySQL connect timeout;
- query execution timeout;
- graceful shutdown timeout.

Рекомендуемый коммит:

```text
infra: finalize env logging timeouts and shutdown
```

---

## Этап 10. Завершить API и module infrastructure

Осталось:

- общий helper auth cookie options для set/clear;
- фасады `auth.queries.ts` и `bootstrap.queries.ts` переименовать в `*.facade.ts` или заменить публичными функциями `index.ts`;
- type-only imports использовать последовательно;
- удалить устаревшие интерфейсы и закомментированный legacy-код;
- добавить client/server contract coverage test для всех error/success codes и ru/en переводов.

Рекомендуемый коммит:

```text
refactor: finalize api contracts and module facades
```

---

## Этап 11. Создать настоящий production Docker target

Текущие Dockerfile остаются development-конфигурацией:

- `npm install` вместо `npm ci`;
- dev/watch commands;
- bind mounts исходников;
- нет multi-stage build;
- MySQL root password захардкожен;
- MySQL и Adminer опубликованы наружу.

Нужно отделить dev и production:

- multi-stage build;
- `npm ci` по lock-файлу;
- server запускается из `dist`;
- SQL migrations гарантированно копируются в `dist`;
- client собирается статически;
- reverse proxy предоставляет same-origin `/api`;
- production secrets поступают извне;
- MySQL/Adminer не публикуются без необходимости;
- healthcheck и startup ordering;
- контейнеры остаются non-root.

Рекомендуемый коммит:

```text
infra: add production docker build and reverse proxy
```

---

## Этап 12. Автоматические тесты — финальный блокер production

Сейчас test runner и test scripts отсутствуют.

Минимальный набор:

### Unit

- error/success helpers;
- API runtime guards;
- `apiMessage` ru/en/fallback/params;
- Zod issue mapper;
- `buildMigrationPlan`;
- migration catalog/checksum;
- query compiler и pipeline.

### Integration с настоящим MySQL

- пустая база и полный install flow;
- setup token на каждом install endpoint;
- строгий порядок миграций;
- stale expectedVersion;
- два параллельных apply-next;
- `running`, `failed`, checksum mismatch;
- recovery decisions;
- сбой после последней migration до installation status;
- два параллельных admin registration;
- login/logout/getMe;
- inactive/revoked/expired session;
- последовательный и параллельный brute force;
- cleanup старых attempts.

### Production smoke test

- server/client собираются из чистого checkout;
- SQL-файлы присутствуют в server image;
- bootstrap доступен через reverse proxy;
- cookies работают в HTTPS/same-origin;
- секреты отсутствуют в image layers и логах.

Рекомендуемый коммит:

```text
test: cover api contracts install migrations and authentication
```

---

## Этап 13. Query engine пока не публиковать

Query engine уже развивается, но follow-up требовал не подключать его к публичному API до появления:

- runtime validation;
- allowlist таблиц и колонок из introspection;
- permission layer;
- ограничения глубины/размера запросов;
- query timeout;
- защиты массовых update/delete;
- unit и integration тестов.

Экспорт internal-модуля допустим, но HTTP route к нему добавлять рано.

---

## Финальный порядок

1. Зелёные client typecheck и lint.
2. Runtime-safe `apiClient`.
3. Success codes без server messages.
4. Validation codes и field errors.
5. Полная i18n UI и language provider.
6. Mutex/cleanup для DB configuration.
7. Migration recovery API.
8. Auth limiters, proxy и retention scheduler.
9. Env/logging/shutdown/timeouts.
10. API infrastructure и facades.
11. Production Docker.
12. Полный набор автоматических тестов.
13. После этого — публичный query engine.

## Definition of Done

Работу можно считать завершённой только когда одновременно выполнено всё:

```bash
cd server
npx tsc --noEmit --skipLibCheck false
npm test
npm audit --omit=dev

cd ../client
npx tsc -b --noEmit
npm run lint
npm test
npm audit --omit=dev
```

И дополнительно:

- Docker production build проходит из чистого checkout;
- integration-тесты с MySQL проходят;
- `rg "response\.message|extractMessage" client/src` ничего не находит;
- все error/success/validation codes имеют ru/en перевод;
- install/recovery endpoints защищены и ограничены;
- real secrets, `.env`, password, cookies и setup token отсутствуют в Git и логах.
