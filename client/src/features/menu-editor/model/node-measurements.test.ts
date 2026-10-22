import { describe, expect, it } from 'vitest';
import { updateNodeMeasurements } from './node-measurements';

describe('menu board node measurements', () => {
    it('stores dimensions reported by React Flow without mutating previous state', () => {
        const previous = { '1': { width: 160, height: 136 } };
        const next = updateNodeMeasurements(previous, [
            { id: '2', type: 'dimensions', dimensions: { width: 160, height: 136 } },
        ]);
        expect(next).toEqual({ ...previous, '2': { width: 160, height: 136 } });
        expect(previous).not.toHaveProperty('2');
    });
    it('keeps the state reference for repeated measurements', () => {
        const previous = { '1': { width: 160, height: 136 } };
        expect(updateNodeMeasurements(previous, [
            { id: '1', type: 'dimensions', dimensions: { width: 160, height: 136 } },
        ])).toBe(previous);
    });
    it('retains dimensions throughout drag and selection changes', () => {
        const previous = { '1': { width: 160, height: 136 } };
        expect(updateNodeMeasurements(previous, [
            { id: '1', type: 'position', position: { x: 500, y: 200 }, dragging: true },
            { id: '1', type: 'select', selected: true },
            { id: '1', type: 'position', position: { x: 100, y: 100 }, dragging: false },
        ])).toBe(previous);
    });
    it('updates multiple nodes and retains unaffected measurements', () => {
        const previous = { '1': { width: 160, height: 136 } };
        const next = updateNodeMeasurements(previous, [
            { id: '2', type: 'dimensions', dimensions: { width: 180, height: 140 } },
            { id: '3', type: 'dimensions', dimensions: { width: 160, height: 136 } },
            { id: '2', type: 'dimensions', dimensions: { width: 200, height: 150 } },
        ]);
        expect(next['1']).toBe(previous['1']);
        expect(next['2']).toEqual({ width: 200, height: 150 });
        expect(next['3']).toEqual({ width: 160, height: 136 });
    });
    it('ignores dimension events without sizes', () => {
        const previous = {};
        expect(updateNodeMeasurements(previous, [{ id: '1', type: 'dimensions' }])).toBe(previous);
    });
});
