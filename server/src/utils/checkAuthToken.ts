export const HEX_64_REGEX = /^[0-9a-f]{64}$/i;

export const checkAuthToken = (token: unknown): token is string => {
    if (!token || typeof token !== 'string' || !HEX_64_REGEX.test(token)) {
        return false;
    }
    return true;
}