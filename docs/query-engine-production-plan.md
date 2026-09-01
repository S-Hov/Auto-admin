# План доведения Query Engine до production-уровня

Дата аудита: 1 сентября 2026 года  
Проверенная область: `server/src/core/query-engine`

## Цель движка

Query Engine принимает декларативное описание запроса и безопасно выполняет его в MySQL:

```text
JSON от клиента
    ↓
runtime validation
    ↓
проверка таблиц и колонок
    ↓
проверка прав пользователя
    ↓
внутренний безопасный AST
    ↓
MySQL compiler
    ↓
CompiledQuery { sql, params }
    ↓
Database driver
    ↓
QueryResult
```

Движок должен поддерживать две основные задачи Auto Admin:

1. Обычный CRUD над разрешёнными пользовательскими таблицами.
2. Pipeline, в котором следующий запрос использует результат предыдущего и при необходимости выполняется в общей транзакции.

## Текущее состояние

Что сделано хорошо:

- входной запрос описан как AST, а не как готовая SQL-строка;
- значения передаются через `?` и отдельный массив params;
- compiler отделён от driver;
- driver можно заменить тестовой реализацией;
- массив запросов можно выполнить в транзакции;
- pipeline поддерживает зависимости и context references;
- модуль пока не подключён к публичным HTTP routes.

Что блокирует production:

- входной JSON не проверяется во время выполнения;
- sort direction и join type могут привести к SQL injection;
- пустой where приводит к массовому UPDATE/DELETE;
- нет schema allowlist;
- нет permission policy;
- нет query limits и timeouts;
- pipeline молча превращает отсутствующую ссылку в `undefined`;
- отсутствуют тесты;
- часть объявленных возможностей игнорируется compiler.

До выполнения этого документа Query Engine нельзя подключать к API controller.

---

## Главный архитектурный принцип

Нельзя использовать один тип одновременно как:

- непроверенный JSON клиента;
- внутренний безопасный AST compiler.

TypeScript существует только во время разработки. Клиент может отправить любое значение, даже если интерфейс запрещает его.

Нужны разные уровни:

```text
unknown
  ↓ parse
ValidatedQueryInput
  ↓ schema and permission checks
AuthorizedQueryAst
  ↓ compile
CompiledQuery
```

Compiler должен принимать только внутренний AST. HTTP body не должен попадать в `MySqlCompiler.compile()` напрямую.

---

## Этап 1. Подключить тестовую инфраструктуру движка

Начинать исправления без тестов опасно: compiler легко создаёт синтаксически правильный, но логически неверный SQL.

### Установить server test dependencies

Рекомендуемый минимальный набор:

```text
vitest
```

Позже для HTTP integration понадобятся:

```text
supertest
@types/supertest
```

Для MySQL integration можно использовать отдельную test database в Docker. Testcontainers добавлять только после того, как базовые unit-тесты работают стабильно.

### Добавить scripts

В `server/package.json` нужны команды:

```text
test
test:watch
test:coverage
```

### Создать структуру тестов

```text
server/src/core/query-engine/
  compiler/
    mysql.compiler.test.ts
  validation/
    query-validator.test.ts
  pipeline/
    context.resolver.test.ts
    pipeline.validator.test.ts
    pipeline.executor.test.ts
  policy/
    query-policy.test.ts
  drivers/
    mysql.driver.integration.test.ts
```

### Какие тесты написать до рефакторинга

Сначала зафиксировать только корректное поведение:

- read с select/where/sort/limit;
- create одной строки;
- create нескольких строк;
- update с where;
- delete с where;
- `_and`, `_or`, `_not`;
- `_in`, `_nin`;
- joins;
- params находятся в правильном порядке;
- pipeline использует результат предыдущего шага;
- transactional pipeline использует один transaction driver.

Опасные сценарии сразу оформлять как тесты ожидаемого отказа, а не как допустимое текущее поведение:

- пустой where для update/delete;
- неизвестный operator;
- вредоносный sort direction;
- вредоносный join type;
- пустой create data;
- unresolved context reference;
- duplicate pipeline step ID.

### Критерий этапа

```bash
cd server
npm test
npx tsc --noEmit --skipLibCheck false
```

Обе команды запускаются одной инструкцией из README и не требуют production-БД.

Рекомендуемый коммит:

```text
test(query-engine): add compiler and pipeline test foundation
```

---

## Этап 2. Описать внешний JSON DSL через Zod

### Какую проблему решает этап

Текущие TypeScript interfaces не проверяют HTTP JSON. Например, клиент может прислать:

```json
{
  "action": "read",
  "table": "users",
  "sort": [
    {
      "field": "id",
      "direction": "DESC, (SELECT SLEEP(10))"
    }
  ]
}
```

TypeScript не остановит такой запрос во время выполнения.

### Создать файлы

```text
server/src/core/query-engine/validation/query.schemas.ts
server/src/core/query-engine/validation/query-validator.ts
server/src/core/query-engine/validation/query-validation.errors.ts
```

### `query.schemas.ts`

Создать Zod discriminated union по `action`:

```text
read
create
update
delete
```

Каждая object schema должна использовать strict policy: неизвестные поля отклоняются, а не проходят незаметно.

### Общие ограничения

Начальные безопасные значения вынести в:

```text
server/src/core/query-engine/config/query-limits.ts
```

Например:

```text
MAX_SELECT_FIELDS = 100
MAX_JOINS = 10
MAX_SORT_FIELDS = 10
MAX_WHERE_DEPTH = 10
MAX_WHERE_CONDITIONS = 100
MAX_IN_VALUES = 500
DEFAULT_READ_LIMIT = 100
MAX_READ_LIMIT = 1000
MAX_CREATE_ROWS = 100
MAX_PIPELINE_STEPS = 50
```

Конкретные числа позже настраиваются нагрузочными тестами. Важно, чтобы ограничение существовало с самого начала.

### Проверка identifiers

На уровне syntax validation identifier должен:

- быть непустой строкой;
- иметь разумную максимальную длину;
- не содержать пустых частей `table..field`;
- разрешать только ожидаемый формат имени;
- отдельно обрабатывать `*`;
- не разрешать SQL expressions в поле identifier.

Не пытаться принимать через identifier:

```text
COUNT(*)
users.id AS userId
IF(...)
```

Для aggregate, alias и expressions должны существовать отдельные типизированные AST nodes.

### Read validation

Проверять:

- `table`;
- `select` не пуст после передачи и не превышает лимит;
- sort direction только `asc | desc`;
- join type только поддерживаемые MySQL значения;
- `limit` — целое число `1..MAX_READ_LIMIT`;
- `offset` — целое неотрицательное число;
- offset без limit либо запрещён, либо получает default limit по явной политике;
- количество joins/sorts ограничено.

### Create validation

Проверять:

- data не является пустым объектом;
- массив data не пуст;
- количество строк ограничено;
- каждая строка имеет хотя бы одно поле;
- все строки batch create имеют одинаковый набор колонок;
- ключи data проходят identifier syntax validation;
- запрещены `undefined`, functions и другие значения, которых не бывает в JSON.

### Update validation

Проверять:

- data не пуст;
- where существует;
- where не пуст;
- все изменяемые поля валидны;
- запрещён неизвестный operator.

### Delete validation

Проверять:

- where существует;
- where не пуст;
- массовое удаление не представляется обычным delete query.

### `query-validator.ts`

Функция получает `unknown`, выполняет parse и возвращает `ValidatedQueryInput`.

Она не должна возвращать исходный объект через type assertion.

Ошибки validation должны быть доменными и позже переводиться в API error codes. Не отправлять пользователю Zod stack или внутреннюю структуру compiler.

### Критерий этапа

- compiler больше не вызывается из непроверенного `unknown`;
- вредоносные direction/type отклоняются до compiler;
- ограничения покрыты unit-тестами;
- неизвестные поля отклоняются;
- глубоко вложенный where не вызывает stack overflow.

Рекомендуемый коммит:

```text
security(query-engine): validate external query dsl at runtime
```

---

## Этап 3. Разделить внешний DSL и внутренний безопасный AST

### Создать структуру

```text
server/src/core/query-engine/dsl/query-input.types.ts
server/src/core/query-engine/ast/query-ast.types.ts
server/src/core/query-engine/planner/query-planner.ts
```

### DSL types

DSL описывает то, что может запросить клиент. Эти типы выводятся из Zod schemas, чтобы schema и TypeScript не расходились.

### AST types

AST описывает уже проверенный запрос, который разрешено компилировать.

Хороший AST не должен хранить опасные свободные строки там, где можно использовать enum или специальный node.

Например:

```text
SortDirection = ASC | DESC
JoinType = LEFT | RIGHT | INNER
ComparisonNode
LogicalNode
ColumnReference
TableReference
LiteralValue
```

### Planner

Planner превращает validated DSL в AST:

- нормализует direction к uppercase;
- применяет default limit;
- превращает null comparisons в правильный node;
- проверяет одинаковые batch columns;
- разрешает aliases;
- создаёт явные nodes вместо строковых SQL fragments.

Compiler должен принимать только `AuthorizedQueryAst`, а не старый `UnifiedQuery`.

### Что делать со старым `query.types.ts`

Не удалять его в начале. Сначала перевести imports на новые типы, затем удалить или оставить только как временный compatibility layer с пометкой deprecated.

### Критерий этапа

Нельзя вызвать production compiler с обычным request body без прохождения validator и planner.

Рекомендуемый коммит:

```text
refactor(query-engine): separate external dsl from internal ast
```

---

## Этап 4. Сделать compiler fail closed

Файл:

```text
server/src/core/query-engine/compiler/mysql.compiler.ts
```

Compiler остаётся последним защитным слоем. Даже если validator/planner содержит ошибку, compiler не должен создавать опасный SQL.

### 4.1. Защита UPDATE и DELETE

Обязательное правило:

```text
нет непустого WHERE → compiler выбрасывает ошибку
```

Нельзя считать TypeScript достаточной гарантией.

Если продукту когда-нибудь понадобится массовая операция, создать отдельный AST node/action:

```text
bulkUpdateAll
bulkDeleteAll
```

Он должен требовать отдельного permission и явного подтверждения. Не использовать `where: {}` как скрытый способ.

### 4.2. Sort и join enums

Compiler должен использовать mapping из enum в заранее известный SQL token:

```text
ASC → ASC
DESC → DESC
LEFT → LEFT
RIGHT → RIGHT
INNER → INNER
```

Никакая внешняя строка не вставляется напрямую.

Убрать `OUTER`: MySQL не поддерживает самостоятельный `OUTER JOIN`.

### 4.3. Identifier escaping

Исправить:

- пустые identifiers запрещены;
- backtick корректно удваивается либо identifier уже приходит проверенным;
- `table.*` компилируется как `` `table`.* ``;
- wildcard разрешён только в ожидаемых позициях;
- alias является отдельным identifier, а не частью строки field;
- запрещены пустые части.

Экранирование identifier не заменяет schema allowlist.

### 4.4. Where

Исправить семантику:

- неизвестный operator → ошибка;
- `_not` с пустым условием → ошибка;
- `_and`/`_or` требуют массив;
- пустые логические массивы имеют явно задокументированную политику;
- `_null`/`_not_null` принимают только ожидаемое значение или становятся отдельными nodes без value;
- `_eq: null` превращается в `IS NULL` либо отклоняется;
- `_neq: null` превращается в `IS NOT NULL` либо отклоняется;
- `_in`/`_nin` ограничены по длине;
- максимальная рекурсивная глубина проверена до compiler;
- params добавляются только для реально добавленных clauses.

`_ilike` в MySQL зависит от collation. Нужно выбрать контракт:

- убрать `_ilike`;
- либо компилировать осознанную case-insensitive операцию с учётом типа/collation;
- либо документировать, что поведение зависит от collation колонки.

### 4.5. Read pagination

- всегда применять default limit;
- limit ограничивать maximum;
- offset без limit не создавать;
- большие offset позднее заменить cursor pagination для крупных таблиц.

### 4.6. Joins

- `on` не может быть пустым;
- число условий ограничено;
- обе стороны являются разрешёнными ColumnReference;
- alias уникален;
- конфликт aliases отклоняется;
- join type берётся только из mapping.

### 4.7. Create

- data/rows/columns не пусты;
- batch rows имеют одинаковые columns;
- порядок columns детерминирован;
- лишние поля не игнорируются;
- отсутствующее поле не превращается молча в null без выбранной политики;
- количество rows ограничено.

### 4.8. Update

- data не пуст;
- where не пуст;
- изменять можно только разрешённые колонки;
- primary key/read-only/generated columns проверяет policy layer.

### 4.9. Необработанные свойства

Сейчас объявлены, но игнорируются:

```text
returning
connection
aggregate action
```

Нужно выбрать:

- реализовать полностью;
- удалить из публичного DSL;
- пометить как отдельный будущий этап, но validator обязан отклонять их до реализации.

Тихо игнорировать заявленную возможность нельзя.

### Критерий этапа

Compiler либо возвращает корректный безопасный SQL, либо выбрасывает доменную compile error. Он никогда не возвращает частично сформированный или опасно широкий mutation SQL.

Рекомендуемый коммит:

```text
security(query-engine): make mysql compiler fail closed
```

---

## Этап 5. Добавить Schema Catalog

### Зачем он нужен

Syntax-valid identifier может ссылаться на запрещённую или несуществующую таблицу.

Например:

```text
Auto_Admin__users.password_hash
Auto_Admin__sessions.token_hash
```

Compiler экранирует имя, но не знает, можно ли его читать.

### Создать

```text
server/src/core/schema-catalog/schema-catalog.types.ts
server/src/core/schema-catalog/mysql-schema-introspector.ts
server/src/core/schema-catalog/schema-catalog.service.ts
server/src/core/schema-catalog/schema-cache.ts
```

### Каталог должен знать

- таблицы;
- тип таблицы/view;
- колонки и MySQL-типы;
- nullable;
- primary key;
- unique/indexes;
- foreign keys;
- generated/read-only columns;
- AUTO_INCREMENT;
- служебная ли таблица Auto Admin.

### Правила

- клиент не передаёт произвольную schema/database;
- таблица должна существовать в активном catalog;
- колонка должна принадлежать выбранной таблице/alias;
- служебные таблицы скрыты от generic CRUD;
- metadata cache имеет controlled invalidation после migration/schema refresh;
- introspection запросы выполняются отдельно от пользовательского DSL.

### Type compatibility

Catalog позволяет проверять:

- number operators только для совместимых типов;
- LIKE только для строковых типов;
- вставляемые значения совместимы с колонкой;
- generated column нельзя менять;
- null разрешён только nullable колонке;
- relationship join опирается на существующие поля.

### Критерий этапа

Нельзя скомпилировать запрос к неизвестной таблице/колонке или generic CRUD к служебной Auto Admin таблице.

Рекомендуемый коммит:

```text
feat(schema): add mysql schema catalog for query validation
```

---

## Этап 6. Добавить Permission Policy

### Создать

```text
server/src/core/query-engine/policy/query-policy.types.ts
server/src/core/query-engine/policy/query-policy.service.ts
server/src/core/query-engine/policy/query-policy.errors.ts
```

### Policy получает

- authenticated user;
- role/rights;
- action;
- table;
- selected columns;
- mutation columns;
- filters/joins;
- schema metadata;
- будущие настройки таблицы Auto Admin.

### Policy проверяет

- видна ли таблица;
- можно ли read/create/update/delete;
- какие колонки можно читать;
- какие колонки можно изменять;
- можно ли join с другой таблицей;
- можно ли фильтровать/сортировать по колонке;
- row-level restrictions;
- разрешён ли bulk operation;
- лимиты конкретной роли.

### Защита от обхода

Нельзя проверять только `select`. Запрещённая колонка может утечь через:

- where;
- sort;
- join;
- aggregate;
- error/timing side channel.

Policy должна проверять все ссылки на таблицы и колонки в AST.

### Результат

Policy возвращает `AuthorizedQueryAst`. Только этот тип принимает compiler.

Рекомендуемый коммит:

```text
security(query-engine): authorize tables columns and operations
```

---

## Этап 7. Укрепить MySQL Driver

Файлы:

```text
server/src/core/query-engine/drivers/driver.types.ts
server/src/core/query-engine/drivers/mysql.driver.ts
```

### 7.1. Ownership

Сейчас `close()` может закрыть глобальный application pool.

Разделить:

- borrowed executor/pool — driver не владеет и не закрывает;
- owned connection — driver освобождает;
- application pool закрывается только lifecycle приложения.

Ownership должен быть явным в constructor/factory.

### 7.2. QueryResult

Не использовать `affectedRows = rows.length` для SELECT.

Разделить:

```text
rows
rowCount
affectedRows
insertId
warnings
```

Generic `T` не валидирует реальные MySQL rows. Внутренние repository/use-case слои при необходимости валидируют результат.

### 7.3. Timeout и cancellation

Driver должен получать execution options:

```text
timeoutMs
abort signal/cancellation
maxRows
```

Query timeout отличается от connect timeout.

### 7.4. Error mapping

Разделить:

- validation/policy error;
- query timeout;
- duplicate key;
- foreign key conflict;
- connection unavailable;
- unknown MySQL error.

Не отправлять raw mysql error клиенту. Сохранять cause для server log.

### 7.5. Observability

Логировать безопасно:

- query operation;
- table ID/name по выбранной политике;
- duration;
- rowCount/affectedRows;
- timeout;
- request ID.

Не логировать:

- params с password/token;
- полный пользовательский JSON без redaction;
- session values;
- sensitive row contents.

Рекомендуемый коммит:

```text
refactor(query-engine): add driver ownership timeouts and result semantics
```

---

## Этап 8. Укрепить Context Resolver

Файл:

```text
server/src/core/query-engine/pipeline/context.resolver.ts
```

### Исправить

1. Убрать `any`.
2. Не возвращать `undefined` для unresolved reference — выбрасывать `PipelineReferenceError`.
3. Запретить path segments:
   - `__proto__`;
   - `prototype`;
   - `constructor`.
4. Читать только own properties через безопасную проверку.
5. Установить maximum path depth.
6. Проверять формат:
   ```text
   $steps.<stepId>.rows.<index>.<field>
   ```
7. Нормализовать или сделать case-sensitive prefix. Сейчас проверка `$steps` case-insensitive, а lookup — case-sensitive.
8. Разрешить literal string, начинающийся с `$steps.`, через явный escape/literal node.
9. Не рекурсировать произвольно в Date/Buffer/class instances.
10. Создавать result object без prototype либо запрещать опасные keys.

### Ссылки на результат

Нужно определить допустимые references:

```text
$steps.createUser.insertId
$steps.findUser.rows.0.id
$steps.updateUser.affectedRows
```

Перед выполнением зависимого запроса resolver проверяет тип значения. Например, ссылка на весь `rows` не должна случайно попадать в `_eq`.

### Критерий этапа

Любая неправильная или отсутствующая ссылка останавливает pipeline до выполнения текущего SQL.

Рекомендуемый коммит:

```text
security(pipeline): validate and safely resolve context references
```

---

## Этап 9. Добавить Pipeline Validator и Planner

### Создать

```text
server/src/core/query-engine/pipeline/pipeline.schemas.ts
server/src/core/query-engine/pipeline/pipeline.validator.ts
server/src/core/query-engine/pipeline/pipeline.planner.ts
server/src/core/query-engine/pipeline/pipeline.errors.ts
```

### Проверять до начала транзакции

- steps не пуст;
- количество steps ограничено;
- каждый ID уникален;
- ID имеет безопасный формат;
- dependsOn существуют;
- нет self-dependency;
- нет циклов;
- context references указывают на объявленные dependencies;
- все query проходят query validator/schema/policy;
- transactional flag boolean;
- pipeline не смешивает несовместимые connections.

### Порядок выполнения

Выбрать и задокументировать одну модель:

1. Steps обязаны уже быть в правильном порядке.
2. Planner делает topological sort.

Для профессионального pipeline лучше topological sort с детерминированным порядком независимых шагов.

### Ошибки и результат

Сейчас `PipelineResult.success` всегда `true`, потому что при ошибке executor выбрасывает exception.

Выбрать контракт:

- либо successful result без `success`, ошибки через exceptions;
- либо result union `success: true | false` с безопасными step errors.

Не обещать поле, которое никогда не бывает `false`.

### Разные типы шагов

Один generic `T` для всех шагов создаёт ложное обещание. Внутри pipeline результаты гетерогенны.

Начальный честный тип:

```text
Record<StepId, QueryResult<unknown>>
```

Более строгую inference можно добавить позже через generic tuple/manifest builder, но не ценой runtime-безопасности.

Рекомендуемый коммит:

```text
feat(pipeline): validate dependencies and plan deterministic execution
```

---

## Этап 10. Укрепить Pipeline Executor

Файл:

```text
server/src/core/query-engine/pipeline/pipeline.executor.ts
```

### Перед выполнением

Executor получает только validated/authorized pipeline plan.

### Transactional mode

Проверить тестами:

- все steps используют один transaction connection;
- ошибка любого шага вызывает rollback;
- context не возвращается как успешный после rollback;
- внешние эффекты не выполняются внутри DB-pipeline;
- timeout/cancellation корректно завершают transaction.

### Non-transactional mode

Частичное выполнение возможно. Это должно быть явно отражено в API:

- какие steps завершены;
- на каком step произошла ошибка;
- можно ли безопасно повторить;
- idempotency policy.

Не возвращать raw SQL error.

### Limits

- maximum execution time pipeline;
- maximum steps;
- maximum total returned rows;
- maximum context size;
- запрет огромного результата одного шага как input следующего `_in`.

### Audit

Для mutation pipeline логировать:

- user ID;
- operation IDs;
- affected tables;
- affected row count;
- success/failure;
- request ID;
- duration.

Не логировать sensitive values.

Рекомендуемый коммит:

```text
security(pipeline): enforce transaction limits cancellation and audit
```

---

## Этап 11. Упростить QueryEngineService contract

Файл:

```text
server/src/core/query-engine/query-engine.service.ts
```

### Текущие проблемы

- одиночный запрос и массив имеют разные скрытые transaction semantics;
- `connection` в query не используется;
- `close()` может закрыть shared pool;
- service принимает ещё не разделённый `UnifiedQuery`;
- `return await` не нужен без локального catch/finally;
- generic result создаёт ложную уверенность без runtime validation.

### Целевые методы

Разделить явно:

```text
executeOne(authorizedQuery, executionOptions)
executeTransaction(authorizedQueries, executionOptions)
executePipeline(validatedPipelinePlan, executionOptions)
ping()
```

Обычный массив не должен неожиданно означать транзакцию только из-за формы аргумента.

Service не закрывает global pool. Lifecycle соединений принадлежит DB infrastructure.

### Connections

Если Auto Admin поддерживает одну подключённую БД, удалить `connection` из DSL до появления настоящего connection registry.

Если будет несколько БД, создать отдельный `ConnectionRegistry`, который:

- проверяет доступ пользователя к connection ID;
- выдаёт нужный driver;
- запрещает одну MySQL transaction через разные connections.

Рекомендуемый коммит:

```text
refactor(query-engine): make execution contracts explicit
```

---

## Этап 12. Добавить Aggregate как отдельный AST

Не компилировать aggregate через произвольную строку select.

### Создать типизированные операции

Например:

```text
count
countDistinct
sum
avg
min
max
groupBy
having
```

Каждая операция содержит ColumnReference и optional alias.

### Проверки

- функция входит в allowlist;
- колонка существует;
- тип колонки совместим;
- колонка разрешена role policy;
- groupBy/having корректны;
- alias валиден;
- result size ограничен.

Только после реализации убрать несоответствие, при котором `aggregate` существует в `QueryAction`, но не входит в `UnifiedQuery`.

Рекомендуемый коммит:

```text
feat(query-engine): add typed aggregate ast and compiler
```

---

## Этап 13. Интеграция с API

Этот этап начинается только после завершения этапов 1–11.

### Создать module boundary

```text
server/src/modules/data-query/
  data-query.routes.ts
  data-query.controller.ts
  data-query.service.ts
  data-query.types.ts
```

Controller не импортирует compiler напрямую.

Поток:

```text
controller
  ↓ request identity
service
  ↓ validator
schema catalog
  ↓ policy
planner
  ↓ compiler
driver
```

### Middleware

- authentication;
- bootstrap status `ready`;
- body size limit;
- route rate limit;
- request ID;
- validation;
- authorization context.

### API response

Использовать общий error/success code contract. Не возвращать:

- SQL;
- params;
- stack;
- MySQL raw error;
- внутренние table paths;
- sensitive columns.

### HTTP actions

Для первого production среза лучше отдельные endpoints/read models, а не один безграничный universal endpoint.

Минимальный порядок:

1. Read only.
2. Create.
3. Update одной записи по primary key.
4. Delete одной записи с подтверждением.
5. Batch mutations.
6. Pipelines.

Не публиковать все возможности одновременно.

Рекомендуемый коммит:

```text
feat(data-query): expose guarded read-only query api
```

---

## Этап 14. Обязательные security tests

### Injection

- вредоносный sort direction;
- вредоносный join type;
- backticks в identifiers;
- SQL expressions вместо fields;
- comments/semicolon/whitespace payloads;
- malicious aliases;
- unknown operators.

### Authorization

- manager не видит запрещённую таблицу;
- manager не читает `password_hash`;
- запрещённая колонка не используется в select/where/sort/join/aggregate;
- служебные Auto Admin таблицы закрыты generic CRUD;
- row-level policy применяется к read/update/delete.

### Destructive operations

- update без where;
- update с пустым where;
- delete без where;
- delete с пустым where;
- логическое условие, которое исчезло после normalization;
- empty update data;
- empty create data;
- слишком большой batch.

### Resource exhaustion

- слишком глубокий where;
- огромный `_in`;
- слишком много joins/sorts/select fields;
- limit выше maximum;
- большой offset;
- слишком много pipeline steps;
- pipeline context больше maximum;
- query timeout;
- cancellation;
- `SLEEP`/тяжёлый запрос блокируется политикой/timeout.

### Pipeline

- duplicate IDs;
- missing dependency;
- dependency declared after step;
- cycle;
- unresolved reference;
- forbidden prototype path;
- reference неправильного типа;
- rollback;
- partial non-transactional execution;
- context reference на слишком большой rows array.

### MySQL integration

Тестировать на настоящем MySQL 8.4:

- syntax generated SQL;
- transactions;
- null semantics;
- joins;
- pagination;
- duplicate/FK errors;
- timeout;
- affected/row counts;
- charset/collation behavior.

---

## Этап 15. Нагрузочные проверки

До публичного релиза измерить:

- compile time на maximum AST;
- validation time;
- schema catalog lookup;
- permission traversal;
- execution time;
- memory context pipeline;
- 10/50/100 параллельных read;
- pool saturation;
- timeout recovery;
- large table pagination.

Лимиты из `query-limits.ts` корректируются по измерениям, а не удаляются.

---

## Рекомендуемый порядок реализации

1. Тестовая инфраструктура.
2. Zod validation внешнего DSL.
3. Разделение DSL и AST.
4. Fail-closed compiler.
5. Schema Catalog.
6. Permission Policy.
7. Driver ownership/timeouts/results.
8. Безопасный Context Resolver.
9. Pipeline Validator/Planner.
10. Pipeline Executor limits/audit.
11. Явный QueryEngineService API.
12. Aggregate AST.
13. Read-only HTTP API.
14. Create/update/delete API по одному.
15. Pipeline API последним.

---

## Рекомендуемая конечная структура

```text
server/src/core/
  query-engine/
    ast/
      query-ast.types.ts
    compiler/
      mysql.compiler.ts
      mysql.compiler.test.ts
    config/
      query-limits.ts
    drivers/
      driver.types.ts
      mysql.driver.ts
    dsl/
      query-input.types.ts
    pipeline/
      context.resolver.ts
      pipeline.errors.ts
      pipeline.executor.ts
      pipeline.planner.ts
      pipeline.schemas.ts
      pipeline.types.ts
      pipeline.validator.ts
    planner/
      query-planner.ts
    policy/
      query-policy.errors.ts
      query-policy.service.ts
      query-policy.types.ts
    validation/
      query-validation.errors.ts
      query-validator.ts
      query.schemas.ts
    index.ts
    query-engine.service.ts

  schema-catalog/
    mysql-schema-introspector.ts
    schema-cache.ts
    schema-catalog.service.ts
    schema-catalog.types.ts
```

Структуру не нужно создавать целиком заранее пустыми файлами. Каждый каталог появляется вместе с рабочим этапом и тестами.

---

## Definition of Done

Query Engine можно считать готовым к production API, когда одновременно выполнено:

- внешний JSON всегда проходит runtime validation;
- compiler не принимает request body напрямую;
- update/delete без непустого where невозможны;
- sort/join/operator SQL tokens берутся только из internal mapping;
- identifiers проверены по schema catalog;
- все таблицы/колонки/операции проверены permission policy;
- служебные таблицы закрыты generic CRUD;
- read всегда имеет maximum limit;
- queries имеют timeout и cancellation;
- driver не закрывает чужой pool;
- pipeline проверяет IDs/dependencies/cycles/references до выполнения;
- unresolved context reference всегда является ошибкой;
- transactional failure делает rollback;
- audit log не содержит sensitive data;
- compiler/security/pipeline/MySQL integration tests проходят;
- production client не получает SQL/raw MySQL errors;
- HTTP API сначала опубликован в read-only режиме;
- нагрузочные лимиты подтверждены измерениями.

Команды финальной проверки:

```bash
cd server
npx tsc --noEmit --skipLibCheck false
npm test
npm run test:coverage
npm audit --omit=dev
```

