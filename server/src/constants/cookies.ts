export const COOKIE_NAMES = {
    AUTH_SESSION: 'Auto_Admin_session',
} as const;

export type CookieName = typeof COOKIE_NAMES[keyof typeof COOKIE_NAMES];
