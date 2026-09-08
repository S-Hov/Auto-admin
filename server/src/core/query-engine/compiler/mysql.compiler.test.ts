import { describe, it, expect } from 'vitest';
import { MySqlCompiler } from './mysql.compiler';
import type { ReadQuery, CreateQuery, UpdateQuery, DeleteQuery } from '../types/query.types';

describe('MySqlCompiler', () => {

    describe('compileRead', () => {
        it('должен скомпилировать простой запрос SELECT * без условий', () => {
            const query: ReadQuery = {
                action: 'read',
                table: 'users',
            };

            const result = MySqlCompiler.compile(query);

            expect(result.sql.trim()).toBe('SELECT * FROM `users`');
            expect(result.params).toEqual([]);
        });

        it('должен экранировать выбранные поля', () => {
            const query: ReadQuery = {
                action: 'read',
                table: 'users',
                select: ['id', 'username'],
            };

            const result = MySqlCompiler.compile(query);

            expect(result.sql.trim()).toBe('SELECT `id`, `username` FROM `users`');
            expect(result.params).toEqual([]);
        });

        it('должен генерировать WHERE с плейсхолдером и класть значение в params', () => {
            const query: ReadQuery = {
                action: 'read',
                table: 'users',
                where: {
                    status: { _eq: 'active' },
                },
            };

            const result = MySqlCompiler.compile(query);

            expect(result.sql.trim()).toBe('SELECT * FROM `users`  WHERE `status` = ?');
            expect(result.params).toEqual(['active']);
        });

        it('должен добавлять LIMIT и OFFSET и передавать их в params', () => {
            const query: ReadQuery = {
                action: 'read',
                table: 'users',
                limit: 10,
                offset: 20,
            };

            const result = MySqlCompiler.compile(query);

            expect(result.sql.trim()).toContain('LIMIT ? OFFSET ?');
            expect(result.params).toEqual([10, 20]);
        });
    });

    describe('compileCreate', () => {
        it('должен компилировать INSERT INTO для одной строки', () => {
            const query: CreateQuery = {
                action: 'create',
                table: 'users',
                data: {
                    username: 'john_doe',
                    age: 25,
                },
            };

            const result = MySqlCompiler.compile(query);

            expect(result.sql.trim()).toBe('INSERT INTO `users` (`username`, `age`) VALUES (?, ?)');
            expect(result.params).toEqual(['john_doe', 25]);
        });
    });

    describe('compileUpdate', () => {
        it('должен компилировать UPDATE для одной строки', () => {
            const query: UpdateQuery = {
                action: 'update',
                table: 'users',
                data: {
                    name: 'John Doe',
                    age: 26,
                    sex: 'male',
                },
                where: {
                    id: { _eq: 1 },
                },
            };

            const result = MySqlCompiler.compile(query);

            expect(result.sql.trim()).toBe('UPDATE `users` SET `name` = ?, `age` = ?, `sex` = ? WHERE `id` = ?');
            expect(result.params).toEqual(['John Doe', 26, 'male', 1]);
        });
    });

    describe('compileDelete', () => {
        it('должен компилировать DELETE для одной строки', () => {
            const query: DeleteQuery = {
                action: 'delete',
                table: 'users',
                where: {
                    id: { _eq: 1 },
                },
            };

            const result = MySqlCompiler.compile(query);

            expect(result.sql.trim()).toBe('DELETE FROM `users` WHERE `id` = ?');
            expect(result.params).toEqual([1]);
        });
    });

    describe('Ошибки компилятора', () => {
        it('должен выбрасывать ошибку при неизвестном action', () => {
            const invalidQuery = { action: 'unknown_action', table: 'users' } as any;

            expect(() => MySqlCompiler.compile(invalidQuery)).toThrow('Unsupported action');
        });
    });
});