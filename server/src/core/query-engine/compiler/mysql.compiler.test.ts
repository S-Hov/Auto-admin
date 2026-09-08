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

        it('должен корректно обрабатывать операторы списков', () => {
            const query: ReadQuery = {
                action: 'read',
                table: 'users',
                where: {
                    id: { _in: [1, 2, 3] },
                },
            };

            const result = MySqlCompiler.compile(query);

            expect(result.sql.trim()).toBe('SELECT * FROM `users`  WHERE `id` IN (?, ?, ?)');
            expect(result.params).toEqual([1, 2, 3]);
        });

        it('должен корректно обрабатывать операторы NOT IN', () => {
            const query: ReadQuery = {
                action: 'read',
                table: 'users',
                where: {
                    id: { _nin: [1, 2, 3] },
                },
            };

            const result = MySqlCompiler.compile(query);

            expect(result.sql.trim()).toBe('SELECT * FROM `users`  WHERE `id` IN (?, ?, ?)');
            expect(result.params).toEqual([1, 2, 3]);
        });

        it('должен корректно обрабатывать операторы BETWEEN', () => {
            const query: ReadQuery = {
                action: 'read',
                table: 'users',
                where: {
                    age: { _between: [20, 30] },
                },
            };

            const result = MySqlCompiler.compile(query);

            expect(result.sql.trim()).toBe('SELECT * FROM `users`  WHERE `age` BETWEEN ? AND ?');
            expect(result.params).toEqual([20, 30]);
        });

        it('должен корректно обрабатывать логический оператор OR и добавлять значения в params', () => {
            const query: ReadQuery = {
                action: 'read',
                table: 'users',
                where: {
                    _or: [
                        { age: { _eq: 20 } },
                        { age: { _eq: 30 } },
                    ],
                },
            };

            const result = MySqlCompiler.compile(query);

            expect(result.sql.trim()).toBe('SELECT * FROM `users`  WHERE `age` = ? OR `age` = ?');
            expect(result.params).toEqual([20, 30]);
        });

        it('должен корректно обрабатывать логический оператор AND и добавлять значения в params', () => {
            const query: ReadQuery = {
                action: 'read',
                table: 'users',
                where: {
                    _and: [
                        { age: { _gte: 20 } },
                        { age: { _lte: 30 } },
                    ],
                },
            };

            const result = MySqlCompiler.compile(query);

            expect(result.sql.trim()).toBe('SELECT * FROM `users`  WHERE `age` >= ? AND `age` <= ?');
            expect(result.params).toEqual([20, 30]);
        });

        it('должен корректно обрабатывать логический оператор NOT и добавлять значения в params', () => {
            const query: ReadQuery = {
                action: 'read',
                table: 'users',
                where: {
                    _not: {
                        _and: [
                            { age: { _gte: 20 } },
                            { age: { _lte: 30 } },
                        ],
                    },
                },
            };

            const result = MySqlCompiler.compile(query);

            expect(result.sql.trim()).toBe('SELECT * FROM `users`  WHERE NOT (`age` >= ? AND `age` <= ?)');
            expect(result.params).toEqual([20, 30]);
        });

        it('должен корректно обрабатывать вложенные логические операторы', () => {
            const query: ReadQuery = {
                action: 'read',
                table: 'users',
                where: {
                    _and: [
                        { age: { _gte: 20 } },
                        {
                            _or: [
                                { name: { _eq: 'John' } },
                                { name: { _eq: 'Jane' } },
                            ],
                        },
                    ],
                },
            };

            const result = MySqlCompiler.compile(query);

            expect(result.sql.trim()).toBe('SELECT * FROM `users`  WHERE (`age` >= ?) AND (`name` = ? OR `name` = ?)');
            expect(result.params).toEqual([20, 'John', 'Jane']);
        });

        it('должен корректно обрабатывать условие null)', () => {
            const query: ReadQuery = {
                action: 'read',
                table: 'users',
                where: {
                    age: { _null: true },
                },
            };

            const result = MySqlCompiler.compile(query);

            expect(result.sql.trim()).toBe('SELECT * FROM `users`  WHERE `age` IS NULL');
            expect(result.params).toEqual([]);
        });

        it('должен корректно обрабатывать условие not null)', () => {
            const query: ReadQuery = {
                action: 'read',
                table: 'users',
                where: {
                    age: { _not_null: true },
                },
            };

            const result = MySqlCompiler.compile(query);

            expect(result.sql.trim()).toBe('SELECT * FROM `users`  WHERE `age` IS NOT NULL');
            expect(result.params).toEqual([]);
        });

        it('должен корректно обрабатывать соединение LEFT JOIN и добавлять значения в params', () => {
            const query: ReadQuery = {
                action: 'read',
                table: 'users',
                joins: [
                    {
                        table: 'posts',
                        on: {
                            id: 'users.id',
                        },
                    },
                ],
            };

            const result = MySqlCompiler.compile(query);

            expect(result.sql.trim()).toBe('SELECT * FROM `users` LEFT JOIN `posts` ON `users`.`id` = `posts`.`id`');
            expect(result.params).toEqual([]);
        });

        it('должен корректно обрабатывать соединение RIGHT JOIN и добавлять значения в params', () => {
            const query: ReadQuery = {
                action: 'read',
                table: 'users',
                joins: [
                    {
                        table: 'posts',
                        type: 'RIGHT',
                        on: {
                            id: 'users.id',
                        },
                    },
                ],
            };

            const result = MySqlCompiler.compile(query);

            expect(result.sql.trim()).toBe('SELECT * FROM `users` RIGHT JOIN `posts` ON `users`.`id` = `posts`.`id`');
            expect(result.params).toEqual([]);
        });

        it('должен корректно обрабатывать соединение INNER JOIN и добавлять значения в params', () => {
            const query: ReadQuery = {
                action: 'read',
                table: 'users',
                joins: [
                    {
                        table: 'posts',
                        type: 'INNER',
                        on: {
                            id: 'users.id',
                        },
                    },
                ],
            };

            const result = MySqlCompiler.compile(query);

            expect(result.sql.trim()).toBe('SELECT * FROM `users` INNER JOIN `posts` ON `users`.`id` = `posts`.`id`');
            expect(result.params).toEqual([]);
        });

        it('должен корректно обрабатывать соединение LEFT JOIN с выводом определенных полей и добавлять значения в params', () => {
            const query: ReadQuery = {
                action: 'read',
                table: 'users',
                select: ['id', 'name'],
                joins: [
                    {
                        table: 'posts',
                        type: 'LEFT',
                        on: {
                            id: 'users.id',
                        },
                    },
                ],
                where: {
                    id: { _eq: 1 },
                },
            };

            const result = MySqlCompiler.compile(query);

            expect(result.sql.trim()).toBe('SELECT `users`.`id`, `users`.`name` FROM `users` LEFT JOIN `posts` ON `users`.`id` = `posts`.`id` WHERE `users`.`id` = ?');
            expect(result.params).toEqual([1]);
        });

        it('должен корректно обрабатывать соединение LEFT JOIN с несколькими таблицами', () => {
            const query: ReadQuery = {
                action: 'read',
                table: 'users',
                select: ['id', 'name'],
                joins: [
                    {
                        table: 'posts',
                        type: 'LEFT',
                        on: {
                            id: 'users.id',
                        },
                    },
                    {
                        table: 'comments',
                        type: 'LEFT',
                        on: {
                            id: 'posts.id',
                        },
                    },
                ],
                where: {
                    id: { _eq: 1 },
                },
            };

            const result = MySqlCompiler.compile(query);

            expect(result.sql.trim()).toBe('SELECT `users`.`id`, `users`.`name` FROM `users` LEFT JOIN `posts` ON `users`.`id` = `posts`.`id` LEFT JOIN `comments` ON `posts`.`id` = `comments`.`id` WHERE `users`.`id` = ?');
            expect(result.params).toEqual([1]);
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