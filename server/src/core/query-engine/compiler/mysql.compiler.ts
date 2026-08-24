import type { ComparisonOperator, CreateQuery, FieldCondition, JoinClause, LogicalOperators, ReadQuery, SortClause, UpdateQuery, WhereClause } from "../types/query.types";

export type LogicalKey = keyof LogicalOperators;

export interface CompiledQuery {
    sql: string;
    params: unknown[];
}

export class MySqlCompiler {
    // Экранируем идентификаторы (таблицы, колонки) для MySQL
    static escapeIdentifier(identifier: string): string {
        if (identifier === '*') return '*';

        return identifier.split('.').map((part) => `\`${part.replace(/`/g, '')}\``).join('.');
    }

    // Запрос на чтение
    static compileRead(query: ReadQuery): CompiledQuery {
        let sql = '';
        const params: unknown[] = [];

        const table = MySqlCompiler.escapeIdentifier(query.table);
        let select: string[] | '*' = [];

        if (Array.isArray(query.select) && query.select.length > 0) {
            select = query.select.map((field) => MySqlCompiler.escapeIdentifier(field))
        } else {
            select = '*';
        }

        const selectSql = Array.isArray(select) ? select.join(', ') : select;

        sql += `SELECT ${selectSql} FROM ${table} `;

        if (query.joins) {
            const joinsSql = MySqlCompiler.compileJoins(query.joins);
            if (joinsSql) {
                sql += joinsSql;
            }
        }

        if (query.where) {
            const whereRes = MySqlCompiler.compileWhere(query.where);
            if (whereRes && whereRes.sql) {
                sql += ' WHERE ' + whereRes.sql;
                params.push(...whereRes.params);
            }
        }

        if (query.sort) {
            const sortSql = MySqlCompiler.compileSort(query.sort);
            if (sortSql) {
                sql += ' ' + sortSql;
            }
        }

        if (query.limit !== undefined) {
            sql += ` LIMIT ?`;
            params.push(query.limit);
        }

        if (query.offset !== undefined) {
            sql += ` OFFSET ?`;
            params.push(query.offset);
        }

        return {
            sql,
            params,
        }
    }

    // Условия
    static compileWhere(where?: WhereClause): CompiledQuery {
        if (!where || Object.keys(where).length === 0) {
            return {
                sql: '',
                params: [],
            }
        }

        const comparisonOperators: Record<ComparisonOperator, string> = {
            '_eq': '=',
            '_neq': '!=',
            '_gt': '>',
            '_gte': '>=',
            '_lt': '<',
            '_lte': '<=',
            '_in': 'IN',
            '_nin': 'NOT IN',
            '_like': 'LIKE',
            '_ilike': 'LIKE',
            '_null': 'IS NULL',
            '_not_null': 'IS NOT NULL',
        }

        const clauses: string[] = [];  // сюда складываем готовые куски условий: ["`status` = ?", "`age` >= ?"]
        const params: unknown[] = [];  // сюда по порядку складываем их значения: ["active", 18]

        const whereEntries = Object.entries(where);
        for (const [entryKey, entryValue] of whereEntries) {
            if (MySqlCompiler.isLogicalOperator(entryKey)) {
                if (entryKey === '_and') {
                    const items = entryValue as WhereClause[];
                    const compiledSubQueries = items.map(item => MySqlCompiler.compileWhere(item));
                    const compiledConditions = compiledSubQueries.map(subQuery => subQuery.sql).filter(sql => sql.length > 0);
                    if (compiledConditions.length === 0) continue;
                    // compiledConditions — это массив строк ["`age` >= ?", "`status` = ?"]
                    clauses.push(`(${compiledConditions.join(' AND ')})`);
                    params.push(...compiledSubQueries.flatMap(subQuery => subQuery.params));
                }
                else if (entryKey === '_or') {
                    const items = entryValue as WhereClause[];
                    const compiledSubQueries = items.map(item => MySqlCompiler.compileWhere(item));
                    const compiledConditions = compiledSubQueries.map(subQuery => subQuery.sql).filter(sql => sql.length > 0);
                    if (compiledConditions.length === 0) continue;
                    clauses.push(`(${compiledConditions.join(' OR ')})`);
                    params.push(...compiledSubQueries.flatMap(subQuery => subQuery.params));
                }
                else if (entryKey === '_not') {
                    const items = entryValue as WhereClause;
                    const compiledSubQueries = MySqlCompiler.compileWhere(items);
                    clauses.push(`NOT (${compiledSubQueries.sql})`);
                    params.push(...compiledSubQueries.params);
                }
            } else {
                const field = MySqlCompiler.escapeIdentifier(entryKey);
                for (const [op, val] of Object.entries(entryValue as FieldCondition)) {
                    if (op === '_in') {
                        // Валидация: val должен быть массивом
                        if (!Array.isArray(val)) {
                            throw new Error(`Оператор ${op} требует массив значений`);
                        }
                        // Проверяем, что массив не пустой
                        if (val.length === 0) {
                            clauses.push('0 = 1'); // или всегда false, или как-то иначе обработать
                            continue;
                        }
                        // Создаем ? для каждого элемента массива
                        const placeholders = Array(val.length).fill('?').join(', ');
                        clauses.push(`${field} IN (${placeholders})`);
                        params.push(...val); // добавляем все значения из массива
                    } else if (op === '_nin') {
                        // Валидация: val должен быть массивом
                        if (!Array.isArray(val)) {
                            throw new Error(`Оператор ${op} требует массив значений`);
                        }
                        // Проверяем, что массив не пустой
                        if (val.length === 0) {
                            clauses.push('1 = 1'); // NOT IN [] обычно означает все строки
                            continue;
                        }
                        // Создаем ? для каждого элемента массива
                        const placeholders = Array(val.length).fill('?').join(', ');
                        clauses.push(`${field} NOT IN (${placeholders})`);
                        params.push(...val); // добавляем все значения из массива
                    } else if (op === '_null') {
                        clauses.push(`${field} IS NULL`);
                    } else if (op === '_not_null') {
                        clauses.push(`${field} IS NOT NULL`);
                    } else {
                        // Все остальные операторы: = != > >= < <= LIKE ILIKE
                        clauses.push(`${field} ${comparisonOperators[op as ComparisonOperator]} ?`);
                        params.push(val);
                    }
                }
            }
        }

        return {
            sql: clauses.length > 0 ? clauses.join(' AND ') : '',
            params,
        }
    }

    // Проверка является ли ключ логическим оператором
    static isLogicalOperator(key: string): key is LogicalKey {
        return key === '_and' || key === '_or' || key === '_not';
    }

    // Сортировка
    static compileSort(sort?: SortClause[]): string {
        if (!sort || sort.length === 0) {
            return '';
        }
        let sql = 'ORDER BY ';

        for (let i = 0; i <= sort.length - 1; i++) {
            const field = MySqlCompiler.escapeIdentifier(sort[i].field);
            const direction = sort[i].direction.toUpperCase() as 'ASC' | 'DESC';

            sql += `${field} ${direction}`;
            if (i !== sort.length - 1) {
                sql += ', ';
            }
        }

        return sql;
    }

    // Соединения
    static compileJoins(joins?: JoinClause[]): string {
        if (!joins || joins.length === 0) {
            return '';
        }

        let sql = '';

        for (let i = 0; i <= joins.length - 1; i++) {
            const join = joins[i];
            const table = MySqlCompiler.escapeIdentifier(join.table);
            const joinType = (join.type || 'LEFT').toUpperCase();
            const aliasSql = join.alias ? ` AS ${MySqlCompiler.escapeIdentifier(join.alias)}` : '';
            const onConditions = Object.entries(join.on).map(([leftCol, rightCol]) => {
                return `${MySqlCompiler.escapeIdentifier(leftCol)} = ${MySqlCompiler.escapeIdentifier(rightCol)}`;
            }).join(' AND ');

            sql += ` ${joinType} JOIN ${table}${aliasSql} ON ${onConditions}`;
        }

        return sql;
    }

    // Создание
    static compileCreate(query: CreateQuery): CompiledQuery {
        const table = MySqlCompiler.escapeIdentifier(query.table);
        let sql = `INSERT INTO ${table}`;
        const params: unknown[] = [];
        const rows = Array.isArray(query.data) ? query.data : [query.data];

        const columns = Object.keys(rows[0]);
        const escapedColumns = columns.map((key) => MySqlCompiler.escapeIdentifier(key)).join(', ');
        sql += ` (${escapedColumns}) VALUES `;

        for (const row of rows) {
            for (const col of columns) {
                params.push(row[col] !== undefined ? row[col] : null);
            }
        }

        const rowPlaceholder = `(${Array(columns.length).fill('?').join(', ')})`;
        const placeholders = Array(rows.length).fill(rowPlaceholder).join(', ');
        sql += placeholders;

        return {
            sql,
            params
        };
    }

    // Обновление
    static compileUpdate(query: UpdateQuery): CompiledQuery {
        let sql = '';
        const params: unknown[] = [];
        const table = MySqlCompiler.escapeIdentifier(query.table);
        sql += `UPDATE ${table} SET `

        const setColumns = Object.entries(query.data).map(([key, value]) => {
            params.push(value)
            return `${MySqlCompiler.escapeIdentifier(key)} = ?`
        }).join(', ');

        sql += setColumns;

        const whereResult = MySqlCompiler.compileWhere(query.where);
        if (whereResult.sql) {
            sql += ` WHERE ${whereResult.sql}`;
            params.push(...whereResult.params);
        }

        return { sql, params };
    }
}

// // test  ./node_modules/.bin/tsx src/core/query-engine/compiler/mysql.compiler.ts
// const result = MySqlCompiler.compileRead({
//     action: 'read',
//     table: 'orders',
//     select: ['orders.id', 'orders.total_price', 'users.email'],
//     joins: [
//         {
//             table: 'users',
//             alias: 'u',
//             type: 'INNER',
//             on: { 'orders.user_id': 'u.id' }
//         }
//     ],
//     where: {
//         _and: [
//             { 'orders.total_price': { _gte: 1000 } },
//             {
//                 _or: [
//                     { 'orders.status': { _in: ['paid', 'delivered'] } },
//                     { 'u.is_vip': { _eq: true } }
//                 ]
//             }
//         ]
//     },
//     sort: [{ field: 'orders.created_at', direction: 'desc' }],
//     limit: 20,
//     offset: 0
// });

// console.log(result.sql, '\n', result.params);