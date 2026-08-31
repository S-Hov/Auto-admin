import type { UnifiedQuery } from "../types/query.types";
import type { PipelineExecutionContext } from "./pipeline.types";

export class ContextResolver {
    static escapeIdentifier(identifier: string): string[] {
        if (identifier.includes('.')) {
            return identifier
                .split('.')
                .map((part) => `\`${part.replace(/`/g, '')}\``);
        }
        return [identifier];
    }

    static resolvePath(context: PipelineExecutionContext, path: string): unknown {
        if (!ContextResolver.isContextReference(path)) {
            return path;
        }
        const parts = path.slice(1).split('.');
        let current: any = context;

        for (const part of parts) {
            current = current?.[part];
            if (current === undefined) break;
        }

        return current;
    }

    static resolveValue(value: unknown, context: PipelineExecutionContext): unknown {
        if (typeof value === 'string') {
            if (ContextResolver.isContextReference(value)) {
                return ContextResolver.resolvePath(context, value);
            }
        }

        if (Array.isArray(value)) {
            return value.map(item => ContextResolver.resolveValue(item, context));
        }

        if (typeof value === 'object' && value !== null) {
            const resolved: Record<string, unknown> = {};

            for (const [key, val] of Object.entries(value)) {
                resolved[key] = ContextResolver.resolveValue(val, context);
            }

            return resolved;
        }

        return value;
    }

    static isContextReference(value: string): boolean {
        return value.toLowerCase().startsWith('$steps.');
    }

    static resolveQuery<T extends UnifiedQuery>(query: T, context: PipelineExecutionContext): T {
        return ContextResolver.resolveValue(query, context) as T;
    }
}