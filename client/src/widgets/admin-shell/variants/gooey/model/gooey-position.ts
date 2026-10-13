export interface Point { x: number; y: number }
export interface Viewport { width: number; height: number; left?: number; top?: number }

export function getGooeyPosition(anchor: Point, viewport: Viewport) {
    const margin = 12;
    const width = Math.min(420, Math.max(0, viewport.width - margin * 2));
    const height = Math.min(460, Math.max(0, viewport.height - margin * 2));
    const leftEdge = (viewport.left ?? 0) + margin;
    const topEdge = (viewport.top ?? 0) + margin;
    const left = Math.max(leftEdge, Math.min(anchor.x - width / 2, leftEdge + viewport.width - margin * 2 - width));
    const top = Math.max(topEdge, Math.min(anchor.y - height / 2, topEdge + viewport.height - margin * 2 - height));
    return {
        left, top, width, height,
        radius: Math.max(0, Math.min(116, (width - 112) / 2, (height - 230) / 2)),
        compact: width < 320 || height < 380,
    };
}

export function getOrbitPoint(index: number, count: number, radius: number): Point {
    const angle = -Math.PI / 2 + index * (Math.PI * 2 / Math.max(1, count));
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}
