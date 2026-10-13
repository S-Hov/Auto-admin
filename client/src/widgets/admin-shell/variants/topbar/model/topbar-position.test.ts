import { describe, expect, it } from 'vitest';
import { getTopbarPosition } from './topbar-position';

describe('topbar dropdown positioning', () => {
    it('opens below a header item', () => {
        const position = getTopbarPosition({ left: 100, right: 200, top: 80, bottom: 120 }, 1200, 800);
        expect(position.left).toBe(100);
        expect(position.top).toBe(128);
        expect(position.bottom).toBeUndefined();
        expect(position.maxHeight).toBe(520);
    });
    it('keeps the panel away from the right edge', () => {
        const position = getTopbarPosition({ left: 1150, right: 1190, top: 80, bottom: 120 }, 1200, 800);
        expect(position.left + position.width).toBe(1188);
    });
    it('fits the width of a phone', () => {
        const position = getTopbarPosition({ left: 10, right: 150, top: 70, bottom: 110 }, 320, 600);
        expect(position.left).toBe(12);
        expect(position.width).toBe(296);
    });
    it('opens above when there is not enough room below', () => {
        const position = getTopbarPosition({ left: 200, right: 300, top: 650, bottom: 690 }, 1200, 720);
        expect(position.top).toBeUndefined();
        expect(position.bottom).toBe(78);
        expect(position.maxHeight).toBeLessThanOrEqual(630);
    });
});
