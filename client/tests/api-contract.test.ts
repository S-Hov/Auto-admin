import { expect, it } from 'vitest';
import { isApiErrorPayload, isApiSuccessPayload } from '../src/shared/api/apiClient';

it('accepts valid success and error envelopes', () => {
    expect(isApiSuccessPayload({ success: true, code: 'COMMON.OK', data: { id: 1 } })).toBe(true);
    expect(isApiErrorPayload({ success: false, code: 'COMMON.BAD_REQUEST', params: { min: 1 } })).toBe(true);
});

it('rejects malformed success envelopes', () => {
    expect(isApiSuccessPayload({ code: 'COMMON.OK' })).toBe(false);
    expect(isApiSuccessPayload({ success: true, code: '' })).toBe(false);
    expect(isApiSuccessPayload({ success: false, code: 'COMMON.OK' })).toBe(false);
});

it('rejects malformed error params', () => {
    expect(isApiErrorPayload({ success: false, code: 'COMMON.BAD_REQUEST', params: null })).toBe(false);
    expect(isApiErrorPayload({ success: false, code: 'COMMON.BAD_REQUEST', params: { nested: {} } })).toBe(false);
});
