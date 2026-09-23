import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import mysql, { type Pool } from 'mysql2/promise';
import { MySqlDatabaseProvider } from './mysql.provider';

describe('MySqlDatabaseProvider', () => {
    let provider: MySqlDatabaseProvider;
    let fakeConnection: {
        query: ReturnType<typeof vi.fn>;
        beginTransaction: ReturnType<typeof vi.fn>;
        commit: ReturnType<typeof vi.fn>;
        rollback: ReturnType<typeof vi.fn>;
        release: ReturnType<typeof vi.fn>;
    };
    let fakePool: {
        query: ReturnType<typeof vi.fn>;
        getConnection: ReturnType<typeof vi.fn>;
        end: ReturnType<typeof vi.fn>;
    };
    let createPoolSpy: ReturnType<typeof vi.spyOn>;

    const originalEnv = { ...process.env };

    beforeEach(() => {
        process.env.Auto_Admin__DB_HOST = '127.0.0.1';
        process.env.Auto_Admin__DB_PORT = '3306';
        process.env.Auto_Admin__DB_USERNAME = 'test_user';
        process.env.Auto_Admin__DB_PASSWORD = 'test_password';
        process.env.Auto_Admin__DB_DATABASE = 'test_db';

        fakeConnection = {
            query: vi.fn(),
            beginTransaction: vi.fn().mockResolvedValue(undefined),
            commit: vi.fn().mockResolvedValue(undefined),
            rollback: vi.fn().mockResolvedValue(undefined),
            release: vi.fn(),
        };

        fakePool = {
            query: vi.fn(),
            getConnection: vi.fn().mockResolvedValue(fakeConnection),
            end: vi.fn().mockResolvedValue(undefined),
        };

        createPoolSpy = vi.spyOn(mysql, 'createPool').mockReturnValue(fakePool as unknown as Pool);
        provider = new MySqlDatabaseProvider();
    });

    afterEach(async () => {
        await provider.close();
        createPoolSpy.mockRestore();
        process.env = { ...originalEnv };
    });

    it('обычные запросы делегируются executor', async () => {
        // queryRows
        const mockRows = [{ id: 1, name: 'Alice' }];
        fakePool.query.mockResolvedValueOnce([mockRows, []]);

        const rows = await provider.queryRows('SELECT * FROM users WHERE id = ?', [1]);
        expect(rows).toEqual(mockRows);
        expect(fakePool.query).toHaveBeenCalledWith({
            sql: 'SELECT * FROM users WHERE id = ?',
            timeout: expect.any(Number),
            values: [1],
        });

        // execute
        fakePool.query.mockResolvedValueOnce([{ affectedRows: 2, insertId: 99 }, []]);

        const execResult = await provider.execute('UPDATE users SET name = ?', ['Bob']);
        expect(execResult).toEqual({
            affectedRows: 2,
            insertId: 99,
        });
        expect(fakePool.query).toHaveBeenCalledWith({
            sql: 'UPDATE users SET name = ?',
            timeout: expect.any(Number),
            values: ['Bob'],
        });
    });

    it('транзакция получает соединение из pool', async () => {
        await provider.transaction(async () => 'done');

        expect(fakePool.getConnection).toHaveBeenCalledTimes(1);
    });

    it('release() вызывается после успеха', async () => {
        const result = await provider.transaction(async () => 'success_result');

        expect(result).toBe('success_result');
        expect(fakeConnection.release).toHaveBeenCalledTimes(1);
    });

    it('release() вызывается после ошибки callback', async () => {
        const cbError = new Error('Callback failed');

        await expect(
            provider.transaction(async () => {
                throw cbError;
            })
        ).rejects.toThrow(cbError);

        expect(fakeConnection.release).toHaveBeenCalledTimes(1);
    });

    it('release() вызывается после ошибки rollback', async () => {
        fakeConnection.rollback.mockRejectedValueOnce(new Error('Rollback failed'));

        await expect(
            provider.transaction(async () => {
                throw new Error('Callback failed');
            })
        ).rejects.toThrow(AggregateError);

        expect(fakeConnection.release).toHaveBeenCalledTimes(1);
    });

    it('повторный getPool() возвращает тот же pool', () => {
        const pool1 = provider.getPool();
        const pool2 = provider.getPool();

        expect(pool1).toBe(pool2);
        expect(createPoolSpy).toHaveBeenCalledTimes(1);
    });

    it('close() закрывает pool', async () => {
        provider.getPool();

        await provider.close();

        expect(fakePool.end).toHaveBeenCalledTimes(1);
    });

    it('после close() следующий getPool() создаёт новый pool', async () => {
        const pool1 = provider.getPool();
        expect(createPoolSpy).toHaveBeenCalledTimes(1);

        await provider.close();
        expect(fakePool.end).toHaveBeenCalledTimes(1);

        const newFakePool = {
            query: vi.fn(),
            getConnection: vi.fn(),
            end: vi.fn().mockResolvedValue(undefined),
        };
        createPoolSpy.mockReturnValueOnce(newFakePool as unknown as Pool);

        const pool2 = provider.getPool();
        expect(createPoolSpy).toHaveBeenCalledTimes(2);
        expect(pool2).not.toBe(pool1);
    });
});
