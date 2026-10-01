import type { UnifiedQuery } from "../types/query.types";
import type { PipelineExecutionContext } from "./pipeline.types";
import { parseContextReference } from "./pipeline.references";
import { invalidQuery } from "../query-engine.errors";

export class ContextResolver {
    static escapeIdentifier(identifier: string): string[] {
        if (identifier.includes(".")) {
            return identifier
                .split(".")
                .map((part) => `\`${part.replace(/`/g, "")}\``);
        }
        return [identifier];
    }

    static resolvePath(
        context: PipelineExecutionContext,
        path: string,
    ): unknown {
        const parts = parseContextReference(path);
        if (!parts) return path;
        let current: unknown = context;

        for (const part of parts) {
            if (
                current === null ||
                typeof current !== "object" ||
                !Object.hasOwn(current, part)
            ) {
                throw invalidQuery(
                    "Pipeline reference did not resolve to a value",
                );
            }
            current = (current as Record<string, unknown>)[part];
        }

        return current;
    }

    static resolveValue(
        value: unknown,
        context: PipelineExecutionContext,
    ): unknown {
        if (typeof value === "string") {
            if (ContextResolver.isContextReference(value)) {
                return ContextResolver.resolvePath(context, value);
            }
        }

        if (Array.isArray(value)) {
            return value.map((item) =>
                ContextResolver.resolveValue(item, context),
            );
        }

        if (typeof value === "object" && value !== null) {
            const resolved: Record<string, unknown> = Object.create(null);

            for (const [key, val] of Object.entries(value)) {
                resolved[key] = ContextResolver.resolveValue(val, context);
            }

            return resolved;
        }

        return value;
    }

    static isContextReference(value: string): boolean {
        return value.toLowerCase().startsWith("$steps.");
    }

    static resolveQuery<T extends UnifiedQuery>(
        query: T,
        context: PipelineExecutionContext,
    ): T {
        // Only values are dynamic; resource names, projections and JOIN structure stay fixed.
        const resolved = { ...query };
        if (resolved.action === "create" || resolved.action === "update") {
            resolved.data = ContextResolver.resolveValue(
                resolved.data,
                context,
            ) as typeof resolved.data;
        }
        if (resolved.action !== "create" && resolved.where) {
            resolved.where = ContextResolver.resolveValue(
                resolved.where,
                context,
            ) as typeof resolved.where;
        }
        return resolved;
    }
}
