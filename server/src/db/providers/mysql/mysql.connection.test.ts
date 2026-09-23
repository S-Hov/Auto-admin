import { describe, it, expect, vi } from 'vitest';
import { MySqlDatabaseConnection } from './mysql.connection';
import type mysql from 'mysql2/promise';

describe('MySqlDatabaseConnection', () => {
    const createFakeConnection = () => {
        const events: string[] = [];
        const fake = {
            query: vi.fn(),
            beginTransaction: vi.fn().mockImplementation(async () => {
                events.push('beginTransaction');
            }),
            commit: vi.fn().mockImplementation(async () => {
                events.push('commit');
            }),
            rollback: vi.fn().mockImplementation(async () => {
                events.push('rollback');
            }),
        } as unknown as mysql.PoolConnection & {
            query: ReturnType<typeof vi.fn>;
            beginTransaction: ReturnType<typeof vi.fn>;
            commit: ReturnType<typeof vi.fn>;
            rollback: ReturnType<typeof vi.fn>;
        };

        return { fake, events };
    };

    it('проверяет порядок операций: beginTransaction → callback → commit', async () => {
        const { fake, events } = createFakeConnection();
        const connection = new MySqlDatabaseConnection(fake);

        const result = await connection.transaction(async (executor) => {
            events.push('callback');
            expect(executor).toBe(connection);
            return 'result_data';
        });

        expect(result).toBe('result_data');
        expect(events).toEqual(['beginTransaction', 'callback', 'commit']);
        expect(fake.beginTransaction).toHaveBeenCalledTimes(1);
        expect(fake.commit).toHaveBeenCalledTimes(1);
        expect(fake.rollback).not.toHaveBeenCalled();
    });

    it('сценарий: callback упал → rollback', async () => {
        const { fake } = createFakeConnection();
        const connection = new MySqlDatabaseConnection(fake);
        const cbError = new Error('Callback business logic failure');

        await expect(
            connection.transaction(async () => {
                throw cbError;
            })
        ).rejects.toThrow(cbError);

        expect(fake.beginTransaction).toHaveBeenCalledTimes(1);
        expect(fake.commit).not.toHaveBeenCalled();
        expect(fake.rollback).toHaveBeenCalledTimes(1);
    });

    it('сценарий: commit упал → rollback', async () => {
        const { fake } = createFakeConnection();
        const connection = new MySqlDatabaseConnection(fake);
        const commitError = new Error('Commit failed at network level');
        fake.commit.mockRejectedValueOnce(commitError);

        await expect(
            connection.transaction(async () => {
                return 'ok';
            })
        ).rejects.toThrow(commitError);

        expect(fake.beginTransaction).toHaveBeenCalledTimes(1);
        expect(fake.commit).toHaveBeenCalledTimes(1);
        expect(fake.rollback).toHaveBeenCalledTimes(1);
    });

    it('сценарий: rollback упал → AggregateError', async () => {
        const { fake } = createFakeConnection();
        const connection = new MySqlDatabaseConnection(fake);
        const cbError = new Error('Initial query failure');
        const rbError = new Error('Deadlock on rollback');

        fake.rollback.mockRejectedValueOnce(rbError);

        await expect(
            connection.transaction(async () => {
                throw cbError;
            })
        ).rejects.toThrow(AggregateError);
    });

    it('сценарий: исходная ошибка не теряется', async () => {
        // 1. При успешном rollback исходная ошибка выбрасывается как есть
        const { fake: fake1 } = createFakeConnection();
        const connection1 = new MySqlDatabaseConnection(fake1);
        const originalError = new Error('Specific domain error');

        let caught1: unknown;
        try {
            await connection1.transaction(async () => {
                throw originalError;
            });
        } catch (err) {
            caught1 = err;
        }
        expect(caught1).toBe(originalError);

        // 2. При упавшем rollback исходная ошибка сохраняется на первом месте в AggregateError
        const { fake: fake2 } = createFakeConnection();
        const connection2 = new MySqlDatabaseConnection(fake2);
        const rollbackError = new Error('Rollback failed');
        fake2.rollback.mockRejectedValueOnce(rollbackError);

        let caught2: unknown;
        try {
            await connection2.transaction(async () => {
                throw originalError;
            });
        } catch (err) {
            caught2 = err;
        }

        expect(caught2).toBeInstanceOf(AggregateError);
        const agg = caught2 as AggregateError;
        expect(agg.message).toBe('Transaction failed');
        expect(agg.errors).toHaveLength(2);
        expect(agg.errors[0]).toBe(originalError);
        expect(agg.errors[1]).toBe(rollbackError);
    });
});
