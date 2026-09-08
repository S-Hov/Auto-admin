import assert from 'node:assert/strict';
import test from 'node:test';
import { isApiErrorPayload, isApiSuccessPayload } from '../src/shared/api/apiClient';

test('accepts valid success and error envelopes', () => {
    assert.equal(isApiSuccessPayload({ success: true, code: 'COMMON.OK', data: { id: 1 } }), true);
    assert.equal(isApiErrorPayload({ success: false, code: 'COMMON.BAD_REQUEST', params: { min: 1 } }), true);
});

test('rejects malformed success envelopes', () => {
    assert.equal(isApiSuccessPayload({ code: 'COMMON.OK' }), false);
    assert.equal(isApiSuccessPayload({ success: true, code: '' }), false);
    assert.equal(isApiSuccessPayload({ success: false, code: 'COMMON.OK' }), false);
});

test('rejects malformed error params', () => {
    assert.equal(isApiErrorPayload({ success: false, code: 'COMMON.BAD_REQUEST', params: null }), false);
    assert.equal(isApiErrorPayload({ success: false, code: 'COMMON.BAD_REQUEST', params: { nested: {} } }), false);
});
