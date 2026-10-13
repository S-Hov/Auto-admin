import { expect, it, vi } from 'vitest';
import { applyFieldErrors } from '../src/shared/api/apply-field-errors';
import { ApiClientError } from '../src/shared/api/ApiClientError';

vi.mock('../src/shared/i18n/api-message', () => ({ apiMessage: ({ code }: { code: string }) => code }));

it('applies validated field errors only to allowed form fields', () => {
    const setError = vi.fn();
    const error = new ApiClientError({ success: false, code: 'COMMON.BAD_REQUEST', details: [
        { field: 'name', code: 'REQUIRED', params: { min: 1 } },
        { field: 'password', code: 'REQUIRED' },
    ] }, 400);
    expect(applyFieldErrors<{ name: string; password: string }>(error, setError, ['name'])).toBe(true);
    expect(setError).toHaveBeenCalledExactlyOnceWith('name', { type: 'server', message: 'REQUIRED' });
});

it.each([null, [{ field: 'name' }], [{ field: 'name', code: 'REQUIRED', params: { min: {} } }]])('ignores invalid field error details %j', (details) => {
    const setError = vi.fn();
    const error = new ApiClientError({ success: false, code: 'COMMON.BAD_REQUEST', details }, 400);
    expect(applyFieldErrors(error, setError)).toBe(false);
    expect(setError).not.toHaveBeenCalled();
});
