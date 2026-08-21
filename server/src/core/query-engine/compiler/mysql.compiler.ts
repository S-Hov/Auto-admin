import { ReadQuery } from "../types/query.types";

// todo
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

    static compileRead(query: ReadQuery): CompiledQuery {
        let sql = '';
        const table = MySqlCompiler.escapeIdentifier(query.table);
        let select: string[] | '*' = [];

        if (Array.isArray(query.select) && query.select.length > 0) {
            select = query.select.map((field) => MySqlCompiler.escapeIdentifier(field))
        } else {
            select = '*';
        }

        const selectSql = Array.isArray(select) ? select.join(', ') : select;

        sql += `SELECT ${selectSql} FROM ${table}`;

        // чтобы компилятор не ругался, что параметров нет, вернем пустой массив
        return {
            sql,
            params: [],
        }
    }
}