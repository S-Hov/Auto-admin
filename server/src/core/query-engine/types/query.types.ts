// Возможные действия
export type QueryAction = 'read' | 'create' | 'update' | 'delete' | 'aggregate';

// Общие части (фильтры, сортировка и т.д.)
export type ComparisonOperator =
    | '_eq'           // =
    | '_neq'          // !=
    | '_gt'           // >
    | '_gte'          // >=
    | '_lt'           // <
    | '_lte'          // <=
    | '_in'           // IN (...)
    | '_nin'          // NOT IN (...)
    | '_like'         // LIKE %...%
    | '_ilike'        // ILIKE (регистронезависимый)
    | '_null'         // IS NULL
    | '_not_null';    // IS NOT NULL

// Условие для одного поля (может содержать несколько операторов сразу, например > 10 И < 100)
export type FieldCondition = {
    [op in ComparisonOperator]?: unknown;
};

// Логические операторы 
export type LogicalOperators = {
    _and?: WhereClause[];
    _or?: WhereClause[];
    _not?: WhereClause;
};

// Условия для одного поля или логические операторы (рекурсия)
export type WhereClause = LogicalOperators & {
    [field: string]: FieldCondition | WhereClause[] | WhereClause | unknown;
};

// Сортировка: массив объектов с полем и направлением
export type SortClause = {
    field: string;
    direction: 'asc' | 'desc' | 'ASC' | 'DESC';
};

// Операции JOIN
export type JoinAction = 'LEFT' | 'RIGHT' | 'INNER' | 'OUTER';

// Структура JOIN
export type JoinClause = {
    table: string;
    alias?: string; // как мы будем называть эту таблицу в результатах
    type?: JoinAction;
    on: Record<string, string>; // условие соединения (объект, где ключ — поле таблицы, а значение — оператор сравнения)
};

// Объект запроса
export interface ReadQuery {
    action: Extract<QueryAction, 'read'>;
    table: string;
    select?: string[];  // список колонок, если не передан — *
    where?: WhereClause;
    joins?: JoinClause[];
    sort?: SortClause[];
    limit?: number;
    offset?: number;
    connection?: string;    //ID подключения - опционально
}

// Запрос на создание
export interface CreateQuery {
    action: Extract<QueryAction, 'create'>;
    table: string;
    data: Record<string, unknown> | Record<string, unknown>[];  // создание одной записи или пачки
    returning?: string[];   // какие поля вернуть
    connection?: string;    // ID подключения - опционально
}

// Запрос на изменение
export interface UpdateQuery {
    action: Extract<QueryAction, 'update'>;
    table: string;
    data: Record<string, unknown>;  // поля для изменения
    where: WhereClause;    // условия обновления, обязательное поле
    returning?: string[];   // какие поля вернуть
    connection?: string;    // ID подключения - опционально
}

// Запрос на удаление
export interface DeleteQuery {
    action: Extract<QueryAction, 'delete'>;
    table: string;
    where: WhereClause;    // условия удаления, обязательное поле
    returning?: string[];   // какие поля вернуть
    connection?: string;    // ID подключения - опционально
}

// Универсальный тип запроса
export type UnifiedQuery = ReadQuery | CreateQuery | UpdateQuery | DeleteQuery;