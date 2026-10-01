import type { PipelineDefinition } from "./pipeline.types";
import { invalidQuery } from "../query-engine.errors";

const reserved = new Set(["__proto__", "prototype", "constructor"]);

export function parseContextReference(value: string): string[] | null {
    if (!/^\$steps\./i.test(value)) return null;
    if (
        !/^\$steps\.[a-zA-Z][a-zA-Z0-9_]{0,63}\.(?:insertId|affectedRows|rows\.\d+\.[^.]+)$/.test(
            value,
        )
    ) {
        throw invalidQuery("Invalid pipeline value reference");
    }
    const parts = value.slice(1).split(".");
    if (parts.some((part) => reserved.has(part)))
        throw invalidQuery("Reserved pipeline path");
    return parts;
}

export function validatePipelineReferences(
    definition: PipelineDefinition,
): void {
    const seen = new Set<string>();
    for (const step of definition.steps) {
        if (seen.has(step.id))
            throw invalidQuery(`Duplicate pipeline step: ${step.id}`);
        for (const dependency of step.dependsOn ?? []) {
            if (!seen.has(dependency))
                throw invalidQuery(
                    `Dependency must be an earlier step: ${dependency}`,
                );
        }
        function visit(value: unknown): void {
            if (typeof value === "string") {
                const parts = parseContextReference(value);
                if (parts && !seen.has(parts[1]))
                    throw invalidQuery(
                        "Reference must point to an earlier step",
                    );
            } else if (Array.isArray(value)) {
                value.forEach(visit);
            } else if (value !== null && typeof value === "object") {
                Object.values(value).forEach(visit);
            }
        }
        if (step.query.action === "create" || step.query.action === "update")
            visit(step.query.data);
        if (step.query.action !== "create") visit(step.query.where);
        seen.add(step.id);
    }
}
