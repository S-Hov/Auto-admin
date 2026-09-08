import { describe, it, expect } from 'vitest';
import { ContextResolver } from './context.resolver';
import type { PipelineExecutionContext } from './pipeline.types';
import type { ReadQuery } from '../types/query.types';

describe('ContextResolver', () => {
    it('должен возвращать примитивные значения без изменений', () => {
        const context: PipelineExecutionContext = { steps: {} };

        expect(ContextResolver.resolveValue(123, context)).toBe(123);
        expect(ContextResolver.resolveValue('обычная строка', context)).toBe('обычная строка');
        expect(ContextResolver.resolveValue(true, context)).toBe(true);
    });

    it('должен разрешать ссылку на insertId из контекста шагов', () => {
        const context: PipelineExecutionContext = {
            steps: {
                createUser: {
                    rows: [],
                    affectedRows: 1,
                    insertId: 105,
                },
            },
        };

        const result = ContextResolver.resolveValue('$steps.createUser.insertId', context);
        expect(result).toBe(105);
    });

    it('должен разрешать ссылки внутри вложенного объекта данных', () => {
        const context: PipelineExecutionContext = {
            steps: {
                createUser: {
                    rows: [],
                    affectedRows: 1,
                    insertId: 77,
                },
            },
        };

        const data = {
            authorId: '$steps.createUser.insertId',
            title: 'Первый пост',
            tags: ['mysql', 'vitest'],
        };

        const resolved = ContextResolver.resolveValue(data, context);
        expect(resolved).toEqual({
            authorId: 77,
            title: 'Первый пост',
            tags: ['mysql', 'vitest'],
        });
    });

    it('должен разрешать ссылки в условиях WHERE через resolveQuery', () => {
        const context: PipelineExecutionContext = {
            steps: {
                getProfile: {
                    rows: [{ accountId: 999 }],
                    affectedRows: 0,
                },
            },
        };

        const query: ReadQuery = {
            action: 'read',
            table: 'orders',
            where: {
                userId: { _eq: '$steps.getProfile.rows.0.accountId' },
            },
        };

        const resolvedQuery = ContextResolver.resolveQuery(query, context);

        expect(resolvedQuery.where).toEqual({
            userId: { _eq: 999 },
        });
    });
});
