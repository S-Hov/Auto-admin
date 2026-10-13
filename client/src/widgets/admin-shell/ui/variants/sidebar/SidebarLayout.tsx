import { Link, useLocation } from "react-router-dom";
import { useAppLocale } from "../../../../../app/routing/locale/use-app-locale";
import { appPaths } from "../../../../../app/routing/app-paths";
import UserPanel from "../../../../user-panel/ui/UserPanel";
import type { ReactNode } from "react";

interface SideBarLayoutProps {
    children: ReactNode;
}

const SideBarLayout = ({ children }: SideBarLayoutProps) => {
    const locale = useAppLocale();
    const paths = {
        home: appPaths.home(locale),
        users: appPaths.users(locale),
    };
    const location = useLocation();

    return (
        <div className="admin-shell">
            <aside>
                <h3>Auto Admin</h3>
                <nav>
                    <Link
                        to={paths.home}
                        style={{
                            color:
                                location.pathname === paths.home
                                    ? "#38bdf8"
                                    : "#fff",
                            textDecoration: "none",
                        }}
                    >
                        Панель управления
                    </Link>
                    <Link
                        to={paths.users}
                        style={{
                            color:
                                location.pathname === paths.users
                                    ? "#38bdf8"
                                    : "#fff",
                            textDecoration: "none",
                        }}
                    >
                        Пользователи
                    </Link>
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
