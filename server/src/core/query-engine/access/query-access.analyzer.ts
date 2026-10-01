import type { CachedSchemaCatalog } from "../../schema-catalog";
import type {
    StoredField,
    StoredResource,
} from "../../schema-catalog/types/schema-catalog.types";
import type {
    FieldUsage,
    QueryAccessRequirements,
} from "../../access-control/contracts/query-access.types";
import type {
    FieldPermissionAction,
    ResourcePermissionAction,
} from "../../access-control/contracts/permission.types";
import type { UnifiedQuery, WhereClause } from "../types/query.types";
import { invalidQueryReference } from "../query-engine.errors";
import { DEFAULT_READ_ROWS } from "../schema/query.schema";

type Binding = { resource: Readonly<StoredResource>; qualifier: string };

export interface AnalyzedQuery {
    readonly query: UnifiedQuery;
    readonly requirements: QueryAccessRequirements;
}

/** Pure analysis: canonical SQL identifiers and a complete list of required permissions. */
export function analyzeQueryAccess(
    query: UnifiedQuery,
    catalog: CachedSchemaCatalog,
): AnalyzedQuery {
    const resourceNeeds = new Map<
        string,
        QueryAccessRequirements["resources"][number]
    >();
    const fieldNeeds = new Map<
        string,
        QueryAccessRequirements["fields"][number]
    >();
    const bindings: Binding[] = [];
    const canonicalTable = (resource: Readonly<StoredResource>) =>
        `${resource.schemaName}.${resource.tableName}`;

    function findResource(name: string): Readonly<StoredResource> {
        const matches = catalog.resources.filter(
            (resource) =>
                resource.schemaName === catalog.schemaName &&
                (name === resource.tableName ||
                    name === canonicalTable(resource)),
        );
        if (
            matches.length !== 1 ||
            matches[0].state !== "present" ||
            /[.`\0]/.test(matches[0].tableName) ||
            /[.`\0]/.test(matches[0].schemaName)
        ) {
            throw invalidQueryReference(
                `Unknown or unsupported resource: ${name}`,
            );
        }
        return matches[0];
    }

    function bind(name: string, alias?: string): Binding {
        const resource = findResource(name);
        const qualifier = alias ?? resource.tableName;
        if (
            /[.`\0*]/.test(qualifier) ||
            /^\$steps\./i.test(qualifier) ||
            bindings.some(
                (binding) =>
                    binding.qualifier.toLowerCase() === qualifier.toLowerCase(),
            )
        ) {
            throw invalidQueryReference(
                `Duplicate or invalid table qualifier: ${qualifier}`,
            );
        }
        const binding = { resource, qualifier };
        bindings.push(binding);
        return binding;
    }

    function requireResource(
        resourceId: number,
        action: ResourcePermissionAction,
    ) {
        resourceNeeds.set(
            `${resourceId}:${action}`,
            Object.freeze({ resourceId, action }),
        );
    }

    function resolveField(
        reference: string,
        scope: readonly Binding[] = bindings,
    ): { binding: Binding; field: Readonly<StoredField> } {
        const parts = reference.split(".");
        let candidates: readonly Binding[];
        let name: string;
        if (parts.length === 1) {
            candidates = scope;
            name = parts[0];
        } else if (parts.length === 2) {
            candidates = scope.filter(
                (binding) => binding.qualifier === parts[0],
            );
            name = parts[1];
        } else if (parts.length === 3 && parts[0] === catalog.schemaName) {
            candidates = scope.filter(
                (binding) =>
                    binding.qualifier === binding.resource.tableName &&
                    binding.resource.tableName === parts[1],
            );
            name = parts[2];
        } else {
            throw invalidQueryReference(
                `Invalid field reference: ${reference}`,
            );
        }
        const matches = candidates.flatMap((binding) =>
            catalog.fields
                .filter(
                    (field) =>
                        field.resourceId === binding.resource.id &&
                        field.state === "present" &&
                        field.name === name,
                )
                .map((field) => ({ binding, field })),
        );
        if (matches.length !== 1 || /[.`\0*]/.test(name)) {
            throw invalidQueryReference(
                `Unknown or ambiguous field: ${reference}`,
            );
        }
        return matches[0];
    }

    function field(
        reference: string,
        action: FieldPermissionAction,
        usage: FieldUsage,
        scope?: readonly Binding[],
    ): string {
        const resolved = resolveField(reference, scope);
        const resourceId = resolved.binding.resource.id;
        requireResource(resourceId, action);
        fieldNeeds.set(
            `${resourceId}:${resolved.field.id}:${action}:${usage}`,
            Object.freeze({
                resourceId,
                fieldId: resolved.field.id,
                action,
                usage,
            }),
        );
        return `${resolved.binding.qualifier}.${resolved.field.name}`;
    }

    function normalizeWhere(where: WhereClause): WhereClause {
        const result: WhereClause = Object.create(null);
        for (const [key, value] of Object.entries(where)) {
            if (key === "_and" || key === "_or")
                result[key] = (value as WhereClause[]).map(normalizeWhere);
            else if (key === "_not")
                result[key] = normalizeWhere(value as WhereClause);
            else {
                const reference = field(key, "read", "where");
                if (Object.hasOwn(result, reference))
                    throw invalidQueryReference(
                        "Duplicate normalized WHERE field",
                    );
                result[reference] = value;
            }
        }
        return result;
    }

    const primary = bind(query.table);
    requireResource(primary.resource.id, query.action);
    const table = canonicalTable(primary.resource);
    let normalized: UnifiedQuery;
    if (query.action === "read") {
        const joins = query.joins?.map((join) => {
            const joined = bind(join.table, join.alias);
            requireResource(joined.resource.id, "read");
            const scope = [...bindings];
            const on: Record<string, string> = Object.create(null);
            for (const [left, right] of Object.entries(join.on)) {
                const leftReference = field(left, "read", "join", scope);
                if (Object.hasOwn(on, leftReference))
                    throw invalidQueryReference(
                        "Duplicate normalized JOIN field",
                    );
                on[leftReference] = field(right, "read", "join", scope);
            }
            return { ...join, table: canonicalTable(joined.resource), on };
        });
        const projections = (query.select ?? ["*"]).flatMap((reference) => {
            if (reference !== "*" && !reference.endsWith(".*"))
                return [field(reference, "read", "select")];
            const qualifier = reference === "*" ? null : reference.slice(0, -2);
            const scope =
                qualifier === null
                    ? bindings
                    : bindings.filter(
                          (binding) => binding.qualifier === qualifier,
                      );
            if (scope.length === 0)
                throw invalidQueryReference(
                    `Unknown wildcard qualifier: ${reference}`,
                );
            return scope.flatMap((binding) =>
                catalog.fields
                    .filter(
                        (column) =>
                            column.resourceId === binding.resource.id &&
                            column.state === "present",
                    )
                    .sort((a, b) => a.position - b.position)
                    .map((column) =>
                        field(
                            `${binding.qualifier}.${column.name}`,
                            "read",
                            "select",
                        ),
                    ),
            );
        });
        if (projections.length === 0 || projections.length > 100)
            throw invalidQueryReference(
                "Projection must contain 1 to 100 fields",
            );
        const uniqueProjections = [...new Set(projections)];
        const outputNames = uniqueProjections.map(
            (reference) => reference.split(".").at(-1)!,
        );
        // mysql2 returns rows as objects. Duplicate labels would silently overwrite another column.
        if (
            new Set(outputNames).size !== outputNames.length ||
            outputNames.some((name) =>
                ["__proto__", "prototype", "constructor"].includes(name),
            )
        ) {
            throw invalidQueryReference(
                "Projection has duplicate or reserved output labels",
            );
        }
        normalized = {
            ...query,
            table,
            select: uniqueProjections,
            ...(joins ? { joins } : {}),
            ...(query.where ? { where: normalizeWhere(query.where) } : {}),
            ...(query.sort
                ? {
                      sort: query.sort.map((sort) => ({
                          ...sort,
                          field: field(sort.field, "read", "sort"),
                      })),
                  }
                : {}),
            limit: query.limit ?? DEFAULT_READ_ROWS,
        };
    } else if (query.action === "create" || query.action === "update") {
        const normalizeRow = (row: Record<string, unknown>) => {
            const result: Record<string, unknown> = Object.create(null);
            for (const [name, value] of Object.entries(row)) {
                const resolved = resolveField(name);
                if (resolved.field.generated.isGenerated)
                    throw invalidQueryReference(
                        `Generated field is read-only: ${name}`,
                    );
                field(name, query.action, "data");
                if (Object.hasOwn(result, resolved.field.name))
                    throw invalidQueryReference(
                        `Duplicate data field: ${name}`,
                    );
                result[resolved.field.name] = value;
            }
            return result;
        };
        normalized =
            query.action === "create"
                ? {
                      ...query,
                      table,
                      data: Array.isArray(query.data)
                          ? query.data.map(normalizeRow)
                          : normalizeRow(query.data),
                  }
                : {
                      ...query,
                      table,
                      data: normalizeRow(query.data),
                      where: normalizeWhere(query.where),
                  };
    } else {
        normalized = { ...query, table, where: normalizeWhere(query.where) };
    }
    return {
        query: normalized,
        requirements: Object.freeze({
            resources: Object.freeze([...resourceNeeds.values()]),
            fields: Object.freeze([...fieldNeeds.values()]),
        }),
    };
}
