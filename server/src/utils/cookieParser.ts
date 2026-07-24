type Cookies = Record<string, string>;

export function cookieParser(cookieHeader: string | undefined): Cookies {
    const cookies: Cookies = {};

    if (!cookieHeader) {
        return cookies;
    }

    const pairs = cookieHeader.split(';');

    for (const pair of pairs) {
        const index = pair.indexOf('=');
        if (index === -1) continue;

        const key = pair.substring(0, index).trim();
        let val = pair.substring(index + 1).trim();

        try {
            val = decodeURIComponent(val);
        } catch {
            // Игнорируем ошибки декодирования
        }

        cookies[key] = val;
    }

    return cookies;
}
