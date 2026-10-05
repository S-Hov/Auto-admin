# Страница первичной конфигурации системы: план реализации

## 1. Что нужно получить

Сервер умеет возвращать новый bootstrap stage:

```text
system_configuration_required
```

Он означает не то же самое, что `database_required`.

- `system_configuration_required` — тип СУБД ещё не выбран, поэтому сервер не
  может создать активный database provider;
- `database_required` — тип СУБД уже выбран, но ещё не сохранены полные
  реквизиты подключения.

Клиент пока не знает первый stage. Из-за этого после ответа bootstrap он не
может показать подходящую страницу и продолжить установку.

Нужно добавить отдельный первый шаг установки. На нём пользователь должен:

1. Увидеть форму в том же визуальном стиле, что и остальные формы проекта.
2. Выбрать язык интерфейса.
3. Ввести installation token.
4. Получить с сервера список реально поддерживаемых баз данных.
5. Выбрать тип базы данных в обычном HTML `<select>`.
6. Отправить выбранный тип базы данных на сервер.
7. После успешной настройки автоматически перейти к вводу реквизитов
   подключения к базе данных.

Целевой пользовательский поток:

```text
GET /api/bootstrap/status
        ↓
system_configuration_required
        ↓
/{locale}/install/systemConfiguration
        ↓
GET /api/install/system-configuration/options
        ↓
пользователь выбирает язык, СУБД и вводит installation token
        ↓
POST /api/install/system-configuration
        ↓
повторный GET /api/bootstrap/status
        ↓
database_required
        ↓
/{locale}/install
```

URL остаётся единственным источником правды о языке. Выбор языка не должен
попадать в body install-запроса.

---

## 2. Что уже реализовано на сервере

Перед началом клиентской работы нужно прочитать фактические контракты в:

```text
server/src/modules/bootstrap/bootstrap.types.ts
server/src/modules/bootstrap/bootstrap.service.ts
server/src/modules/install/install.routes.ts
server/src/modules/install/install.controller.ts
server/src/modules/install/install.service.ts
server/src/modules/install/install.types.ts
server/src/modules/install/schema/checkDatabaseType.schema.ts
server/src/db/catalog/database.catalog.ts
```

На сервере уже есть всё необходимое для этой задачи. Добавлять новый endpoint
или дублировать каталог баз данных на клиенте не требуется.

### 2.1. Получение вариантов

```text
GET /api/install/system-configuration/options
```

Успешный ответ использует общий API envelope проекта. Полезные данные находятся
в `response.data` и имеют форму:

```json
{
  "supportedDatabases": ["mysql"]
}
```

Список формируется методом `getSupportedDatabases()` серверного каталога. Клиент
не должен самостоятельно решать, какие элементы из `mysql`, `postgresql` и
`sqlite` уже готовы к использованию.

Этот GET endpoint не требует installation token. Благодаря этому пользователь
может увидеть варианты до отправки формы.

### 2.2. Сохранение выбора

```text
POST /api/install/system-configuration
```

Тело запроса:

```json
{
  "databaseType": "mysql"
}
```

Installation token передаётся не в JSON, а в заголовке:

```text
x-auto-admin-install-token
```

Для имени заголовка на клиенте уже существует
`HTTP_HEADERS.INSTALL_TOKEN`. Не записывай строку заголовка повторно в новом
компоненте.

Сервер проверяет выбранное значение своей Zod-схемой, сохраняет
`Auto_Admin__DB_TYPE` и настраивает runtime provider. После этого следующий
bootstrap stage должен стать `database_required`.

### 2.3. Важная граница ответственности

Endpoint вариантов сообщает только технические идентификаторы поддерживаемых
СУБД. Тексты формы, label поля и человекочитаемые подписи вариантов принадлежат
клиенту и локализуются на клиенте.

При этом сам состав `<option>` всегда строится из ответа сервера. Нельзя создать
в компоненте постоянный массив `['mysql']`: такой массив быстро разойдётся с
серверным каталогом.

---

## 3. Предварительное условие: законченная URL-локализация

Эта задача продолжает план из `docs/client-url-localization-guide.md` и должна
выполняться после исправления и принятия URL-локализации.

До начала убедись, что в клиенте уже работают:

```text
shared/i18n/config.ts
app/routing/layouts/LocaleLayout.tsx
app/routing/locale/use-app-locale.ts
app/routing/app-paths.ts
features/language-switcher/ui/LanguageSwitcher.tsx
```

Особенно важно проверить, что `LanguageSwitcher` действительно сравнивает
языки, а не присваивает один другому, и что он сохраняет pathname, search и hash.
Новая страница не должна копировать его логику или напрямую вызывать
`i18n.changeLanguage()`.

Если основная ветка на момент реализации ещё не содержит локализованных
маршрутов, сначала синхронизируй ветку с принятой реализацией локализации. Не
создавай временную нелокализованную страницу `/install/systemConfiguration`,
которую затем придётся переписывать.

---

## 4. Разделение ответственности

Новая функциональность не должна превращаться в один большой page-компонент.

Рекомендуемое разделение:

```text
client/src/
├─ app/
│  └─ routing/
│     ├─ app-paths.ts
│     ├─ guards/AppGate.tsx
│     └─ router.tsx
│
├─ features/
│  ├─ system-configuration/
│  │  ├─ i18n/
│  │  │  ├─ ru.json
│  │  │  └─ en.json
│  │  ├─ model/
│  │  │  └─ systemConfiguration.schema.ts
│  │  └─ ui/
│  │     └─ SystemConfigurationForm.tsx
│  │
│  ├─ install-database/
│  │  ├─ model/installDatabase.schema.ts
│  │  └─ ui/InstallDatabaseForm.tsx
│  │
│  └─ language-switcher/
│     └─ ui/LanguageSwitcher.tsx
│
├─ pages/
│  └─ system-configuration/
│     ├─ i18n/
│     │  ├─ ru.json
│     │  └─ en.json
│     └─ systemConfigurationPage.tsx
│
└─ shared/
   ├─ api/database/install/
   │  ├─ index.ts
   │  └─ install.types.ts
   └─ i18n/resources.ts
```

Ответственность модулей:

- page размещает форму и переключатель языка, задаёт document title;
- feature владеет состоянием формы, загрузкой вариантов и отправкой выбора;
- shared API знает URL, DTO, заголовки и общий API envelope;
- `AppGate` решает, на какой установочный шаг должен попасть пользователь;
- `LanguageSwitcher` меняет только язык в URL;
- старая форма подключения собирает только реквизиты подключения.

Названия файлов можно адаптировать к принятому стилю проекта, но границы между
page, feature и shared API сохраняются.

---

## 5. Добавить новый stage в клиентский контракт

Изменить:

```text
client/src/shared/api/bootstrap/bootstrap.types.ts
```

Добавь `system_configuration_required` в `BootstrapStage`.

Не заменяй union на обычный `string`. Закрытый union полезен именно здесь: при
добавлении серверного состояния TypeScript должен заставить разработчика найти
места, где оно обрабатывается.

После изменения найди все проверки `state.stage` и `BootstrapStage` по проекту.
Новый тип сам по себе не создаёт страницу и не выполняет redirect.

### Проверка этапа

Ответ bootstrap с новым stage:

- не считается ошибкой контракта;
- попадает в `BootstrapProvider` как resolved state;
- остаётся доступным в `AppGate`.

---

## 6. Описать API-типы первичной конфигурации

Изменить:

```text
client/src/shared/api/database/install/install.types.ts
```

Нужны отдельные типы минимум для:

- идентификатора поддерживаемой базы данных;
- данных `SystemConfigurationOptionsResponse`;
- тела POST-запроса;
- значений новой формы.

Не смешивай три разных понятия:

```text
form values       → databaseType + installation token
request body      → только databaseType
request headers   → installation token
```

Installation token не является частью серверного DTO
`system-configuration`. Он нужен API-функции для формирования заголовка.

Подсказка: серверный тип сейчас построен от `DATABASE_TYPES`, а options endpoint
возвращает только элементы со статусом `supported`. На клиенте можно описать
известные идентификаторы union-типом, но нельзя использовать этот union как
источник options. Источник вариантов — только ответ GET endpoint.

### Не расширяй контракт без причины

Сервер сейчас не возвращает `displayName`, `defaultPort` или статус поддержки.
Не пиши клиент так, будто эти поля уже существуют. Если продукту позже будут
нужны метаданные, это потребует отдельного согласованного изменения API.

---

## 7. Расширить install API facade

Изменить:

```text
client/src/shared/api/database/install/index.ts
```

Добавь в существующий объект `installDatabase` два понятных метода:

```text
получить варианты системной конфигурации
сохранить выбранную системную конфигурацию
```

Названия выбери в стиле уже существующих методов, но они должны явно отличать
GET options от POST mutation.

Для реализации используй существующий `apiClient<TData>()`:

- GET вызывает `/install/system-configuration/options`;
- POST вызывает `/install/system-configuration`;
- POST сериализует только `{ databaseType }`;
- POST передаёт token через `HTTP_HEADERS.INSTALL_TOKEN`;
- компонент не должен самостоятельно собирать `getBaseUrl() + '/api'`;
- компонент не должен вручную разбирать JSON или проверять `response.ok`.

`apiClient` уже выбрасывает `ApiClientError` для error envelope. Поэтому UI
обрабатывает ошибку через существующий `apiMessage`, а не через локальный список
HTTP status.

### Подсказка по token

На первом POST token ещё находится в состоянии новой формы, поэтому метод
сохранения конфигурации может принять его отдельным аргументом. После успешного
ответа token понадобится следующим install endpoints.

Не сохраняй token до успешного ответа сервера: иначе неверный token останется в
сессии и последующие формы начнут отправлять его автоматически.

---

## 8. Добавить локализацию новой page и feature

Тексты должны лежать рядом с владельцем смысла, как в плане URL-локализации.

Feature владеет такими текстами:

- заголовок и описание формы;
- label и placeholder installation token;
- label выбора базы данных;
- начальный option вроде «Выберите базу данных»;
- текст кнопки;
- состояние загрузки вариантов;
- состояние пустого списка;
- действие повторной загрузки;
- toast отправки конфигурации;
- подписи известных идентификаторов баз данных.

Page владеет:

- заголовком вкладки браузера;
- при необходимости коротким текстом вокруг всей формы.

Создай одинаковую структуру ключей в `ru.json` и `en.json`, затем зарегистрируй
namespace в:

```text
client/src/shared/i18n/resources.ts
client/src/shared/i18n/i18next.d.ts
```

Внутри feature используй `useTranslation()` с её namespace. Не импортируй
глобальную `t` для создания массива полей на уровне модуля: такие значения не
обновятся при смене языка и могут прочитаться из default namespace.

### Подписи вариантов базы данных

Ответ сервера содержит технические значения. Для известных вариантов можно
завести переводы по схеме:

```text
databases.mysql
databases.postgresql
databases.sqlite
```

Однако список `<option>` строится только из `supportedDatabases`. Наличие
перевода `postgresql` не означает, что PostgreSQL уже можно показать.

Продумай безопасный fallback для нового серверного идентификатора, чтобы UI не
показывал пустой option до обновления клиентских переводов.

---

## 9. Создать схему формы

Создать:

```text
client/src/features/system-configuration/model/systemConfiguration.schema.ts
```

Форма содержит два значения:

```text
databaseType
installation token
```

Схема должна проверять:

- что пользователь действительно выбрал непустой `databaseType`;
- что token удовлетворяет действующему минимальному ограничению проекта;
- что в POST body не попадут посторонние поля формы.

Не копируй русские сообщения напрямую из старой
`installDatabase.schema.ts`. После появления локализации постоянная Zod-схема с
русскими строками будет нарушать язык URL.

Подход выбери осознанно:

1. фабрика схемы получает `t` и создаёт сообщения текущего языка; или
2. схема возвращает стабильные технические ключи, а UI переводит их.

Для небольшой формы фабрика схемы обычно проще, но тогда не забудь, что resolver
должен обновиться при смене языка.

Значение `databaseType` дополнительно должно сверяться с загруженными options.
Нельзя считать любое строковое значение валидным только потому, что TypeScript
показывает union: содержимое HTML и сетевого ответа существует в runtime.

---

## 10. Реализовать форму первичной конфигурации

Создать:

```text
client/src/features/system-configuration/ui/SystemConfigurationForm.tsx
```

Используй существующие зависимости и компоненты:

```text
react-hook-form
zodResolver
CardForm
ControlledInput
Button
toast
apiMessage
useBootstrap
```

Для выбора базы данных на этом этапе нужен обычный HTML `<select>`. Не добавляй
стороннюю библиотеку и не создавай сложный кастомный dropdown.

В проекте пока нет общего `ControlledSelect`. Для одной формы допустимо связать
нативный select с `react-hook-form` прямо внутри feature через `register` или
`Controller`. Не превращай одно использование в преждевременный shared-компонент.
Если второй select появится в другой feature, тогда можно вынести общий wrapper.

### 10.1. Загрузка options

После первого render форма вызывает метод GET из `installDatabase`.

Нужно явно представить состояния:

```text
loading → success с вариантами → empty
                     ↘ error с retry
```

Требования:

- во время загрузки select и submit недоступны;
- при ошибке пользователь видит понятное сообщение и кнопку повторной загрузки;
- при пустом массиве нельзя отправить форму;
- первый доступный вариант не выбирается молча, если продукт ожидает осознанный
  выбор;
- поздний ответ не должен менять state уже размонтированного компонента;
- повторный render не должен запускать бесконечную цепочку GET-запросов.

Подсказка: вынеси загрузку в стабильную callback-функцию. Её можно вызвать из
effect и из кнопки retry. Если API facade пока не принимает `AbortSignal`,
используй cleanup-флаг по образцу существующих providers либо аккуратно расширь
facade поддержкой `signal`.

### 10.2. Отправка формы

При submit:

1. Возьми `databaseType` и token из валидированных form values.
2. Вызови POST-метод install API.
3. Покажи pending/success/error через `toast.promise` и `apiMessage`.
4. Только после успешного ответа сохрани token для следующих шагов установки.
5. Вызови `refreshBootstrap()`.
6. Позволь `AppGate` выбрать следующий URL по новому серверному stage.

Не делай ручной `navigate('/install')` сразу после POST. Сервер остаётся
источником правды о текущем этапе. Если runtime-конфигурация по какой-то причине
не применилась, повторный bootstrap не должен быть проигнорирован клиентом.

Кнопка submit должна использовать `type="submit"`, иметь локализованный текст и
быть disabled во время отправки или пока options недоступны.

### 10.3. Сохранение installation token

Следующие install endpoints уже читают token из `sessionStorage` через
`STORAGE_KEYS.INSTALL_TOKEN`. Продолжай текущую архитектуру проекта:

- не используй `localStorage`;
- не добавляй token в URL, query или hash;
- не включай token в toast и текст ошибок;
- не передавай token в body серверного DTO;
- сохраняй его только после успешной серверной проверки;
- существующее удаление token при bootstrap stage `ready` должно сохраниться.

Долгосрочный отказ от Web Storage может быть отдельной security-задачей. В этой
задаче важнее не создать второй несовместимый способ передачи token.

---

## 11. Собрать page и подключить переключатель языка

Создать:

```text
client/src/pages/system-configuration/systemConfigurationPage.tsx
```

Page должна:

- использовать тот же section/container layout, что страницы login и install;
- отрисовать существующий `LanguageSwitcher`;
- отрисовать `SystemConfigurationForm`;
- установить локализованный `document.title`;
- не выполнять API-запросы самостоятельно.

Language switcher не является значением формы и не отправляется на сервер.
Предпочтительно разместить его рядом с карточкой или в отдельной зоне page, а не
регистрировать в `react-hook-form`.

Если по дизайну переключатель окажется внутри HTML `<form>`, проверь, что каждая
его кнопка имеет `type="button"`. Иначе нажатие RU/EN может случайно отправить
форму.

При смене языка путь должен изменяться так:

```text
/ru/install/systemConfiguration
        ↓ EN
/en/install/systemConfiguration
```

`search` и `hash`, если они присутствуют, сохраняются существующим
`LanguageSwitcher`.

---

## 12. Добавить локализованный маршрут

Изменить:

```text
client/src/app/routing/app-paths.ts
client/src/app/routing/router.tsx
```

В `appPaths` добавь функцию пути первичной конфигурации. Она должна принимать
проверенный `AppLocale`, как остальные UI paths.

В router лениво подключи новую page как дочерний route `install`.

Сохраняй текущий стиль URL проекта. Если существующие установочные адреса
используют `runMigrations` и `migrationRecovery`, не смешивай эту задачу с общей
миграцией URL на kebab-case. Для этой итерации ожидаемый путь:

```text
/{locale}/install/systemConfiguration
```

API URL при этом остаётся kebab-case:

```text
/api/install/system-configuration/options
/api/install/system-configuration
```

UI route и API endpoint — разные пространства имён. Не добавляй locale к API и
не используй API URL в `<Navigate>`.

---

## 13. Обработать stage в `AppGate`

Изменить:

```text
client/src/app/routing/guards/AppGate.tsx
```

В начале компонента уже должны вычисляться локализованные paths через
`appPaths`. Добавь туда путь первичной конфигурации.

Обработку `system_configuration_required` расположи раньше
`database_required`, потому что это более ранний этап state machine.

Правило:

```text
если stage === system_configuration_required
    текущий путь должен быть /{locale}/install/systemConfiguration
    иначе выполнить replace redirect на него
```

Когда пользователь уже находится на правильной странице, `AppGate` должен
вернуть `<Outlet />` и не перейти к auth-проверкам ниже.

После успешного POST форма вызывает `refreshBootstrap()`. Новый
`database_required` заставляет тот же gate отправить пользователя на:

```text
/{locale}/install
```

Так выбранный язык сохраняется на всём bootstrap-проходе.

### Избегай строковых сравнений вручную

Не добавляй проверки вида:

```text
location.pathname === '/install/systemConfiguration'
```

Используй результат `appPaths.systemConfiguration(locale)`. Иначе английский URL
потеряет язык или создаст redirect loop.

---

## 14. Перенести installation token из формы подключения

Изменить:

```text
client/src/features/install-database/model/installDatabase.schema.ts
client/src/features/install-database/ui/InstallDatabaseForm.tsx
client/src/shared/api/database/install/index.ts
client/src/shared/api/database/install/install.types.ts
```

После появления первого шага `InstallDatabaseForm` больше не владеет token.

Удали из неё:

- поле token в Zod-схеме;
- token из `defaultValues`;
- конфигурацию `ControlledInput` для token;
- извлечение token из submit data;
- сохранение token после проверки соединения.

Форма подключения должна собирать только реквизиты выбранной СУБД:

```text
host
port
database
user
password
```

Метод `checkTheConnection` всё ещё обязан отправлять installation token, потому
что сервер защищает endpoint middleware `requireInstallToken`. Но теперь token
берётся из общего session storage так же, как в методах миграций.

Лучше централизовать добавление install-token header внутри API-слоя, чем читать
`sessionStorage` в UI-компоненте. Компонент не должен знать имя HTTP-заголовка.

Если token отсутствует, не придумывай локальную авторизацию. Сервер вернёт
договорённый API code, а `apiMessage` покажет локализованную ошибку. При желании
API facade может fail fast с общей контрактной ошибкой, но поведение должно быть
единым для всех install endpoints.

### Убрать жёсткую привязку к MySQL

Сейчас форма подключения передаёт `type: 'mysql'` и показывает MySQL в тексте
загрузки. После выбора provider на предыдущем шаге сервер уже знает тип базы.

Проверь фактический `check-connection` контракт и убери из клиентского payload
лишнее поле `type`, если сервер его не принимает. Тексты проверки подключения
тоже не должны всегда говорить MySQL.

Эта правка является частью переноса ответственности: первый шаг выбирает тип,
второй вводит параметры уже выбранного типа.

---

## 15. Не дублировать состояние между страницами

Не создавай клиентский context только ради выбранного `databaseType`.

После POST сервер:

- сохраняет тип в environment;
- настраивает `databaseRuntime`;
- меняет результат bootstrap;
- использует активный provider в следующих install-операциях.

Поэтому переход между шагами должен опираться на серверное состояние. Если
страницу обновить после выбора базы, bootstrap обязан снова вернуть
`database_required`, а клиент — открыть форму подключения.

Локальный state нужен только для временного состояния текущей формы и загрузки
options.

---

## 16. Обработать ошибки и пограничные состояния

Новая страница должна различать как минимум:

### Не удалось загрузить варианты

- не показывать пустой активный select;
- показать retry;
- не переводить bootstrap в error целиком;
- не отправлять POST.

### Сервер вернул пустой список

- показать отдельный локализованный текст;
- оставить submit disabled;
- не подставлять `mysql` вручную.

### Неверный installation token

- оставить пользователя на той же странице;
- показать сообщение через `apiMessage`;
- не сохранять token в session storage;
- не вызывать успешный переход.

### Конфигурацию уже выполнил другой запрос

Сервер может вернуть conflict. Покажи его обычным API-сообщением, затем можно
обновить bootstrap status, чтобы клиент узнал фактический этап. Не пытайся
насильно повторно перезаписать тип базы.

### Options изменились между GET и POST

Клиентская проверка улучшает UX, но серверная Zod-схема и provider registry
остаются окончательной проверкой. UI не должен считать локальный массив
достаточной защитой контракта.

### Смена языка во время запроса

Статические label должны сразу обновиться. Для toast учитывай, что его текст
вычисляется в момент соответствующего события. Не кешируй `t()` на уровне
модуля.

---

## 17. Проверки поведения

Тесты не должны повторять внутреннее устройство компонента. Проверяй видимый
контракт пользователя и вызовы API.

### API facade

```text
GET options использует правильный endpoint
POST отправляет только databaseType
POST передаёт x-auto-admin-install-token
ошибочный envelope превращается в ApiClientError
```

### Форма

```text
во время GET показано состояние загрузки
варианты строятся из response.data.supportedDatabases
empty response блокирует submit
ошибка GET даёт retry
без databaseType форма не отправляется
без валидного token форма не отправляется
успешный POST сохраняет token и вызывает refreshBootstrap
ошибочный POST не сохраняет token
```

### Router и AppGate

Для обоих языков:

```text
system_configuration_required → /{locale}/install/systemConfiguration
database_required             → /{locale}/install
```

Также проверь:

```text
/en/install/systemConfiguration не превращается в /ru/...
правильный configuration path не создаёт redirect loop
после refreshBootstrap новый stage переводит на следующий шаг
```

### Перенос token

```text
InstallDatabaseForm больше не показывает token
check-connection получает token из общего install API механизма
обновление страницы между шагами не теряет token текущей вкладки
stage ready очищает token
```

---

## 18. Ручная проверка полного потока

Проверять нужно на сервере без `Auto_Admin__DB_TYPE` в конфигурации.

### Русский сценарий

1. Открыть `/ru`.
2. Убедиться в redirect на `/ru/install/systemConfiguration`.
3. Убедиться, что форма и document title русские.
4. Проверить, что select содержит только значения из options endpoint.
5. Ввести неверный token и убедиться, что перехода нет.
6. Ввести правильный token и выбрать базу.
7. Убедиться в переходе на `/ru/install`.
8. Убедиться, что token больше не спрашивается в форме подключения.
9. Заполнить реквизиты и продолжить установку.

### Английский сценарий

1. Открыть `/en/install/systemConfiguration` напрямую.
2. Убедиться, что весь новый UI английский.
3. Переключить RU и EN и проверить сохранение остального пути.
4. Завершить выбор базы на английском URL.
5. Убедиться, что следующий redirect ведёт на `/en/install`, а не `/ru/install`.
6. Обновить страницу и убедиться, что серверный stage восстанавливает правильный
   шаг.

### Пограничный сценарий

1. Открыть страницу при недоступном options endpoint.
2. Убедиться, что приложение не падает и предлагает retry.
3. Вернуть endpoint и повторить запрос.
4. Убедиться, что форма становится доступной без полной перезагрузки страницы.

---

## 19. Что не входит в эту задачу

Не нужно одновременно:

- создавать кастомный визуальный select;
- добавлять поиск по базам данных;
- показывать planned базы как disabled options;
- менять серверный database catalog;
- добавлять новый backend endpoint;
- переводить все старые install-страницы проекта;
- менять стиль всех URL на kebab-case;
- хранить выбранную базу в отдельном клиентском context;
- передавать locale серверу;
- отправлять installation token в request body;
- перерабатывать всю систему секретов проекта.

Если при реализации выяснится, что фактический backend contract отличается от
описанного, сначала обнови этот документ и согласуй границу задачи, а не
подгоняй клиент под предполагаемый ответ.

---

## 20. Критерии готовности

Работа считается завершённой, когда одновременно выполнены условия:

- клиентский `BootstrapStage` знает `system_configuration_required`;
- `AppGate` обрабатывает его раньше `database_required`;
- для stage существует отдельный локализованный route;
- page использует существующие layout-паттерны проекта;
- на page подключён рабочий `LanguageSwitcher`;
- форма использует `CardForm`, `ControlledInput`, `Button` и обычный HTML select;
- варианты select приходят из GET endpoint, а не из хардкода;
- POST отправляет только выбранный `databaseType` в body;
- installation token уходит в правильном заголовке;
- token сохраняется только после успешного POST;
- после submit вызывается `refreshBootstrap`, а следующий маршрут выбирает
  `AppGate`;
- `InstallDatabaseForm` больше не содержит token;
- check-connection продолжает получать token через общий API-слой;
- из client payload убрана лишняя жёсткая привязка к MySQL;
- русская и английская версии имеют одинаковый набор ключей;
- смена языка сохраняет установочный путь;
- loading, error, empty и retry состояния реализованы явно;
- прямое открытие и обновление вложенного URL работают;
- production build клиента проходит без TypeScript-ошибок.

Главная архитектурная проверка звучит так:

> Сервер определяет текущий этап установки и список поддерживаемых баз данных,
> URL определяет язык, API-слой владеет HTTP-контрактом, а форма владеет только
> пользовательским вводом и состоянием запроса.
