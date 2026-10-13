import { describe, expect, it } from 'vitest';
import { getGooeyPosition, getOrbitPoint } from './gooey-position';

describe('gooey menu positioning', () => {
    it.each([{ x: 0, y: 0 }, { x: 1440, y: 900 }, { x: 720, y: 450 }])('keeps the complete panel inside the viewport at $x,$y', (anchor) => {
        const box = getGooeyPosition(anchor, { width: 1440, height: 900 });
        expect(box.left).toBeGreaterThanOrEqual(12);
        expect(box.top).toBeGreaterThanOrEqual(12);
        expect(box.left + box.width).toBeLessThanOrEqual(1428);
        expect(box.top + box.height).toBeLessThanOrEqual(888);
    });
    it('uses a compact list for a narrow screen', () => {
        const box = getGooeyPosition({ x: 310, y: 600 }, { width: 320, height: 640 });
        expect(box.compact).toBe(true);
        expect(box.left + box.width).toBeLessThanOrEqual(308);
    });
    it('accounts for the visual viewport offset', () => {
        const box = getGooeyPosition({ x: 0, y: 0 }, { width: 400, height: 600, left: 100, top: 200 });
        expect(box.left).toBe(112);
        expect(box.top).toBe(212);
    });
    it('keeps all six circles and labels within the panel', () => {
        const box = getGooeyPosition({ x: 180, y: 200 }, { width: 360, height: 420 });
        for (let i = 0; i < 6; i++) {
            const point = getOrbitPoint(i, 6, box.radius);
            expect(box.width / 2 + point.x - 49).toBeGreaterThanOrEqual(0);
            expect(box.width / 2 + point.x + 49).toBeLessThanOrEqual(box.width);
        }
    });
});
