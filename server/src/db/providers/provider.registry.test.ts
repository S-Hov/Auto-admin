import { describe, it, expect, vi } from 'vitest';
import { getDatabaseProvider } from './provider.registry';
import { mysqlDatabaseProvider } from './mysql/mysql.provider';
import { UnsupportedDatabaseError, DatabaseProviderNotFoundError } from '../errors/database.errors';
import * as catalog from '../catalog/database.catalog';
import { DATABASE_CATALOG } from '../catalog/database.catalog';
import type { DatabaseType } from '../contracts/database.types';

describe('DatabaseProviderRegistry', () => {
    it('mysql возвращает именно mysqlDatabaseProvider', () => {
        const provider = getDatabaseProvider('mysql');

        expect(provider).toBe(mysqlDatabaseProvider);
        expect(provider.type).toBe('mysql');
        expect(provider.descriptor).toBe(DATABASE_CATALOG.mysql);
    });

    it('повторный вызов возвращает тот же объект', () => {
        const firstCall = getDatabaseProvider('mysql');
        const secondCall = getDatabaseProvider('mysql');

        expect(firstCall).toBe(secondCall);
    });

    it('postgresql и sqlite дают UnsupportedDatabaseError', () => {
        expect(() => getDatabaseProvider('postgresql')).toThrow(UnsupportedDatabaseError);
        try {
            getDatabaseProvider('postgresql');
        } catch (error) {
            expect(error).toBeInstanceOf(UnsupportedDatabaseError);
            const dbError = error as UnsupportedDatabaseError;
            expect(dbError.name).toBe('UnsupportedDatabaseError');
            expect(dbError.databaseType).toBe('postgresql');
            expect(dbError.message).toBe('Database postgresql is not supported');
        }

        expect(() => getDatabaseProvider('sqlite')).toThrow(UnsupportedDatabaseError);
        try {
            getDatabaseProvider('sqlite');
        } catch (error) {
            expect(error).toBeInstanceOf(UnsupportedDatabaseError);
            const dbError = error as UnsupportedDatabaseError;
            expect(dbError.name).toBe('UnsupportedDatabaseError');
            expect(dbError.databaseType).toBe('sqlite');
            expect(dbError.message).toBe('Database sqlite is not supported');
        }
    });

    it('никакого fallback на MySQL нет', () => {
        const unsupportedTypes: DatabaseType[] = [
            'postgresql',
            'sqlite',
            'oracle' as DatabaseType,
            'unknown_db' as DatabaseType,
        ];

        for (const type of unsupportedTypes) {
            expect(() => getDatabaseProvider(type)).toThrow(UnsupportedDatabaseError);

            let providerResult: unknown = null;
            try {
                providerResult = getDatabaseProvider(type);
            } catch {
                // ожидаем ошибку
            }

            expect(providerResult).toBeNull();
            expect(providerResult).not.toBe(mysqlDatabaseProvider);
        }
    });

    it('выбрасывает DatabaseProviderNotFoundError, если провайдер не зарегистрирован', () => {
        const spy = vi.spyOn(catalog, 'assertDatabaseSupported').mockReturnValue({
            type: 'postgresql',
            displayName: 'PostgreSQL',
            defaultPort: 5432,
            status: 'supported',
            support: {
                connection: true,
                systemRepositories: true,
                queryEngine: true,
                schemaCatalog: true,
                migrations: true,
            },
        });

        try {
            expect(() => getDatabaseProvider('postgresql')).toThrow(DatabaseProviderNotFoundError);

            try {
                getDatabaseProvider('postgresql');
            } catch (error) {
                expect(error).toBeInstanceOf(DatabaseProviderNotFoundError);
                const providerError = error as DatabaseProviderNotFoundError;
                expect(providerError.name).toBe('DatabaseProviderNotFoundError');
                expect(providerError.databaseType).toBe('postgresql');
                expect(providerError.message).toBe('Database provider for postgresql is not registered');
            }
        } finally {
            spy.mockRestore();
        }
    });
});
