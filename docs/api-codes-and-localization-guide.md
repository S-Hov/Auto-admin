# Пошаговая инструкция: коды API и мультиязычный клиент

Эта инструкция написана для текущей структуры Auto Admin. Её цель — убрать зависимость интерфейса от русских сообщений сервера и получить production-подход:

```text
сервер определяет, ЧТО произошло → возвращает стабильный code
клиент определяет, КАК это показать → переводит code на выбранный язык
```

Работу нужно выполнять по этапам и не пытаться переписать всё одним коммитом.

## 0. Сначала понять модель

У ответа API есть разные части, и у каждой своя задача.

### HTTP status

HTTP status сообщает общую категорию результата:

- `200` — запрос выполнен;
- `201` — ресурс создан;
- `400` — неправильные входные данные;
- `401` — пользователь не авторизован;
- `403` — пользователь авторизован, но действие запрещено;
- `404` — ресурс не найден;
- `409` — конфликт текущего состояния;
- `429` — слишком много запросов;
- `500` — непредвиденная ошибка сервера.

HTTP status нельзя заменять внутренним кодом. Нужны оба значения.

### Машинный code

`code` точно объясняет клиентскому коду, что произошло:

```text
AUTH.INVALID_CREDENTIALS
AUTH.TOO_MANY_ATTEMPTS
INSTALL.INVALID_SETUP_TOKEN
INSTALL.MIGRATION_VERSION_CONFLICT
```

Код является частью API-контракта. После публикации его нельзя без причины переименовывать.

### data

`data` содержит результат успешного запроса: пользователя, план миграций, URL перехода и другие данные предметной области.

### params

`params` содержит только безопасные значения, которые нужны для подстановки в перевод:

```json
{
  "expectedVersion": "0003",
  "actualVersion": "0004"
}
```

Нельзя класть в `params` пароль, cookie, setup token, SQL или stack trace.

### details

`details` — структурированные данные, нужные программе, например ошибки отдельных полей формы. Не любой `details` обязан показываться пользователю.

### Целевые формы ответа

Успех:

```json
{
  "success": true,
  "code": "AUTH.LOGIN_SUCCEEDED",
  "data": {
    "redirectedTo": "/"
  }
}
```

Ожидаемая ошибка:

```json
{
  "success": false,
  "code": "AUTH.INVALID_CREDENTIALS"
}
```

Ошибка с параметрами:

```json
{
  "success": false,
  "code": "INSTALL.MIGRATION_VERSION_CONFLICT",
  "params": {
    "expectedVersion": "0003",
    "actualVersion": "0004"
  }
}
```

В финальном контракте `status` не обязательно дублировать в JSON: он уже находится в HTTP response. Во время перехода старое поле можно временно оставить.

---

## Этап 1. Создать единый каталог кодов ошибок

Это первый обязательный шаг.

### Какую проблему он решает

Сейчас коды записываются строками прямо в местах использования:

```text
'INSTALL.INVALID_SETUP_TOKEN'
'INSTALL.MIGRATIONS_ALREADY_COMPLETED'
```

В такой строке легко сделать опечатку. TypeScript её не заметит. Единый каталог делает список кодов контролируемым и типизированным.

### Какой файл создать

Создать:

```text
server/src/shared/api/codes/error-codes.ts
```

Каталог `codes` тоже нужно создать, потому что сейчас его нет.

### Что положить в файл

На первом шаге используй плоский объект. Он проще вложенного и из него легко получить TypeScript union:

```ts
export const ERROR_CODES = {
    COMMON_BAD_REQUEST: 'COMMON.BAD_REQUEST',
    COMMON_UNAUTHORIZED: 'COMMON.UNAUTHORIZED',
    COMMON_FORBIDDEN: 'COMMON.FORBIDDEN',
    COMMON_NOT_FOUND: 'COMMON.NOT_FOUND',
    COMMON_CONFLICT: 'COMMON.CONFLICT',
    COMMON_TOO_MANY_REQUESTS: 'COMMON.TOO_MANY_REQUESTS',
    COMMON_VALIDATION_FAILED: 'COMMON.VALIDATION_FAILED',
    COMMON_INTERNAL_ERROR: 'COMMON.INTERNAL_ERROR',

    AUTH_INVALID_CREDENTIALS: 'AUTH.INVALID_CREDENTIALS',
    AUTH_SESSION_INVALID: 'AUTH.SESSION_INVALID',
    AUTH_TOO_MANY_ATTEMPTS: 'AUTH.TOO_MANY_ATTEMPTS',

    INSTALL_INVALID_SETUP_TOKEN: 'INSTALL.INVALID_SETUP_TOKEN',
    INSTALL_DATABASE_CONNECTION_FAILED: 'INSTALL.DATABASE_CONNECTION_FAILED',
    INSTALL_DATABASE_CONFIGURATION_NOT_ALLOWED: 'INSTALL.DATABASE_CONFIGURATION_NOT_ALLOWED',
    INSTALL_MIGRATIONS_ALREADY_COMPLETED: 'INSTALL.MIGRATIONS_ALREADY_COMPLETED',
    INSTALL_MIGRATIONS_ALREADY_RUNNING: 'INSTALL.MIGRATIONS_ALREADY_RUNNING',
    INSTALL_MIGRATION_VERSION_CONFLICT: 'INSTALL.MIGRATION_VERSION_CONFLICT',
    INSTALL_ADMIN_ALREADY_CREATED: 'INSTALL.ADMIN_ALREADY_CREATED',
    INSTALL_ADMIN_ROLE_NOT_FOUND: 'INSTALL.ADMIN_ROLE_NOT_FOUND',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];
```

### Что означает `as const`

Без `as const` TypeScript решил бы, что значением может быть любая строка. С `as const` он запоминает точные значения.

Получившийся `ErrorCode` будет означать:

```text
'COMMON.BAD_REQUEST'
или 'AUTH.INVALID_CREDENTIALS'
или любой другой код из объекта
```

Но произвольную строку TypeScript больше не разрешит.

### Правила именования

Формат значения:

```text
MODULE.SITUATION
```

Примеры:

- `AUTH.INVALID_CREDENTIALS`;
- `INSTALL.MIGRATION_VERSION_CONFLICT`;
- `COMMON.VALIDATION_FAILED`.

Правила:

1. Только английский язык.
2. Только заглавные буквы, цифры, `_` и точка-разделитель.
3. Код описывает причину, а не готовый текст.
4. Не добавлять номер HTTP status в название.
5. Не делать отдельные коды для русского и английского языка.
6. Одинаковая ситуация во всём приложении должна иметь один код.
7. Разные по смыслу ситуации не должны маскироваться одним кодом.

### Что пока не делать

Не создавай сейчас общий root workspace `packages/api-contract`. У клиента и сервера отдельные Docker build context, поэтому такой рефакторинг затронет сборку и усложнит первую задачу. Сначала нужен стабильный wire-контракт. Позже его можно описать через OpenAPI или вынести в общий package.

### Проверка этапа

```bash
cd server
npx tsc --noEmit --skipLibCheck false
```

Пока новый файл нигде не используется, сервер всё равно должен компилироваться.

Коммит:

```text
refactor(api): add typed error code catalog
```

---

## Этап 2. Сделать `ApiError` типизированной серверной ошибкой

### Какую проблему он решает

Сейчас `ApiError.code` имеет тип `string | undefined`. Значит, код можно забыть или написать с опечаткой. Также конструктор принимает много позиционных аргументов, порядок которых легко перепутать.

### Какой файл изменить

```text
server/src/shared/api/errors/ApiError.ts
```

### Целевая ответственность класса

`ApiError` должна хранить:

- HTTP status;
- обязательный `ErrorCode`;
- безопасные параметры перевода;
- структурированные details;
- внутреннее сообщение для server log.

Внутреннее сообщение не должно автоматически уходить клиенту.

Сначала создай типы рядом с классом:

```ts
import type { ErrorCode } from '../codes/error-codes';

export type TranslationParams = Record<string, string | number | boolean>;

interface ApiErrorOptions<TDetails> {
    status: number;
    code: ErrorCode;
    params?: TranslationParams;
    details?: TDetails;
    internalMessage?: string;
    cause?: unknown;
}
```

Затем переделай конструктор так, чтобы он принимал один объект `ApiErrorOptions`, а не несколько аргументов по порядку.

Почему объект лучше:

```ts
new ApiError({
    status: 409,
    code: ERROR_CODES.INSTALL_MIGRATION_VERSION_CONFLICT,
    params: { expectedVersion, actualVersion },
});
```

По имени каждого свойства сразу видно, что передаётся. Нельзя случайно поставить `details` на место `code`.

### Важное разделение сообщений

Поле `Error.message`, которое обязательно есть у JavaScript Error, нужно для разработчика и логов. Оно не является переводом для пользователя.

Если `internalMessage` не передан, можно использовать сам `code`. Для непредвиденной причины передавай `cause`, чтобы logger позже мог записать исходную ошибку.

Удали старый неиспользуемый параметр `success` из конструктора.

### Проверка этапа

После изменения TypeScript покажет ошибки во всех helpers. Это ожидаемо: следующий этап исправит их. Не коммить сломанную промежуточную версию отдельно; этапы 2 и 3 можно сделать одним коммитом.

---

## Этап 3. Переделать error helpers на обязательные коды

### Какую проблему они решают

Helpers `unauthorized`, `conflict` и другие нужны, чтобы код приложения не повторял HTTP status вручную.

### Какой файл изменить

```text
server/src/shared/api/errors/error-helpers.ts
```

### Новый порядок аргументов

Первым аргументом должен быть машинный код, а не русский текст:

```ts
unauthorized(ERROR_CODES.AUTH_INVALID_CREDENTIALS)
```

Для параметризованной ошибки:

```ts
conflict(
    ERROR_CODES.INSTALL_MIGRATION_VERSION_CONFLICT,
    {
        expectedVersion,
        actualVersion,
    }
)
```

Хорошая сигнатура helper:

```text
helper(code, options?)
```

Где `options` может содержать:

- `params`;
- `details`;
- `internalMessage`;
- `cause`.

Для общих случаев helper может иметь безопасный код по умолчанию. Например, `unauthorized()` может использовать `COMMON.UNAUTHORIZED`. Но в service лучше указывать доменный код явно, если клиенту важно различать ситуацию.

### Какие места перевести первыми

После изменения helpers TypeScript сам покажет вызовы. В текущем проекте они находятся в:

```text
server/src/shared/middleware/validate.ts
server/src/shared/middleware/auth.middleware.ts
server/src/shared/middleware/canConfigureDatabase.ts
server/src/shared/middleware/checkInstallationStatus.ts
server/src/shared/middleware/requireInstallToken.ts
server/src/shared/middleware/requirePendingMigrations.ts
server/src/modules/auth/auth.service.ts
server/src/modules/install/install.service.ts
server/src/modules/install/registerNewAdmin/register.service.ts
```

### Важный пример для безопасности

Несуществующий пользователь и неправильный пароль должны возвращать один код:

```text
AUTH.INVALID_CREDENTIALS
```

Иначе злоумышленник сможет по ответу определять существование username.

### Проверка этапа

1. В `server/src` не осталось ручных строк вида `'INSTALL....'` вне каталога.
2. `ApiError.code` больше не optional.
3. Сервер проходит TypeScript.

Коммит:

```text
refactor(api): require typed codes for api errors
```

---

## Этап 4. Исправить формат error response

### Текущая проблема

Сейчас `errorHandler` передаёт код внутрь `data`:

```json
{
  "success": false,
  "message": "...",
  "data": {
    "code": "AUTH.INVALID_CREDENTIALS",
    "details": {}
  }
}
```

Код результата должен находиться на верхнем уровне. Клиент не должен знать внутреннюю историю старого формата.

### Какие файлы изменить

```text
server/src/shared/api/response.types.ts
server/src/shared/api/response.ts
server/src/shared/middleware/errorHandler.ts
```

### Какие типы нужны

Сделай отдельные типы успеха и ошибки, различаемые по `success`:

```ts
export interface ApiErrorResponse<TDetails = unknown> {
    success: false;
    code: ErrorCode;
    params?: TranslationParams;
    details?: TDetails;
}
```

Поле `success: false`, а не просто `boolean`, называется discriminant. Благодаря ему TypeScript понимает: если `success === false`, перед ним именно ошибка.

На этом этапе успешный response можно временно оставить старым. Success-коды будут добавлены позже, когда error path уже заработает.

### Что должен делать `errorHandler`

Для ожидаемой `ApiError` он отправляет:

- `success: false`;
- `code`;
- только безопасные `params` и `details`.

Он не отправляет `error.message`, `stack` и `cause`.

Для неизвестной ошибки:

- логирует исходную ошибку на сервере;
- отвечает `500`;
- возвращает только `COMMON.INTERNAL_ERROR`;
- не возвращает технические детали клиенту.

### Проверка через curl/браузер DevTools

Неправильный login должен выглядеть примерно так:

```json
{
  "success": false,
  "code": "AUTH.INVALID_CREDENTIALS"
}
```

Неверный setup token:

```json
{
  "success": false,
  "code": "INSTALL.INVALID_SETUP_TOKEN"
}
```

Коммит:

```text
refactor(api): return machine-readable error responses
```

---

## Этап 5. Научить клиент правильно разбирать API-ошибки

### Какую проблему он решает

Сейчас `apiClient` проверяет наличие `message` и выбрасывает обычный объект через `throw`. После перехода `message` больше не является контрактом.

### Какие файлы создать

```text
client/src/shared/api/types.ts
client/src/shared/api/ApiClientError.ts
```

### Файл `types.ts`

Опиши wire-формат, который реально приходит по сети:

```ts
export type TranslationParams = Record<string, string | number | boolean>;

export interface ApiErrorPayload<TDetails = unknown> {
    success: false;
    code: string;
    params?: TranslationParams;
    details?: TDetails;
}
```

Почему `code: string`, а не серверный `ErrorCode`: данные пришли из сети и во время выполнения могут содержать что угодно. TypeScript не валидирует JSON. Позже runtime guard проверит форму объекта.

### Файл `ApiClientError.ts`

Создай настоящий класс, наследующий `Error`. Он должен хранить:

- `status` из HTTP response;
- `code`;
- `params`;
- `details`.

Преимущество класса:

```ts
if (error instanceof ApiClientError) {
    // Это ожидаемая API-ошибка
}
```

Обычный сетевой `TypeError`, ошибка JSON и ошибка твоего React-кода не будут ошибочно считаться серверной API-ошибкой.

### Какой файл изменить

```text
client/src/shared/api/apiClient.ts
```

### Что изменить в `apiClient`

1. Не определять API-response по наличию `message`.
2. Проверять `success`, `code` и их runtime-типы.
3. При ошибочном HTTP status или `success: false` создавать `ApiClientError`.
4. Не показывать toast внутри `apiClient`: сетевой слой не должен управлять интерфейсом.
5. Отдельно обрабатывать:
   - корректную API-ошибку;
   - не-JSON ответ reverse proxy;
   - сетевую ошибку `Failed to fetch`;
   - успешный, но повреждённый контракт.
6. Не использовать `any`; начинать разбор JSON с `unknown`.

### Почему нужен runtime guard

Указание `as ApiErrorPayload` не проверяет серверный JSON. Нужна функция, которая фактически проверяет:

```text
payload является object
payload.success === false
payload.code является непустой string
params, если есть, является object
```

Для начала guard можно написать вручную. Позже общий API-response удобно валидировать Zod-схемой.

### Переходный режим

Пока не переведены все endpoints, `apiClient` может временно понимать и новый, и старый response. Добавь комментарий с задачей удаления legacy parsing и удали его после завершения этапа 10.

Коммит:

```text
refactor(client-api): parse structured api errors
```

---

## Этап 6. Подключить i18n на React-клиенте

### Установить библиотеки

В каталоге `client`:

```bash
npm install i18next react-i18next
```

`i18next` хранит и выбирает переводы. `react-i18next` связывает его с React и даёт hook `useTranslation()`.

### Создать структуру файлов

```text
client/src/shared/i18n/
  index.ts
  resources.ts
  api-message.ts
  locales/
    ru/
      api.ts
      common.ts
    en/
      api.ts
      common.ts
```

Назначение:

- `index.ts` — инициализирует i18next;
- `resources.ts` — соединяет языки и namespaces;
- `api-message.ts` — безопасно переводит code сервера;
- `api.ts` — переводы API-кодов;
- `common.ts` — кнопки, заголовки и обычный UI.

### Пример API-словаря

`client/src/shared/i18n/locales/ru/api.ts`:

```ts
export const ruApi = {
    COMMON: {
        UNKNOWN_ERROR: 'Произошла неизвестная ошибка',
        INTERNAL_ERROR: 'Внутренняя ошибка сервера',
        NETWORK_ERROR: 'Не удалось связаться с сервером',
        VALIDATION_FAILED: 'Проверьте введённые данные',
    },
    AUTH: {
        INVALID_CREDENTIALS: 'Неверное имя пользователя или пароль',
        SESSION_INVALID: 'Сеанс недействителен. Войдите снова',
        TOO_MANY_ATTEMPTS: 'Слишком много попыток. Повторите позже',
    },
    INSTALL: {
        INVALID_SETUP_TOKEN: 'Неверный или отсутствующий токен установки',
        MIGRATION_VERSION_CONFLICT:
            'Ожидалась миграция {{expectedVersion}}, но следующая — {{actualVersion}}',
    },
} as const;
```

Создай такую же структуру в `en/api.ts`. Структура ключей должна совпадать, тексты — отличаться.

### Инициализация

В `client/src/shared/i18n/index.ts`:

1. Импортируй `i18next`.
2. Подключи `initReactI18next` через `.use(...)`.
3. Передай `resources`.
4. Установи `fallbackLng: 'en'` или `'ru'` согласно продуктовой политике.
5. Укажи язык начальной версии.
6. В development включи полезное предупреждение о missing keys, но не показывай технические ключи пользователю.

В `client/src/main.tsx` добавь один side-effect import до вызова `createRoot`:

```ts
import './shared/i18n';
```

Он выполнит настройку i18next до первого React render.

### Пока не добавлять автоопределение языка

Сначала сделай явные `ru` и `en` и ручное переключение. Автоопределение browser language, сохранение выбора и server profile можно добавить после проверки основы.

Коммит:

```text
feat(i18n): initialize russian and english resources
```

---

## Этап 7. Создать единый переводчик API-кодов

### Какую проблему он решает

Если каждая форма будет самостоятельно писать:

```ts
t(error.code)
```

то везде придётся повторять fallback и проверку неизвестного кода.

### Какой файл изменить

```text
client/src/shared/i18n/api-message.ts
```

### Что должна делать функция

Функция получает:

- экземпляр/функцию i18next;
- `code`;
- `params`.

Алгоритм:

1. Проверить, существует ли ключ в namespace `api`.
2. Если существует — перевести с `params`.
3. Если не существует — вернуть `COMMON.UNKNOWN_ERROR`.
4. В development вывести warning с неизвестным code.
5. Никогда не показывать пользователю сам неизвестный code вместо текста.

Пример использования внутри React-компонента:

```text
получить t через useTranslation()
поймать ApiClientError
передать error.code и error.params в getApiMessage
результат передать toast.error
```

### Сетевые ошибки

У сетевой ошибки нет серверного code. Для неё клиент использует собственный локальный ключ:

```text
COMMON.NETWORK_ERROR
```

Это не серверный error code, а состояние клиента.

### Проверка этапа

Временно отправь с dev server неизвестный код. Интерфейс должен показать общий перевод, а не пустой toast, stack trace или технический ключ.

Коммит:

```text
feat(i18n): translate api errors with safe fallback
```

---

## Этап 8. Перевести login как первый вертикальный сценарий

Не переделывай сразу все формы. Сначала полностью проведи один запрос от server service до toast.

### Сервер

Изменить:

```text
server/src/modules/auth/auth.service.ts
```

Ситуации:

- неправильный username или password → `AUTH.INVALID_CREDENTIALS`;
- rate limit → `AUTH.TOO_MANY_ATTEMPTS`;
- недействительная сессия → `AUTH.SESSION_INVALID`.

### Клиент

Изменить:

```text
client/src/features/auth-form/ui/CreateAdminForm.tsx
```

Файл назван неудачно: это login form, поэтому отдельным рефакторингом его стоит переименовать в `LoginForm.tsx`, но не смешивай переименование с изменением API-контракта.

Форма должна:

1. Использовать `useTranslation`.
2. При `ApiClientError` получать перевод через общий helper.
3. При сетевой ошибке показывать `COMMON.NETWORK_ERROR`.
4. Не читать `response.message`.

### Обязательная security-проверка

Неправильный пароль существующего пользователя и вход под несуществующим username должны иметь одинаковые:

- HTTP status;
- code;
- перевод;
- приблизительно одинаковую внешнюю форму ответа.

Коммит:

```text
refactor(auth): use localized api result codes
```

---

## Этап 9. Добавить коды успешных результатов

### Зачем они нужны

Toast после успешного login, logout, создания администратора и миграции тоже должен переводиться на клиенте.

### Создать файл

```text
server/src/shared/api/codes/success-codes.ts
```

Пример каталога:

```ts
export const SUCCESS_CODES = {
    COMMON_OK: 'COMMON.OK',
    AUTH_LOGIN_SUCCEEDED: 'AUTH.LOGIN_SUCCEEDED',
    AUTH_LOGOUT_SUCCEEDED: 'AUTH.LOGOUT_SUCCEEDED',
    INSTALL_DATABASE_CONNECTED: 'INSTALL.DATABASE_CONNECTED',
    INSTALL_MIGRATION_PLAN_RECEIVED: 'INSTALL.MIGRATION_PLAN_RECEIVED',
    INSTALL_MIGRATION_APPLIED: 'INSTALL.MIGRATION_APPLIED',
    INSTALL_ADMIN_CREATED: 'INSTALL.ADMIN_CREATED',
    BOOTSTRAP_STATUS_RECEIVED: 'BOOTSTRAP.STATUS_RECEIVED',
} as const;

export type SuccessCode = typeof SUCCESS_CODES[keyof typeof SUCCESS_CODES];
```

### Изменить server response helpers

Файлы:

```text
server/src/shared/api/response.types.ts
server/src/shared/api/response.ts
server/src/shared/api/success.ts
```

Новая сигнатура должна быть смыслово такой:

```text
ok(res, successCode, data)
created(res, successCode, data)
```

Русский `message` контроллер больше не передаёт.

### Важное замечание про `204 No Content`

Ответ со статусом `204` по стандарту не должен содержать body. Поэтому helper `noContent` не должен пытаться вернуть code/message в JSON. Если клиенту нужен success code, используй `200`; если выбран настоящий `204`, клиент ориентируется только на HTTP status.

### Перевести контроллеры

```text
server/src/modules/auth/auth.controller.ts
server/src/modules/bootstrap/bootstrap.controller.ts
server/src/modules/install/install.controller.ts
server/src/modules/install/registerNewAdmin/register.controller.ts
```

На клиенте добавить соответствующие переводы в `ru/api.ts` и `en/api.ts`.

Не каждый успешный response нужно показывать toast. Например, фоновый `/auth/me` и bootstrap status обычно работают без уведомления.

Коммит:

```text
refactor(api): add typed success response codes
```

---

## Этап 10. Сделать профессиональные ошибки валидации

### Текущая проблема

`validate.ts` возвращает русские `issue.message`. Клиент снова зависит от языка сервера и не может надёжно понять тип ошибки.

### Какие файлы создать

```text
server/src/shared/api/validation/validation.types.ts
server/src/shared/api/validation/map-zod-issue.ts
```

### Целевая форма

```json
{
  "success": false,
  "code": "COMMON.VALIDATION_FAILED",
  "details": {
    "fields": [
      {
        "field": "password",
        "code": "VALIDATION.STRING_TOO_SHORT",
        "params": {
          "min": 12
        }
      }
    ]
  }
}
```

### Дополнить каталог

Добавить стабильные validation codes, например:

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

### Что делает mapper

`map-zod-issue.ts` получает Zod issue и превращает его в:

- `field` из `issue.path`;
- твой стабильный validation code;
- безопасные параметры `min`, `max` и другие ограничения.

Нельзя просто отправлять `issue.message`, потому что message предназначен человеку и может измениться при смене языка или версии Zod.

### Какой файл изменить

```text
server/src/shared/middleware/validate.ts
```

Middleware должен вернуть одну `ApiError`:

- общий code `COMMON.VALIDATION_FAILED`;
- массив field errors внутри details.

### Клиент и React Hook Form

На клиенте создай helper:

```text
client/src/shared/api/apply-field-errors.ts
```

Он получает:

- список server field errors;
- `setError` из React Hook Form;
- функцию перевода.

Он привязывает перевод к соответствующему input. Общий toast нужен только для ошибки, которую нельзя привязать к полю.

### Не доверять имени поля вслепую

Серверное поле приходит как строка. Перед вызовом `setError` клиент должен разрешать только поля конкретной формы. Не нужно передавать произвольный server path в React Hook Form через безусловный type assertion.

Коммит:

```text
feat(validation): return localized field error codes
```

---

## Этап 11. Перевести остальные модули по одному

Рекомендуемый порядок:

1. Login/logout/getMe.
2. Подключение к БД.
3. Получение и применение миграций.
4. Создание первого администратора.
5. Bootstrap/system states.
6. Будущий query engine и CRUD.

Для каждого модуля используй один и тот же чек-лист:

- все ожидаемые server outcomes имеют code;
- код находится в серверном каталоге;
- русский и английский словари содержат перевод;
- клиент не читает server `message`;
- параметры перевода не содержат секретов;
- неизвестный code приводит к fallback;
- HTTP status соответствует смыслу;
- добавлены тесты.

После перевода последнего endpoint удалить legacy parsing `message` из `apiClient`.

---

## Этап 12. Добавить выбор и сохранение языка

### Где хранить состояние

Создать:

```text
client/src/app/providers/i18n/LanguageContext.ts
client/src/app/providers/i18n/LanguageProvider.tsx
```

Provider хранит выбранный язык и вызывает `i18n.changeLanguage(language)`.

### Где хранить выбор пользователя

До появления пользовательских настроек на сервере можно использовать `localStorage`, потому что язык не является секретом.

Алгоритм первого запуска:

1. Прочитать сохранённый язык.
2. Если его нет — проверить язык браузера.
3. Если он поддерживается — выбрать его.
4. Иначе использовать fallback.

Хранить только разрешённые значения:

```text
ru
en
```

Нельзя без проверки передавать произвольную строку из localStorage в i18next.

Когда появится профиль пользователя, выбранный язык можно сохранять в БД. Приоритет можно сделать таким:

```text
профиль пользователя → localStorage → browser language → fallback
```

---

## Этап 13. Тесты, без которых это не production-ready

### Серверные unit-тесты

Проверить:

1. Каждый helper создаёт правильные status и code.
2. Неизвестная Error превращается в `COMMON.INTERNAL_ERROR`.
3. Stack и internal message не попадают в JSON.
4. Zod issue преобразуется в ожидаемый validation code.
5. Параметры version conflict находятся в `params`.

### Серверные integration-тесты

Проверить ответы реальных endpoints:

- неправильный login;
- rate limit;
- неправильный setup token;
- завершённые миграции;
- migration version conflict;
- повторное создание администратора;
- повреждённый request body;
- неизвестная ошибка `500`.

### Клиентские unit-тесты

Проверить:

1. Известный code переводится на `ru`.
2. Тот же code переводится на `en`.
3. `params` подставляются.
4. Неизвестный code показывает fallback.
5. Сетевая ошибка показывает network fallback.
6. Field error попадает в правильное поле формы.

### Contract coverage test

Поскольку server и client пока не используют общий package, нужен тест/скрипт, который проверяет: для каждого публичного server code существуют переводы `ru` и `en`.

На следующем архитектурном этапе эту задачу можно решить OpenAPI-схемой или общим `packages/api-contract`, но только вместе с корректной настройкой Docker build context и package workspaces.

---

## Этап 14. Проверки перед удалением server `message`

Удалять пользовательские сообщения сервера можно только когда:

- все endpoints возвращают code;
- `apiClient` понимает новый контракт;
- все формы используют общий переводчик;
- есть fallback неизвестного кода;
- в обоих языках есть переводы;
- field validation больше не зависит от Zod message;
- тесты проходят;
- production build проходит.

После этого:

1. Удалить `message` из `ApiResponse` и client `UnifiedResponse`.
2. Удалить `extractMessage` из `apiClient`.
3. Удалить чтение `response.message` и `error.message` как пользовательского текста.
4. Оставить `Error.message` только внутри server/client logging.
5. Проверить через поиск:

```bash
rg "response\.message|apiError\.message|extractMessage" client/src
```

Результат должен быть пустым либо содержать только осознанный legacy-код, который оформлен отдельной задачей.

---

## Что не нужно переводить через server codes

Не все тексты интерфейса приходят от API. Кнопки, заголовки, placeholders и loaders переводятся обычными UI-ключами:

```text
common.buttons.login
common.buttons.logout
install.database.title
install.migrations.loading
```

Server codes нужны только для результатов и состояний API.

Не нужно локализовывать:

- server logs;
- имена таблиц и колонок;
- stack traces;
- SQL;
- error codes;
- технические identifiers.

---

## Короткая памятка: кто за что отвечает

| Часть | Ответственность |
|---|---|
| Service | Выбирает точный доменный code |
| ApiError | Хранит status, code, params, details и внутреннюю причину |
| errorHandler | Безопасно превращает ошибку в JSON |
| Controller | Выбирает success code и возвращает data |
| apiClient | Проверяет wire-response и создаёт ApiClientError |
| i18next | Хранит переводы и текущий язык |
| api-message helper | Переводит code и применяет fallback |
| React-компонент | Решает, где показать результат: toast, поле формы или отдельный экран |

---

## Полный рекомендуемый порядок коммитов

1. `refactor(api): add typed error code catalog`
2. `refactor(api): require typed codes for api errors`
3. `refactor(api): return machine-readable error responses`
4. `refactor(client-api): parse structured api errors`
5. `feat(i18n): initialize russian and english resources`
6. `feat(i18n): translate api errors with safe fallback`
7. `refactor(auth): use localized api result codes`
8. `refactor(api): add typed success response codes`
9. `feat(validation): return localized field error codes`
10. `refactor(install): use localized api result codes`
11. `feat(i18n): add language provider and selector`
12. `test(api): cover codes translations and fallbacks`
13. `refactor(api): remove legacy message contract`

После каждого серверного коммита:

```bash
cd server
npx tsc --noEmit --skipLibCheck false
```

После каждого клиентского коммита:

```bash
cd client
npx tsc -b --noEmit
npm run lint
```

После изменения wire-контракта обязательно вручную проверить минимум login, logout, setup token, migration conflict и создание администратора.

