import { z } from "zod";
import type { UnifiedQuery, WhereClause } from "../types/query.types";

const MAX_DEPTH = 16;
const MAX_NODES = 2_000;
const MAX_ARRAY_ITEMS = 100;
const MAX_OBJECT_KEYS = 100;

// Bound the work Zod has to do before entering the recursive WHERE schema.
const jsonInputSchema = z.unknown().superRefine((input, ctx) => {
    const stack: Array<{ value: unknown; depth: number }> = [
        { value: input, depth: 0 },
    ];
    const seen = new WeakSet<object>();
    let nodes = 0;

    while (stack.length > 0) {
        const { value, depth } = stack.pop()!;
        if (++nodes > MAX_NODES || depth > MAX_DEPTH) {
            ctx.addIssue({ code: "custom", message: "Query is too complex" });
            return;
        }

        if (value === null || typeof value === "boolean") continue;
        if (typeof value === "number") {
            if (Number.isFinite(value)) continue;
        } else if (typeof value === "string") {
            if (value.length <= 4_096) continue;
        } else if (typeof value === "object") {
            if (seen.has(value)) {
                ctx.addIssue({ code: "custom", message: "Cyclic query is not allowed" });
                return;
            }
            seen.add(value);

            if (Array.isArray(value)) {
                if (value.length > MAX_ARRAY_ITEMS) {
                    ctx.addIssue({ code: "custom", message: "Query array is too large" });
                    return;
                }
                for (const item of value) stack.push({ value: item, depth: depth + 1 });
                continue;
            }

            const prototype = Object.getPrototypeOf(value);
            if (prototype === Object.prototype || prototype === null) {
                const entries = Object.entries(value);
                if (entries.length > MAX_OBJECT_KEYS) {
                    ctx.addIssue({ code: "custom", message: "Query object is too large" });
                    return;
                }
                for (const [, item] of entries) {
                    stack.push({ value: item, depth: depth + 1 });
                }
                continue;
            }
        }

        ctx.addIssue({ code: "custom", message: "Query must contain JSON values only" });
        return;
    }
});

// Names are checked against the schema catalog later. This guard only rejects
// empty/wildcard names and backticks that the current compiler would strip.
const identifierSchema = z.string().min(1).max(256).refine(
    (name) => name.trim().length > 0 && !/[`\0*]/.test(name),
    "Invalid identifier",
);

const scalarSchema = z.union([
    z.string().max(4_096),
    z.number().finite(),
    z.boolean(),
]);
const dataValueSchema = z.union([scalarSchema, z.null()]);

const fieldConditionSchema = z.strictObject({
    _eq: scalarSchema.optional(),
    _neq: scalarSchema.optional(),
    _gt: scalarSchema.optional(),
    _gte: scalarSchema.optional(),
    _lt: scalarSchema.optional(),
    _lte: scalarSchema.optional(),
    _in: z.array(scalarSchema).min(1).max(MAX_ARRAY_ITEMS).optional(),
    _nin: z.array(scalarSchema).min(1).max(MAX_ARRAY_ITEMS).optional(),
    _like: z.string().max(4_096).optional(),
    _ilike: z.string().max(4_096).optional(),
    _null: z.literal(true).optional(),
    _not_null: z.literal(true).optional(),
}).refine((condition) => Object.keys(condition).length > 0, "Empty field condition");

const whereSchema: z.ZodType<WhereClause> = z.lazy(() =>
    z.object({
        _and: z.array(whereSchema).min(1).max(MAX_ARRAY_ITEMS).optional(),
        _or: z.array(whereSchema).min(1).max(MAX_ARRAY_ITEMS).optional(),
        _not: whereSchema.optional(),
    })
        .catchall(fieldConditionSchema)
        .superRefine((where, ctx) => {
            if (Object.keys(where).length === 0) {
                ctx.addIssue({ code: "custom", message: "Empty WHERE is not allowed" });
            }
            for (const key of Object.keys(where)) {
                if (key !== "_and" && key !== "_or" && key !== "_not") {
                    const parsed = identifierSchema.safeParse(key);
                    if (!parsed.success) {
                        ctx.addIssue({ code: "custom", path: [key], message: "Invalid field name" });
                    }
                }
            }
        }),
);

const dataRowSchema = z.record(identifierSchema, dataValueSchema)
    .refine((row) => Object.keys(row).length > 0, "Data must contain at least one field");

const readQuerySchema = z.strictObject({
    action: z.literal("read"),
    table: identifierSchema,
    select: z.array(identifierSchema).min(1).max(MAX_ARRAY_ITEMS),
    where: whereSchema.optional(),
    joins: z.array(z.strictObject({
        table: identifierSchema,
        alias: identifierSchema.optional(),
        type: z.enum(["LEFT", "RIGHT", "INNER"]).optional(),
        on: z.record(identifierSchema, identifierSchema)
            .refine((on) => Object.keys(on).length > 0, "JOIN needs an ON condition"),
    })).max(5).optional(),
    sort: z.array(z.strictObject({
        field: identifierSchema,
        direction: z.enum(["asc", "desc", "ASC", "DESC"]),
    })).max(10).optional(),
    limit: z.number().int().min(1).max(500).optional(),
    offset: z.number().int().min(0).max(1_000_000).optional(),
}).refine(
    (query) => query.offset === undefined || query.limit !== undefined,
    "OFFSET requires LIMIT",
);

const createQuerySchema = z.strictObject({
    action: z.literal("create"),
    table: identifierSchema,
    data: z.union([
        dataRowSchema,
        z.array(dataRowSchema).min(1).max(MAX_ARRAY_ITEMS).superRefine((rows, ctx) => {
            if (rows.length < 2) return;
            const columns = Object.keys(rows[0]).sort().join("\0");
            for (let i = 1; i < rows.length; i++) {
                if (Object.keys(rows[i]).sort().join("\0") !== columns) {
                    ctx.addIssue({
                        code: "custom",
                        path: [i],
                        message: "All inserted rows must have the same fields",
                    });
                }
            }
        }),
    ]),
});

const updateQuerySchema = z.strictObject({
    action: z.literal("update"),
    table: identifierSchema,
    data: dataRowSchema,
    where: whereSchema,
});

const deleteQuerySchema = z.strictObject({
    action: z.literal("delete"),
    table: identifierSchema,
    where: whereSchema,
});

export const queryEngineSchema = jsonInputSchema.pipe(z.discriminatedUnion("action", [
    readQuerySchema,
    createQuerySchema,
    updateQuerySchema,
    deleteQuerySchema,
]));

export function parseUnifiedQuery(input: unknown): UnifiedQuery {
    return queryEngineSchema.parse(input);
}
