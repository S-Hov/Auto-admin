import { ApiClientError } from '../../api/ApiClientError';
import type { RaccoonVariant } from '../Raccoon/Raccoon';

export function getErrorVariant(error: unknown): RaccoonVariant {
    const status = error instanceof ApiClientError ? error.status : error;
    switch (status) {
        case 401:
        case 403:
            return 'forbidden';
        case 404:
            return 'confused';
        default:
            return 'sad';
    }
}
