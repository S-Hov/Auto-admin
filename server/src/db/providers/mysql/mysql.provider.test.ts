import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import mysql, { type Pool } from 'mysql2/promise';
import { MySqlDatabaseProvider } from './mysql.provider';
import type { DatabaseConnectionConfig } from '../../contracts/connection.types';
import { logger } from '../../../shared/logger';

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
        for (const key of Object.keys(process.env)) {
            if (!(key in originalEnv)) {
                delete process.env[key];
            }
        }
        Object.assign(process.env, originalEnv);
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

    it('resetPool() ждёт завершения end()', async () => {
        provider.getPool();

        let isEndCompleted = false;
        let resolveEnd!: () => void;
        fakePool.end.mockImplementation(() => {
            return new Promise<void>((resolve) => {
                resolveEnd = () => {
                    isEndCompleted = true;
                    resolve();
                };
            });
        });

        let isResetResolved = false;
        const resetPromise = provider.resetPool().then(() => {
            isResetResolved = true;
        });

        expect(fakePool.end).toHaveBeenCalledTimes(1);
        expect(isEndCompleted).toBe(false);
        expect(isResetResolved).toBe(false);

        resolveEnd();
        await resetPromise;

        expect(isEndCompleted).toBe(true);
        expect(isResetResolved).toBe(true);
    });

    describe('getConnectionConfig and hasCompleteConfig', () => {
        it('getConnectionConfig() возвращает config с type: "mysql"', () => {
            const config = provider.getConnectionConfig();
            expect(config).toEqual({
                type: 'mysql',
                host: '127.0.0.1',
                port: 3306,
                user: 'test_user',
                password: 'test_password',
                database: 'test_db',
            });
        });

        it('пустой пароль разрешён', () => {
            process.env.Auto_Admin__DB_PASSWORD = '';
            const config = provider.getConnectionConfig();
            expect(config.password).toBe('');
            expect(provider.hasCompleteConfig()).toBe(true);
        });

        it.each([
            ['Auto_Admin__DB_HOST'],
            ['Auto_Admin__DB_PORT'],
            ['Auto_Admin__DB_USERNAME'],
            ['Auto_Admin__DB_PASSWORD'],
            ['Auto_Admin__DB_DATABASE'],
        ])('отсутствующий параметр %s вызывает ошибку', (envKey) => {
            delete process.env[envKey];
            expect(() => provider.getConnectionConfig()).toThrow('Missing or invalid database connection data');
        });

        it.each(['0', '-1', '65536', 'abc', '3306.5', ''])(
            'неправильный port (%s) даёт ошибку',
            (invalidPort) => {
                process.env.Auto_Admin__DB_PORT = invalidPort;
                expect(() => provider.getConnectionConfig()).toThrow('Missing or invalid database connection data');
            }
        );

        it('hasCompleteConfig() возвращает true/false, не бросая ошибку', () => {
            expect(() => provider.hasCompleteConfig()).not.toThrow();
            expect(provider.hasCompleteConfig()).toBe(true);

            delete process.env.Auto_Admin__DB_HOST;
            expect(() => provider.hasCompleteConfig()).not.toThrow();
            expect(provider.hasCompleteConfig()).toBe(false);

            process.env.Auto_Admin__DB_HOST = '127.0.0.1';
            process.env.Auto_Admin__DB_PORT = 'invalid_port';
            expect(() => provider.hasCompleteConfig()).not.toThrow();
            expect(provider.hasCompleteConfig()).toBe(false);
        });
    });

    describe('checkConnection and withTemporaryConnection', () => {
        let fakeTempConnection: {
            query: ReturnType<typeof vi.fn>;
            end: ReturnType<typeof vi.fn>;
        };
        let createConnectionSpy: ReturnType<typeof vi.spyOn>;
        let loggerWarnSpy: ReturnType<typeof vi.spyOn>;

        const checkConfig: DatabaseConnectionConfig<'mysql'> = {
            type: 'mysql',
            host: '127.0.0.1',
            port: 3306,
            user: 'test_user',
            password: 'test_password',
            database: 'test_db',
        };

        beforeEach(() => {
            fakeTempConnection = {
                query: vi.fn(),
                end: vi.fn().mockResolvedValue(undefined),
            };
            createConnectionSpy = vi.spyOn(mysql, 'createConnection').mockResolvedValue(
                fakeTempConnection as unknown as mysql.Connection
            );
            loggerWarnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => logger);
        });

        afterEach(() => {
            createConnectionSpy.mockRestore();
            loggerWarnSpy.mockRestore();
        });

        it('checkConnection() использует именно mysql.createConnection', async () => {
            fakeTempConnection.query.mockResolvedValueOnce([[{ version: '8.0.32' }], []]);

            await provider.checkConnection(checkConfig);

            expect(createConnectionSpy).toHaveBeenCalledTimes(1);
            expect(createConnectionSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    host: checkConfig.host,
                    port: checkConfig.port,
                    user: checkConfig.user,
                    password: checkConfig.password,
                    database: checkConfig.database,
                })
            );
        });

        it('основной createPool() во время проверки не вызывается', async () => {
            fakeTempConnection.query.mockResolvedValueOnce([[{ version: '8.0.32' }], []]);

            await provider.checkConnection(checkConfig);

            expect(createPoolSpy).not.toHaveBeenCalled();
        });

        it('версия читается через временное соединение', async () => {
            fakeTempConnection.query.mockResolvedValueOnce([[{ version: '8.0.32' }], []]);

            const result = await provider.checkConnection(checkConfig);

            expect(fakeTempConnection.query).toHaveBeenCalledWith(
                expect.objectContaining({
                    sql: 'SELECT VERSION() as version',
                })
            );
            expect(result).toEqual({ version: '8.0.32' });
        });

        it('временное соединение закрывается после успеха', async () => {
            fakeTempConnection.query.mockResolvedValueOnce([[{ version: '8.0.32' }], []]);

            await provider.checkConnection(checkConfig);

            expect(fakeTempConnection.end).toHaveBeenCalledTimes(1);
        });

        it('закрывается после ошибки запроса', async () => {
            fakeTempConnection.query.mockRejectedValueOnce(new Error('Connection query error'));

            await expect(provider.checkConnection(checkConfig)).rejects.toThrow();
            expect(fakeTempConnection.end).toHaveBeenCalledTimes(1);
        });

        it.each([
            ['пустая строка', [{ version: '' }]],
            ['строка из пробелов', [{ version: '   ' }]],
            ['пустой массив строк', []],
            ['отсутствует свойство version', [{ other: 123 }]],
        ])('пустая версия (%s) считается ошибкой', async (_, rows) => {
            fakeTempConnection.query.mockResolvedValueOnce([rows, []]);

            await expect(provider.checkConnection(checkConfig)).rejects.toThrow(
                'Failed to get database version'
            );
            expect(fakeTempConnection.end).toHaveBeenCalledTimes(1);
        });

        it('ошибка запроса сохраняется', async () => {
            const originalQueryError = new Error('Original SQL query syntax error');
            fakeTempConnection.query.mockRejectedValueOnce(originalQueryError);

            await expect(provider.checkConnection(checkConfig)).rejects.toThrow(originalQueryError);
        });

        it('операция успешна, end упал → выбрасывает ошибку end', async () => {
            const endError = new Error('End error');
            fakeTempConnection.query.mockResolvedValueOnce([[{ version: '8.0.32' }], []]);
            fakeTempConnection.end.mockRejectedValueOnce(endError);

            await expect(provider.checkConnection(checkConfig)).rejects.toThrow(endError);
            expect(fakeTempConnection.end).toHaveBeenCalledTimes(1);
        });

        it('одновременная ошибка запроса и end() превращается в AggregateError', async () => {
            const opError = new Error('Operation query failed');
            const endError = new Error('End failed');
            fakeTempConnection.query.mockRejectedValueOnce(opError);
            fakeTempConnection.end.mockRejectedValueOnce(endError);

            let caughtError: unknown;
            try {
                await provider.checkConnection(checkConfig);
            } catch (err) {
                caughtError = err;
            }

            expect(caughtError).toBeInstanceOf(AggregateError);
            const agg = caughtError as AggregateError;
            expect(agg.errors).toHaveLength(2);
            expect(agg.errors[0]).toBe(opError);
            expect(agg.errors[1]).toBe(endError);
            expect(fakeTempConnection.end).toHaveBeenCalledTimes(1);
        });

        it('withTemporaryConnection передаёт соединение в callback и возвращает результат callback', async () => {
            const result = await (provider as unknown as {
                withTemporaryConnection: <T>(
                    config: DatabaseConnectionConfig<'mysql'>,
                    cb: (conn: unknown) => Promise<T>
                ) => Promise<T>;
            }).withTemporaryConnection(checkConfig, async (conn) => {
                expect(conn).toBe(fakeTempConnection);
                return { custom: 'data' };
            });

            expect(result).toEqual({ custom: 'data' });
            expect(fakeTempConnection.end).toHaveBeenCalledTimes(1);
        });

        it('withTemporaryConnection выбрасывает AggregateError с сохранением порядка ошибок', async () => {
            const callbackError = new Error('Custom callback failure');
            const endError = new Error('End failure');
            fakeTempConnection.end.mockRejectedValueOnce(endError);

            let caught: unknown;
            try {
                await (provider as unknown as {
                    withTemporaryConnection: <T>(
                        config: DatabaseConnectionConfig<'mysql'>,
                        cb: (conn: unknown) => Promise<T>
                    ) => Promise<T>;
                }).withTemporaryConnection(checkConfig, async () => {
                    throw callbackError;
                });
            } catch (err) {
                caught = err;
            }

            expect(caught).toBeInstanceOf(AggregateError);
            const agg = caught as AggregateError;
            expect(agg.errors).toHaveLength(2);
            expect(agg.errors[0]).toBe(callbackError);
            expect(agg.errors[1]).toBe(endError);
            expect(fakeTempConnection.end).toHaveBeenCalledTimes(1);
        });
    });
});
