import { describe, it, expect } from 'vitest';
import {
    DATABASE_CATALOG,
    getDatabaseDescriptor,
    assertDatabaseSupported,
    assertDatabaseSubsystemSupported,
} from './database.catalog';
import {
    UnsupportedDatabaseError,
    UnsupportedDatabaseSubsystemError,
} from './database.errors';
import type { DatabaseSubsystem, DatabaseType } from './database.types';

describe('Database Catalog', () => {
    describe('getDatabaseDescriptor', () => {
        it('mysql возвращает правильный descriptor', () => {
            const descriptor = getDatabaseDescriptor('mysql');

            expect(descriptor).toEqual({
                type: 'mysql',
                displayName: 'MySQL',
                defaultPort: 3306,
                status: 'supported',
                support: {
                    connection: true,
                    systemRepositories: true,
                    queryEngine: true,
                    schemaCatalog: true,
                    migrations: true,
                },
            });
            expect(descriptor).toBe(DATABASE_CATALOG.mysql);
        });

        it('PostgreSQL имеет planned', () => {
            const descriptor = getDatabaseDescriptor('postgresql');

            expect(descriptor.type).toBe('postgresql');
            expect(descriptor.displayName).toBe('PostgreSQL');
            expect(descriptor.defaultPort).toBe(5432);
            expect(descriptor.status).toBe('planned');
        });

        it('SQLite имеет planned', () => {
            const descriptor = getDatabaseDescriptor('sqlite');

            expect(descriptor.type).toBe('sqlite');
            expect(descriptor.displayName).toBe('SQLite');
            expect(descriptor.defaultPort).toBeNull();
            expect(descriptor.status).toBe('planned');
        });

        it('выбрасывает UnsupportedDatabaseError для неизвестного типа базы данных', () => {
            expect(() => getDatabaseDescriptor('unknown_db' as DatabaseType)).toThrow(UnsupportedDatabaseError);
            try {
                getDatabaseDescriptor('unknown_db' as DatabaseType);
            } catch (error) {
                expect(error).toBeInstanceOf(UnsupportedDatabaseError);
                const dbError = error as UnsupportedDatabaseError;
                expect(dbError.name).toBe('UnsupportedDatabaseError');
                expect(dbError.message).toBe('Database unknown_db is not supported');
                expect(dbError.databaseType).toBe('unknown_db');
            }
        });
    });

    describe('assertDatabaseSupported', () => {
        it("assertDatabaseSupported('mysql') проходит", () => {
            expect(() => assertDatabaseSupported('mysql')).not.toThrow();
            expect(assertDatabaseSupported('mysql')).toBe(DATABASE_CATALOG.mysql);
        });

        it('PostgreSQL и SQLite выбрасывают UnsupportedDatabaseError', () => {
            expect(() => assertDatabaseSupported('postgresql')).toThrow(UnsupportedDatabaseError);
            try {
                assertDatabaseSupported('postgresql');
            } catch (error) {
                expect(error).toBeInstanceOf(UnsupportedDatabaseError);
                const dbError = error as UnsupportedDatabaseError;
                expect(dbError.name).toBe('UnsupportedDatabaseError');
                expect(dbError.message).toBe('Database postgresql is not supported');
                expect(dbError.databaseType).toBe('postgresql');
            }

            expect(() => assertDatabaseSupported('sqlite')).toThrow(UnsupportedDatabaseError);
            try {
                assertDatabaseSupported('sqlite');
            } catch (error) {
                expect(error).toBeInstanceOf(UnsupportedDatabaseError);
                const dbError = error as UnsupportedDatabaseError;
                expect(dbError.name).toBe('UnsupportedDatabaseError');
                expect(dbError.message).toBe('Database sqlite is not supported');
                expect(dbError.databaseType).toBe('sqlite');
            }
        });
    });

    describe('assertDatabaseSubsystemSupported', () => {
        it('MySQL поддерживает все пять заявленных подсистем', () => {
            const subsystems: DatabaseSubsystem[] = [
                'connection',
                'systemRepositories',
                'queryEngine',
                'schemaCatalog',
                'migrations',
            ];

            const mysqlDescriptor = getDatabaseDescriptor('mysql');
            expect(Object.keys(mysqlDescriptor.support)).toHaveLength(5);

            for (const subsystem of subsystems) {
                expect(mysqlDescriptor.support[subsystem]).toBe(true);
                expect(assertDatabaseSubsystemSupported('mysql', subsystem)).toBe(DATABASE_CATALOG.mysql);
            }
        });

        it('проверка неподдерживаемой подсистемы выбрасывает правильную ошибку', () => {
            const subsystems: DatabaseSubsystem[] = [
                'connection',
                'systemRepositories',
                'queryEngine',
                'schemaCatalog',
                'migrations',
            ];

            for (const subsystem of subsystems) {
                expect(() => assertDatabaseSubsystemSupported('postgresql', subsystem)).toThrow(
                    UnsupportedDatabaseSubsystemError
                );
                expect(() => assertDatabaseSubsystemSupported('sqlite', subsystem)).toThrow(
                    UnsupportedDatabaseSubsystemError
                );
            }

            try {
                assertDatabaseSubsystemSupported('postgresql', 'connection');
            } catch (error) {
                expect(error).toBeInstanceOf(UnsupportedDatabaseSubsystemError);
                const subError = error as UnsupportedDatabaseSubsystemError;
                expect(subError.name).toBe('UnsupportedDatabaseSubsystemError');
                expect(subError.message).toBe('Database subsystem connection is not supported for database postgresql');
                expect(subError.databaseType).toBe('postgresql');
                expect(subError.databaseSubsystem).toBe('connection');
            }

            try {
                assertDatabaseSubsystemSupported('sqlite', 'migrations');
            } catch (error) {
                expect(error).toBeInstanceOf(UnsupportedDatabaseSubsystemError);
                const subError = error as UnsupportedDatabaseSubsystemError;
                expect(subError.name).toBe('UnsupportedDatabaseSubsystemError');
                expect(subError.message).toBe('Database subsystem migrations is not supported for database sqlite');
                expect(subError.databaseType).toBe('sqlite');
                expect(subError.databaseSubsystem).toBe('migrations');
            }

            expect(() => assertDatabaseSubsystemSupported('mysql', 'unknownSubsystem' as any)).toThrow(
                UnsupportedDatabaseSubsystemError
            );
            try {
                assertDatabaseSubsystemSupported('mysql', 'unknownSubsystem' as any);
            } catch (error) {
                expect(error).toBeInstanceOf(UnsupportedDatabaseSubsystemError);
                const subError = error as UnsupportedDatabaseSubsystemError;
                expect(subError.name).toBe('UnsupportedDatabaseSubsystemError');
                expect(subError.message).toBe('Database subsystem unknownSubsystem is not supported for database mysql');
                expect(subError.databaseType).toBe('mysql');
                expect(subError.databaseSubsystem).toBe('unknownSubsystem');
            }

            // Для полностью неизвестной базы ошибка выбрасывается на этапе getDatabaseDescriptor
            expect(() => assertDatabaseSubsystemSupported('unknown_db' as DatabaseType, 'connection')).toThrow(
                UnsupportedDatabaseError
            );
        });
    });
});
