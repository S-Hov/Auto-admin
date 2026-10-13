import { Link, NavLink } from "react-router-dom";
import { useAppLocale } from "../../../../../app/routing/locale/use-app-locale";
import { appPaths } from "../../../../../app/routing/app-paths";
import UserPanel from "../../../../user-panel/ui/UserPanel";
import type { AdminShellVariantProps, MenuNode } from "../../../model/admin-shell.types";
import { TextLoader } from '../../../../../shared/ui/Loader';
import { Button } from '../../../../../shared/ui/Button/Button';

function MenuItems({ items }: { items: MenuNode[] }) {
    const locale = useAppLocale();
    return (
        <ul style={{ listStyle: 'none', paddingLeft: 12 }}>
            {items.map((item) => (
                <li key={item.id} style={{ marginTop: 10 }}>
                    {item.children.length > 0 ? (
                        <details open>
                            <summary>{item.name}</summary>
                            <MenuItems items={item.children} />
                        </details>
                    ) : (
                        <NavLink
                            to={`/${locale}/pages/${encodeURIComponent(item.slug)}`}
                            style={({ isActive }) => ({ color: isActive ? '#38bdf8' : 'inherit', textDecoration: 'none' })}
                        >
                            {item.name}
                        </NavLink>
                    )}
                </li>
            ))}
        </ul>
    );
}

const SideBarLayout = ({ children, menuState, onRetryMenu }: AdminShellVariantProps) => {
    const locale = useAppLocale();
    const paths = {
        home: appPaths.home(locale),
    };

    return (
        <div className="admin-shell">
            <aside>
                <h3>Auto Admin</h3>
                <nav aria-label="Основное меню" aria-busy={menuState.status === 'loading'}>
                    <Link
                        to={paths.home}
                        style={{
                            color: 'inherit',
                            textDecoration: "none",
                        }}
                    >
                        Панель управления
                    </Link>
                    {menuState.status === 'loading' && <TextLoader label="Загрузка меню" />}
                    {menuState.status === 'error' && (
                        <div role="alert">
                            <p>{menuState.message}</p>
                            <Button type="button" onClick={onRetryMenu}>Повторить</Button>
                        </div>
                    )}
                    {menuState.status === 'ready' && (
                        menuState.items.length > 0
                            ? <MenuItems items={menuState.items} />
                            : <p>Нет доступных разделов</p>
                    )}
                </nav>
            </aside>

            <main>
                <UserPanel />
                {children}
            </main>
        </div>
    );
};

export default SideBarLayout;
