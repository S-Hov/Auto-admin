import { describe, expect, it } from "vitest";
import { mockMenuItems } from "../../../shared/api/menu/menu.mock";
import { buildEditorTree } from "./build-editor-tree";
import { buildEditorGraph } from "./build-editor-graph";

describe("buildEditorGraph", () => {
    it("keeps a virtual root for an empty menu", () => {
        const graph = buildEditorGraph(buildEditorTree([]));
        expect(graph.nodes.map((node) => node.id)).toEqual(["virtual-root"]);
        expect(graph.edges).toEqual([]);
        expect(Number.isFinite(graph.nodes[0].position.x)).toBe(true);
    });

    it("preserves every parent link and places children to the right without mutating the tree", () => {
        const root = buildEditorTree(mockMenuItems);
        const before = structuredClone(root);
        const graph = buildEditorGraph(root);
        const byId = new Map(graph.nodes.map((node) => [node.id, node]));
        expect(graph.nodes).toHaveLength(mockMenuItems.length + 1);
        expect(graph.edges).toHaveLength(mockMenuItems.length);
        for (const item of mockMenuItems) {
            const parentId = String(item.parentId ?? "virtual-root");
            expect(graph.edges).toContainEqual(expect.objectContaining({ source: parentId, target: String(item.id) }));
            expect(byId.get(String(item.id))!.position.x).toBeGreaterThan(byId.get(parentId)!.position.x);
        }
        expect(root).toEqual(before);
    });

    it("retains disabled items on the board", () => {
        const graph = buildEditorGraph(buildEditorTree([{ ...mockMenuItems[0], isActive: false }]));
        expect(graph.nodes.find((node) => node.id === String(mockMenuItems[0].id))?.data.isActive).toBe(false);
    });
});
