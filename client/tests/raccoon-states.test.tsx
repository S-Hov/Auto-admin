import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeAll, describe, expect, it } from 'vitest';
import { AuthContext, type AuthContextValue } from '../src/app/providers/auth/AuthContext';
import { BootstrapContext, type BootstrapState } from '../src/app/providers/bootstrap/BootstrapContext';
import { AppGate } from '../src/app/routing/guards/AppGate';
import MenuEditorPage from '../src/pages/menuEditor/menuEditorPage';
import NotFoundPage from '../src/pages/notFound/notFoundPage';
import PageEditorPage from '../src/pages/pageEditor/PageEditorPage';
import i18n from '../src/shared/i18n';

const noop = async () => {};
const auth = { user: null, status: 'checking', refreshAuth: noop, logout: noop } satisfies AuthContextValue;

beforeAll(async () => {
    await i18n.changeLanguage('ru');
});

describe('raccoon illustrations on status screens', () => {
    const bootstrapCases = [
        [{ status: 'error', stage: null }, 'working', 'Не удалось проверить статус запуска'],
        [{ status: 'resolved', stage: 'database_unavailable' }, 'repairing', 'База данных недоступна'],
        [{ status: 'resolved', stage: 'system_error' }, 'sad', 'Произошла системная ошибка'],
    ] as const satisfies readonly (readonly [BootstrapState, string, string])[];

    it.each(bootstrapCases)('matches bootstrap state %j to the correct pose', (state, variant, title) => {
        const html = renderToStaticMarkup(
            <MemoryRouter initialEntries={['/ru']}>
                <Routes>
                    <Route path="/:locale" element={
                        <BootstrapContext.Provider value={{ state, refreshBootstrap: noop }}>
                            <AuthContext.Provider value={auth}><AppGate /></AuthContext.Provider>
                        </BootstrapContext.Provider>
                    } />
                </Routes>
            </MemoryRouter>,
        );

        expect(html).toContain(`raccoon-${variant}.png`);
        expect(html).toContain(title);
        expect(html).toContain('Проверить повторно');
    });

    it.each([MenuEditorPage, PageEditorPage])('shows an illustrated access denial for a read-only account (%s)', Editor => {
        const html = renderToStaticMarkup(
            <MemoryRouter initialEntries={['/ru/editor']}>
                <Routes>
                    <Route path="/:locale/editor" element={
                        <AuthContext.Provider value={{
                            ...auth,
                            status: 'authenticated',
                            user: { userId: 1, username: 'reader', roleId: 1, roleKey: 'admin', rights: 'read_only', expiresAt: '2030-01-01T00:00:00.000Z' },
                        }}>
                            <Editor />
                        </AuthContext.Provider>
                    } />
                </Routes>
            </MemoryRouter>,
        );

        expect(html).toContain('raccoon-forbidden.png');
        expect(html).toContain('Доступ запрещён');
        expect(html).toContain('href="/ru"');
    });

    it('shows the 404 pose and a link to the current locale home', () => {
        const html = renderToStaticMarkup(
            <MemoryRouter initialEntries={['/ru/missing']}>
                <Routes>
                    <Route path="/:locale/*" element={<NotFoundPage />} />
                </Routes>
            </MemoryRouter>,
        );

        expect(html).toContain('raccoon-confused.png');
        expect(html).toContain('404 — Страница не найдена');
        expect(html).toContain('href="/ru"');
    });
});
