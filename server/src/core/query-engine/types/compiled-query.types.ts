export interface CompiledQuery {
    resultType: 'rows' | 'command'
    sql: string;
    params: unknown[];
}
