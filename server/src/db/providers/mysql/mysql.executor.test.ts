import { describe, it, expect, vi } from 'vitest';
import { MySqlDatabaseExecutor } from './mysql.executor';
import type { MySqlDbExecutor } from './mysql.types';
import { envConfig } from '../../../config/env';

describe('MySqlDatabaseExecutor', () => {
    const createFakeExecutor = () => ({
        query: vi.fn(),
    } as unknown as MySqlDbExecutor & { query: ReturnType<typeof vi.fn> });

    describe('queryRows', () => {
        it('queryRows() возвращает строки', async () => {
            const fake = createFakeExecutor();
            const executor = new MySqlDatabaseExecutor(fake);
            const mockRows = [
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' },
            ];
            fake.query.mockResolvedValueOnce([mockRows, []]);

            const rows = await executor.queryRows('SELECT * FROM users');

            expect(rows).toEqual(mockRows);
        });

        it('передаёт SQL, timeout и параметры', async () => {
            const fake = createFakeExecutor();
            const executor = new MySqlDatabaseExecutor(fake);
            fake.query.mockResolvedValueOnce([[{ id: 1 }], []]);

            await executor.queryRows('SELECT * FROM users WHERE id = ?', [42]);

            expect(fake.query).toHaveBeenCalledWith({
                sql: 'SELECT * FROM users WHERE id = ?',
                timeout: envConfig.Auto_Admin__DB_QUERY_TIMEOUT_MS,
                values: [42],
            });
        });

        it('не изменяет исходный readonly-массив параметров', async () => {
            const fake = createFakeExecutor();
            const executor = new MySqlDatabaseExecutor(fake);
            fake.query.mockResolvedValueOnce([[], []]);

            const originalParams = Object.freeze([1, 'readonly', true]) as readonly unknown[];
            await executor.queryRows('SELECT * FROM test WHERE a = ? AND b = ? AND c = ?', originalParams);

            expect(originalParams).toEqual([1, 'readonly', true]);
            expect(Object.isFrozen(originalParams)).toBe(true);
        });

        it('выбрасывает ошибку, если MySQL вернул command result', async () => {
            const fake = createFakeExecutor();
            const executor = new MySqlDatabaseExecutor(fake);
            fake.query.mockResolvedValueOnce([{ affectedRows: 1, insertId: 0 }, []]);

            await expect(executor.queryRows('DELETE FROM users WHERE id = 1')).rejects.toThrow(
                'Invalid query result'
            );
        });
    });

    describe('execute', () => {
        it('execute() возвращает affectedRows и insertId', async () => {
            const fake = createFakeExecutor();
            const executor = new MySqlDatabaseExecutor(fake);
            fake.query.mockResolvedValueOnce([{ affectedRows: 3, insertId: 123 }, []]);

            const result = await executor.execute('INSERT INTO users (name) VALUES (?)', ['Alice']);

            expect(result).toEqual({
                affectedRows: 3,
                insertId: 123,
            });
            expect(fake.query).toHaveBeenCalledWith({
                sql: 'INSERT INTO users (name) VALUES (?)',
                timeout: envConfig.Auto_Admin__DB_QUERY_TIMEOUT_MS,
                values: ['Alice'],
            });
        });

        it('insertId: 0 преобразуется в null', async () => {
            const fake = createFakeExecutor();
            const executor = new MySqlDatabaseExecutor(fake);
            fake.query.mockResolvedValueOnce([{ affectedRows: 1, insertId: 0 }, []]);

            const result = await executor.execute('UPDATE users SET name = ? WHERE id = ?', ['Bob', 1]);

            expect(result).toEqual({
                affectedRows: 1,
                insertId: null,
            });
        });

        it('execute() отвергает массив строк', async () => {
            const fake = createFakeExecutor();
            const executor = new MySqlDatabaseExecutor(fake);
            fake.query.mockResolvedValueOnce([[{ id: 1 }], []]);

            await expect(executor.execute('SELECT * FROM users')).rejects.toThrow(
                'Invalid query result'
            );
        });

        it('не изменяет исходный readonly-массив параметров при execute()', async () => {
            const fake = createFakeExecutor();
            const executor = new MySqlDatabaseExecutor(fake);
            fake.query.mockResolvedValueOnce([{ affectedRows: 1, insertId: 0 }, []]);

            const originalParams = Object.freeze(['val1', 123]) as readonly unknown[];
            await executor.execute('UPDATE t SET x = ? WHERE y = ?', originalParams);

            expect(originalParams).toEqual(['val1', 123]);
            expect(Object.isFrozen(originalParams)).toBe(true);
        });
    });
});
