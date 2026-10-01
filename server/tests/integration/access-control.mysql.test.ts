import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";

const integrationTest =
    process.env.Auto_Admin__RUN_MYSQL_TESTS === "1" ? it : it.skip;

integrationTest(
    "access control protects real MySQL queries, transactions, permission audit and menu",
    async () => {
        const host = process.env.Auto_Admin__TEST_DB_HOST;
        const user = process.env.Auto_Admin__TEST_DB_USERNAME;
        const password = process.env.Auto_Admin__TEST_DB_PASSWORD ?? "";
        const port = Number(process.env.Auto_Admin__TEST_DB_PORT ?? 3306);
        if (!host || !user || !Number.isInteger(port))
            throw new Error("Dedicated MySQL test credentials are missing");
        const mysql = await import("mysql2/promise");
        const connection = await mysql.createConnection({
            host,
            port,
            user,
            password,
        });
        const database = `auto_admin_access_test_${randomUUID().replaceAll("-", "")}`;
        await connection.query(
            `CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
        );
        process.env.Auto_Admin__INSTALL_TOKEN ??=
            "test-install-token-that-is-at-least-32-characters";
        const { MySqlDatabaseProvider } =
            await import("../../src/db/providers/mysql/mysql.provider.js");
        class TestDatabase extends MySqlDatabaseProvider {
            override getConnectionConfig() {
                return {
                    type: "mysql" as const,
                    host: host!,
                    port,
                    user: user!,
                    password,
                    database,
                };
            }
        }
        const db = new TestDatabase();
        try {
            const { MySqlMigrationProvider } =
                await import("../../src/migrations/providers/mysql/mysql-migration.provider.js");
            const migrationProvider = new MySqlMigrationProvider();
            for (const migration of await migrationProvider.loadCatalog()) {
                await db.execute(migration.sql, undefined, { timeoutMs: null });
                expect(
                    await migrationProvider.verifyApplied(
                        db,
                        migration.version,
                    ),
                ).toBe(true);
            }
            const { MySqlSchemaCatalogProvider } =
                await import("../../src/core/schema-catalog/providers/mysql/mysql-schema-catalog.provider.js");
            const { SchemaCatalogService } =
                await import("../../src/core/schema-catalog/schema-catalog.service.js");
            const { SchemaCatalogCache } =
                await import("../../src/core/schema-catalog/cache/schema-catalog.cache.js");
            const { MySqlAccessControlProvider } =
                await import("../../src/core/access-control/providers/mysql/mysql-access-control.provider.js");
            const { AccessControlService } =
                await import("../../src/core/access-control/access-control.service.js");
            const { PermissionManagementService } =
                await import("../../src/core/access-control/permission-management.service.js");
            const { QueryEngineService } =
                await import("../../src/core/query-engine/query-engine.service.js");
            const { QueryAuthorizer } =
                await import("../../src/core/query-engine/access/query-authorizer.js");
            const { MySqlQueryEngineProvider } =
                await import("../../src/core/query-engine/providers/mysql/mysql-query-engine.provider.js");
            const { MenuService } =
                await import("../../src/modules/menu/menu.service.js");
            const roles = await db.queryRows<{ id: number; key: string }>(
                "SELECT id, `key` FROM Auto_Admin__roles",
            );
            const adminRoleId = roles.find((role) => role.key === "admin")!.id;
            const managerRoleId = roles.find(
                (role) => role.key === "manager",
            )!.id;
            const adminId = Number(
                (
                    await db.execute(
                        "INSERT INTO Auto_Admin__users (role_id, username, password_hash) VALUES (?, ?, ?)",
                        [adminRoleId, "admin-test", "unused-test-hash"],
                    )
                ).insertId,
            );
            const managerId = Number(
                (
                    await db.execute(
                        "INSERT INTO Auto_Admin__users (role_id, username, password_hash) VALUES (?, ?, ?)",
                        [managerRoleId, "manager-test", "unused-test-hash"],
                    )
                ).insertId,
            );
            const admin = {
                userId: adminId,
                roleId: adminRoleId,
                roleKey: "admin",
                rights: "full" as const,
            };
            const manager = {
                userId: managerId,
                roleId: managerRoleId,
                roleKey: "manager",
                rights: "manager" as const,
            };
            await db.execute(
                "CREATE TABLE customers (id INT PRIMARY KEY, name VARCHAR(100) NOT NULL) ENGINE=InnoDB",
            );
            await db.execute(
                "CREATE TABLE orders (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT, total INT NOT NULL, internal_note VARCHAR(100)) ENGINE=InnoDB",
            );
            await db.execute("INSERT INTO customers VALUES (1, 'Alice')");
            await db.execute(
                "INSERT INTO orders (user_id, total, internal_note) VALUES (1, 10, 'private')",
            );
            const schema = new SchemaCatalogService(
                db,
                new MySqlSchemaCatalogProvider(),
                new SchemaCatalogCache(),
                database,
            );
            await schema.scan(adminId);
            const catalog = await schema.getCatalog();
            const ordersId = catalog.resources.find(
                (resource) => resource.tableName === "orders",
            )!.id;
            const privateFieldId = catalog.fields.find(
                (field) =>
                    field.resourceId === ordersId &&
                    field.name === "internal_note",
            )!.id;
            const accessProvider = new MySqlAccessControlProvider();
            const access = new AccessControlService(
                () => schema.getAuthorizationCatalog(),
                () => accessProvider.createRepository(db),
            );
            const permissions = new PermissionManagementService(
                db,
                accessProvider,
            );
            const engine = new QueryEngineService(
                db,
                new MySqlQueryEngineProvider(),
                new QueryAuthorizer(access),
            );
            const read: import("../../src/core/query-engine/types/query.types.js").ReadQuery =
                {
                    action: "read",
                    table: "orders",
                    select: ["total"],
                };
            await expect(engine.execute(read, manager)).rejects.toMatchObject({
                status: 403,
            });
            const rule = {
                subjectType: "role" as const,
                subjectId: managerRoleId,
                targetType: "resource" as const,
                targetId: ordersId,
                action: "read" as const,
                effect: "allow" as const,
            };
            await permissions.change(rule, admin, "integration-1");
            expect((await engine.execute(read, manager)).rows).toEqual([
                { total: 10 },
            ]);
            await permissions.change(
                {
                    ...rule,
                    targetType: "field",
                    targetId: privateFieldId,
                    effect: "deny",
                },
                admin,
            );
            await expect(
                engine.execute(
                    { ...read, where: { internal_note: { _eq: "private" } } },
                    manager,
                ),
            ).rejects.toMatchObject({ status: 403 });
            await expect(
                engine.execute({ ...read, select: ["*"] }, manager),
            ).rejects.toMatchObject({ status: 403 });
            await expect(
                engine.execute(
                    {
                        action: "read",
                        table: "Auto_Admin__users",
                        select: ["password_hash"],
                    },
                    admin,
                ),
            ).rejects.toMatchObject({ status: 403 });
            const joined = await engine.execute(
                {
                    action: "read",
                    table: "orders",
                    select: ["orders.total", "c.name"],
                    joins: [
                        {
                            table: "customers",
                            alias: "c",
                            on: { "orders.user_id": "c.id" },
                        },
                    ],
                },
                admin,
            );
            expect(joined.rows).toEqual([{ total: 10, name: "Alice" }]);
            await expect(
                engine.executePipeline(
                    {
                        steps: [
                            {
                                id: "created",
                                query: {
                                    action: "create",
                                    table: "orders",
                                    data: { total: 999 },
                                },
                            },
                            {
                                id: "invalid",
                                query: {
                                    ...read,
                                    where: {
                                        id: { _eq: "$steps.created.rows.0.id" },
                                    },
                                },
                            },
                        ],
                    },
                    admin,
                ),
            ).rejects.toMatchObject({ status: 400 });
            expect(
                await db.queryRows(
                    "SELECT total FROM orders WHERE total = 999",
                ),
            ).toHaveLength(0);
            class FailingAuditProvider extends MySqlAccessControlProvider {
                override createRepository(
                    executor: import("../../src/db/contracts/executor.interface.js").DatabaseExecutor,
                ) {
                    const repository = super.createRepository(executor);
                    repository.appendAudit = async () => {
                        throw new Error("audit unavailable");
                    };
                    return repository;
                }
            }
            await expect(
                new PermissionManagementService(
                    db,
                    new FailingAuditProvider(),
                ).change({ ...rule, effect: "deny" }, admin),
            ).rejects.toThrow("audit unavailable");
            expect((await engine.execute(read, manager)).rows).toHaveLength(1);
            const audit = await db.queryRows<{
                previous_effect: string | null;
                new_effect: string;
            }>(
                "SELECT previous_effect, new_effect FROM Auto_Admin__permission_audit_events ORDER BY id",
            );
            expect(audit[0]).toEqual({
                previous_effect: null,
                new_effect: "allow",
            });
            await permissions.change({ ...rule, effect: "deny" }, admin);
            await expect(engine.execute(read, manager)).rejects.toMatchObject({
                status: 403,
            });
            await db.execute(
                "ALTER TABLE orders ADD COLUMN public_label VARCHAR(100) DEFAULT 'new'",
            );
            const otherProcessSchema = new SchemaCatalogService(
                db,
                new MySqlSchemaCatalogProvider(),
                new SchemaCatalogCache(),
                database,
            );
            await otherProcessSchema.scan(adminId);
            expect(
                (await schema.getCatalog()).fields.some(
                    (field) => field.name === "public_label",
                ),
            ).toBe(false);
            expect(
                (
                    await engine.execute(
                        { ...read, select: ["public_label"] },
                        admin,
                    )
                ).rows,
            ).toEqual([{ public_label: "new" }]);
            // The database, as well as the service, prevents duplicate rules and dangling references.
            await expect(
                db.execute(
                    "INSERT INTO Auto_Admin__role_resource_permissions (role_id, resource_id, action, effect) VALUES (?, ?, 'read', 'allow')",
                    [managerRoleId, ordersId],
                ),
            ).rejects.toMatchObject({ code: "ER_DUP_ENTRY" });
            await expect(
                db.execute(
                    "INSERT INTO Auto_Admin__role_resource_permissions (role_id, resource_id, action, effect) VALUES (?, ?, 'read', 'allow')",
                    [999999, ordersId],
                ),
            ).rejects.toMatchObject({ code: "ER_NO_REFERENCED_ROW_2" });
            const menu = new MenuService(db, accessProvider);
            const root = await menu.save(
                {
                    parentId: null,
                    name: "Orders",
                    slug: "orders",
                    icon: null,
                    iconType: "icon",
                    sortOrder: 0,
                    isActive: true,
                },
                admin,
            );
            expect(await menu.getMenu(manager)).toHaveLength(0);
            await menu.changePermissions(
                {
                    menuId: root.id,
                    subjectType: "role",
                    subjectId: managerRoleId,
                    permissions: {
                        canView: true,
                        canCreate: false,
                        canUpdate: false,
                        canDelete: false,
                    },
                },
                admin,
            );
            expect(await menu.getMenu(manager)).toHaveLength(1);
            // Visible navigation did not undo the denied orders/read rule.
            await expect(engine.execute(read, manager)).rejects.toMatchObject({
                status: 403,
            });
            expect(
                await db.queryRows(
                    "SELECT id FROM Auto_Admin__menu_audit_events",
                ),
            ).toHaveLength(2);
        } finally {
            await db.close();
            await connection.query(`DROP DATABASE IF EXISTS \`${database}\``);
            await connection.end();
        }
    },
    60_000,
);
