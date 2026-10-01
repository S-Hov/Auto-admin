import { describe, it, expect, vi } from "vitest";
import {
    admin,
    manager,
    catalog,
    emptyRules,
    repository,
    database,
} from "../../../../tests/fixtures/access.fixture";
import { AccessControlService } from "../../access-control";
import { QueryAuthorizer } from "./query-authorizer";
import { analyzeQueryAccess } from "./query-access.analyzer";
import { parseUnifiedQuery, queryEngineSchema } from "../schema/query.schema";
import { QueryEngineService } from "../query-engine.service";
import { PipelineExecutor } from "../pipeline/pipeline.executor";
import { MySqlCompiler } from "../providers/mysql/mysql-query.compiler";
import type { QueryEngineProvider } from "../contracts/query-engine-provider.interface";
import type { PermissionRuleSet } from "../../access-control/contracts/access-control-repository.types";
import type { PipelineDefinition } from "../pipeline/pipeline.types";
import type { AccessPrincipal } from "../../access-control";

const read = { action: "read" as const, table: "orders", select: ["total"] };
function harness(rules: PermissionRuleSet = emptyRules(), schema = catalog()) {
    const repo = repository(rules);
    const access = new AccessControlService(
        async () => schema,
        () => repo,
    );
    const authorizer = new QueryAuthorizer(access);
    const db = database();
    const execute = vi.fn(async () => ({
        rows: [{ total: 42 }],
        affectedRows: 1,
        insertId: 5,
    }));
    const compile = vi.fn((query) => new MySqlCompiler().compile(query));
    const provider = {
        type: "mysql",
        compiler: { compile },
        supportsTransactionalWrites: (resource: { engine: string | null }) =>
            resource.engine?.toLowerCase() === "innodb",
        createDriver: vi.fn(() => ({ execute, ping: vi.fn() })),
    } as unknown as QueryEngineProvider;
    return {
        ...db,
        repo,
        access,
        authorizer,
        execute,
        compile,
        provider,
        engine: new QueryEngineService(db.provider, provider, authorizer),
        pipeline: new PipelineExecutor(db.provider, provider, authorizer),
    };
}
const analyze = (query: unknown) =>
    analyzeQueryAccess(parseUnifiedQuery(query), catalog());

describe("query access analysis", () => {
    it("collects SELECT, both JOIN sides, nested WHERE and SORT with canonical identifiers", () => {
        const result = analyze({
            ...read,
            select: ["orders.total", "u.name"],
            joins: [
                {
                    table: "users",
                    alias: "u",
                    on: { "orders.user_id": "u.id" },
                },
            ],
            where: {
                _and: [
                    { "orders.id": { _gt: 0 } },
                    { _not: { "u.name": { _eq: "test" } } },
                ],
            },
            sort: [{ field: "orders.internal_note", direction: "asc" }],
        });
        expect(result.query.table).toBe("shop.orders");
        expect(result.requirements.resources).toEqual([
            { resourceId: 1, action: "read" },
            { resourceId: 2, action: "read" },
        ]);
        expect(
            new Set(result.requirements.fields.map((item) => item.fieldId)),
        ).toEqual(new Set([1, 2, 3, 4, 5, 6]));
        expect(
            result.requirements.fields.filter((item) => item.usage === "join"),
        ).toHaveLength(2);
        expect(Object.isFrozen(result.requirements.fields)).toBe(true);
    });
    it("expands wildcard and sets a default result limit", () => {
        const result = analyze({ ...read, select: ["*"] });
        expect(result.query).toMatchObject({
            select: [
                "orders.id",
                "orders.user_id",
                "orders.total",
                "orders.internal_note",
            ],
            limit: 100,
        });
    });
    it.each([
        { ...read, select: ["missing"] },
        { ...read, table: "other.orders" },
        { ...read, select: ["total;DROP TABLE users"] },
        {
            ...read,
            select: ["id"],
            joins: [{ table: "users", on: { "orders.user_id": "users.id" } }],
        },
        {
            ...read,
            joins: [
                {
                    table: "users",
                    alias: "orders",
                    on: { "orders.user_id": "orders.id" },
                },
            ],
        },
        {
            ...read,
            joins: [
                {
                    table: "users",
                    alias: "u",
                    on: { "orders.user_id": "users.id" },
                },
            ],
        },
        {
            ...read,
            joins: [
                {
                    table: "users",
                    alias: "u",
                    on: { "orders.user_id": "future.id" },
                },
            ],
        },
        {
            ...read,
            select: ["orders.id", "users.id"],
            joins: [{ table: "users", on: { "orders.user_id": "users.id" } }],
        },
        {
            ...read,
            joins: [
                {
                    table: "users",
                    alias: "ORDERS",
                    on: { "orders.user_id": "ORDERS.id" },
                },
            ],
        },
        { ...read, where: { id: { _eq: 1 }, "orders.id": { _eq: 2 } } },
        {
            ...read,
            joins: [
                {
                    table: "users",
                    on: {
                        "orders.user_id": "users.id",
                        "shop.orders.user_id": "users.name",
                    },
                },
            ],
        },
    ])("rejects unresolved/ambiguous references before SQL: %j", (query) =>
        expect(() => analyze(query)).toThrow(),
    );
    it("requires UPDATE for data and READ for condition fields", () => {
        const result = analyze({
            action: "update",
            table: "orders",
            data: { total: 50 },
            where: { id: { _eq: 1 } },
        });
        expect(result.requirements.fields).toEqual([
            { resourceId: 1, fieldId: 3, action: "update", usage: "data" },
            { resourceId: 1, fieldId: 1, action: "read", usage: "where" },
        ]);
    });
    it("rejects missing and generated fields", () => {
        const schema = catalog();
        schema.fields[2].state = "missing";
        expect(() =>
            analyzeQueryAccess(parseUnifiedQuery(read), schema),
        ).toThrow();
        schema.fields[2].state = "present";
        schema.fields[2].generated.isGenerated = true;
        expect(() =>
            analyzeQueryAccess(
                parseUnifiedQuery({
                    action: "create",
                    table: "orders",
                    data: { total: 1 },
                }),
                schema,
            ),
        ).toThrow();
    });
});

describe("runtime query validation", () => {
    it.each([
        { action: "delete", table: "orders", where: {} },
        {
            action: "update",
            table: "orders",
            data: { total: 1 },
            where: { _and: [] },
        },
        { action: "delete", table: "orders", where: { _not: {} } },
        { ...read, connection: "other" },
        { ...read, select: [] },
        { ...read, limit: 501 },
        { ...read, returning: ["total"] },
        {
            ...read,
            joins: [
                {
                    table: "users",
                    type: "OUTER",
                    on: { "orders.id": "users.id" },
                },
            ],
        },
        { action: "create", table: "orders", data: [{ total: 1 }, { id: 1 }] },
        { action: "delete", table: "orders", where: { id: { _nin: [] } } },
    ])("rejects unsafe or unsupported input %j", (query) =>
        expect(queryEngineSchema.safeParse(query).success).toBe(false),
    );
    it("bounds recursive conditions", () => {
        let where: unknown = { id: { _eq: 1 } };
        for (let i = 0; i < 40; i++) where = { _not: where };
        expect(queryEngineSchema.safeParse({ ...read, where }).success).toBe(
            false,
        );
    });
});

describe("mandatory engine authorization", () => {
    it("bounds the complete response size", async () => {
        const h = harness();
        h.execute.mockResolvedValueOnce({
            rows: [{ total: "x".repeat(2 * 1024 * 1024) }],
            affectedRows: 1,
            insertId: 5,
        } as never);
        await expect(h.engine.execute(read, admin)).rejects.toMatchObject({
            status: 413,
            code: "QUERY.RESULT_TOO_LARGE",
        });
    });
    it("compiles and executes only the canonical authorized query", async () => {
        const h = harness();
        await h.engine.execute(read, admin);
        expect(h.compile).toHaveBeenCalledWith(
            expect.objectContaining({
                table: "shop.orders",
                select: ["orders.total"],
                limit: 100,
            }),
        );
        expect(h.execute).toHaveBeenCalledOnce();
    });
    it("requires a server principal", async () => {
        const h = harness();
        await expect(
            h.engine.execute(read, undefined as unknown as AccessPrincipal),
        ).rejects.toMatchObject({ status: 401 });
        expect(h.execute).not.toHaveBeenCalled();
    });
    it("does not invoke the compiler, driver or transaction when a later batch command is denied", async () => {
        const rules = emptyRules();
        rules.roleResourceRules.push({
            resourceId: 1,
            action: "read",
            effect: "allow",
        });
        const h = harness(rules);
        await expect(
            h.engine.execute(
                [
                    read,
                    {
                        action: "delete",
                        table: "orders",
                        where: { id: { _eq: 1 } },
                    },
                ],
                manager,
            ),
        ).rejects.toMatchObject({ status: 403 });
        expect(h.compile).not.toHaveBeenCalled();
        expect(h.provider.createDriver).not.toHaveBeenCalled();
        expect(h.transaction).not.toHaveBeenCalled();
    });
    it("denies hidden fields even when only used in filters and wildcards", async () => {
        const rules = emptyRules();
        rules.roleResourceRules.push({
            resourceId: 1,
            action: "read",
            effect: "allow",
        });
        rules.roleFieldRules.push({
            fieldId: 4,
            action: "read",
            effect: "deny",
        });
        const h = harness(rules);
        await expect(
            h.engine.execute(
                { ...read, where: { internal_note: { _eq: "secret" } } },
                manager,
            ),
        ).rejects.toMatchObject({ status: 403 });
        await expect(
            h.engine.execute({ ...read, select: ["*"] }, manager),
        ).rejects.toMatchObject({ status: 403 });
        expect(h.execute).not.toHaveBeenCalled();
    });
    it("denies service resources and view writes even to admin", async () => {
        const h = harness();
        await expect(
            h.engine.execute(
                {
                    action: "read",
                    table: "Auto_Admin__sessions",
                    select: ["token_hash"],
                },
                admin,
            ),
        ).rejects.toMatchObject({ status: 403 });
        await expect(
            h.engine.execute(
                { action: "create", table: "summary", data: { total: 1 } },
                admin,
            ),
        ).rejects.toMatchObject({ status: 403 });
        expect(h.compile).not.toHaveBeenCalled();
    });
    it("reloads rules for each request so revocation affects the next request", async () => {
        const rules = emptyRules();
        rules.roleResourceRules.push({
            resourceId: 1,
            action: "read",
            effect: "allow",
        });
        const h = harness(rules);
        await h.engine.execute(read, manager);
        rules.roleResourceRules[0].effect = "deny";
        await expect(h.engine.execute(read, manager)).rejects.toMatchObject({
            status: 403,
        });
        expect(h.repo.getPermissionsForUser).toHaveBeenCalledTimes(2);
        expect(h.execute).toHaveBeenCalledOnce();
    });
    it("fails closed when permissions cannot be loaded", async () => {
        const h = harness();
        vi.mocked(h.repo.getPermissionsForUser).mockRejectedValueOnce(
            new Error("database unavailable"),
        );
        await expect(h.engine.execute(read, admin)).rejects.toThrow(
            "database unavailable",
        );
        expect(h.compile).not.toHaveBeenCalled();
    });
    it("rejects transaction batches targeting nontransactional tables", async () => {
        const schema = catalog();
        schema.resources[0].engine = "MyISAM";
        const h = harness(emptyRules(), schema);
        await expect(
            h.engine.execute(
                [{ action: "create", table: "orders", data: { total: 1 } }],
                admin,
            ),
        ).rejects.toMatchObject({ status: 400 });
        expect(h.execute).not.toHaveBeenCalled();
    });
});

describe("pipeline security", () => {
    const definition: PipelineDefinition = {
        steps: [
            {
                id: "createOrder",
                query: {
                    action: "create",
                    table: "orders",
                    data: { total: 1 },
                },
            },
            {
                id: "readOrder",
                query: {
                    ...read,
                    where: { id: { _eq: "$steps.createOrder.insertId" } },
                },
            },
        ],
    };
    it("prechecks all steps and revalidates resolved scalar values", async () => {
        const h = harness();
        await h.engine.executePipeline(definition, admin);
        expect(h.transaction).toHaveBeenCalledOnce();
        expect(h.compile).toHaveBeenLastCalledWith(
            expect.objectContaining({ where: { "orders.id": { _eq: 5 } } }),
        );
    });
    it("a directly constructed pipeline executor cannot bypass authorization", async () => {
        const h = harness();
        await expect(
            h.pipeline.execute(definition, manager),
        ).rejects.toMatchObject({ status: 403 });
        expect(h.execute).not.toHaveBeenCalled();
        expect(h.transaction).not.toHaveBeenCalled();
    });
    it.each([
        { steps: [...definition.steps], transactional: false },
        {
            steps: [
                {
                    id: "one",
                    query: { ...read, table: "$steps.other.insertId" },
                },
            ],
        },
        {
            steps: [
                {
                    id: "one",
                    query: {
                        ...read,
                        where: { id: { _eq: "$steps.future.insertId" } },
                    },
                },
            ],
        },
        {
            steps: [
                { id: "one", query: read },
                { id: "one", query: read },
            ],
        },
        { steps: [{ id: "one", query: read, dependsOn: ["future"] }] },
        {
            steps: [
                { id: "one", query: read },
                {
                    id: "two",
                    query: {
                        ...read,
                        where: { id: { _eq: "$steps.one.rows.0.constructor" } },
                    },
                },
            ],
        },
    ])(
        "rejects an unsafe pipeline before any execution: %j",
        async (definition) => {
            const h = harness();
            await expect(
                h.pipeline.execute(definition, admin),
            ).rejects.toMatchObject({ status: 400 });
            expect(h.execute).not.toHaveBeenCalled();
        },
    );
    it("rolls back writes when a runtime reference cannot be resolved", async () => {
        const h = harness();
        let committed = false;
        h.transaction.mockImplementationOnce(async (callback) => {
            const result = await callback(h.executor);
            committed = true;
            return result;
        });
        const steps = [
            definition.steps[0],
            {
                id: "next",
                query: {
                    ...read,
                    where: { id: { _eq: "$steps.createOrder.rows.99.total" } },
                },
            },
        ];
        await expect(
            h.pipeline.execute({ steps }, admin),
        ).rejects.toMatchObject({ status: 400 });
        expect(committed).toBe(false);
        expect(h.execute).toHaveBeenCalledOnce();
    });
});
