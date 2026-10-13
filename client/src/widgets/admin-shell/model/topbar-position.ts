export interface AnchorRect { left: number; right: number; top: number; bottom: number }

export function getTopbarPosition(rect: AnchorRect, width: number, height: number) {
    const margin = 12;
    const panelWidth = Math.min(380, Math.max(0, width - margin * 2));
    const below = Math.max(0, height - rect.bottom - margin - 8);
    const above = Math.max(0, rect.top - margin - 8);
    const openAbove = below < 200 && above > below;
    const maxHeight = Math.min(520, openAbove ? above : below);
    return {
        left: Math.max(margin, Math.min(rect.left, width - margin - panelWidth)),
        top: openAbove ? undefined : Math.max(margin, rect.bottom + 8),
        bottom: openAbove ? Math.max(margin, height - rect.top + 8) : undefined,
        width: panelWidth,
        maxHeight,
    };
}
