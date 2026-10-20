import type { NodeChange } from '@xyflow/react';
import type { MenuBoardNode } from './menu-editor-graph.types';

export type NodeMeasurements = Record<string, { width: number; height: number }>;

export function updateNodeMeasurements(
    previous: NodeMeasurements,
    changes: readonly NodeChange<MenuBoardNode>[],
): NodeMeasurements {
    let next: NodeMeasurements | null = null;

    for (const change of changes) {
        if (change.type !== 'dimensions' || !change.dimensions) continue;
        const { width, height } = change.dimensions;
        const current = (next ?? previous)[change.id];
        if (current?.width === width && current.height === height) continue;

        // Копируем справочник только при первом реальном изменении размеров.
        next ??= { ...previous };
        next[change.id] = { width, height };
    }

    return next ?? previous;
}
