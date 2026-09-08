import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

const enabled = process.env.Auto_Admin__RUN_MYSQL_TESTS === '1';

test('migration runner applies a clean catalog once and in order', { skip: !enabled }, async () => {
    const host = process.env.Auto_Admin__TEST_DB_HOST;
    const user = process.env.Auto_Admin__TEST_DB_USERNAME;
    const password = process.env.Auto_Admin__TEST_DB_PASSWORD ?? '';
    const port = Number(process.env.Auto_Admin__TEST_DB_PORT ?? 3306);

    if (!host || !user || !Number.isInteger(port)) {
        throw new Error('Dedicated MySQL test credentials are missing');
    }

    const mysql = await import('mysql2/promise');
    const adminConnection = await mysql.createConnection({ host, port, user, password });
    const database = `auto_admin_test_${randomUUID().replaceAll('-', '')}`;

    await adminConnection.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);

    process.env.Auto_Admin__INSTALL_TOKEN = process.env.Auto_Admin__INSTALL_TOKEN ?? 'test-install-token-that-is-at-least-32-characters';
    process.env.Auto_Admin__DB_HOST = host;
    process.env.Auto_Admin__DB_PORT = String(port);
    process.env.Auto_Admin__DB_USERNAME = user;
    process.env.Auto_Admin__DB_PASSWORD = password;
    process.env.Auto_Admin__DB_DATABASE = database;

    try {
        const { applyNextMigration, getCurrentMigrationPlan } = await import('../../src/migrations/migration.runner');
        const { resetPool } = await import('../../src/db');

        await assert.rejects(() => applyNextMigration('9999'), /expected|next|version/i);

        let plan = await getCurrentMigrationPlan();
        while (plan.next) {
            await applyNextMigration(plan.next.version);
            plan = await getCurrentMigrationPlan();
        }

        assert.equal(plan.isComplete, true);
        assert.equal(plan.pending.length, 0);

        const [historyRows] = await adminConnection.query<Array<{ count: number } & import('mysql2/promise').RowDataPacket>>(
            `SELECT COUNT(*) AS count FROM \`${database}\`.Auto_Admin__migration_history WHERE status = 'applied'`,
        );
        assert.equal(Number(historyRows[0]?.count), plan.applied.length);

        await resetPool();
    }
    finally {
        await adminConnection.query(`DROP DATABASE IF EXISTS \`${database}\``);
        await adminConnection.end();
    }
});
