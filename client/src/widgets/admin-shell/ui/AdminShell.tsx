import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { appPaths } from "../../../app/routing/app-paths";
import { useAppLocale } from "../../../app/routing/locale/use-app-locale";

import './AdminShell.css'
import UserPanel from "../../user-panel/ui/UserPanel";

interface AdminShellProps {
    children: ReactNode
}

const AdminShell = ({children}: AdminShellProps) => {
    const locale = useAppLocale();
      const paths = {
        home: appPaths.home(locale),
        users: appPaths.users(locale),
      };

  return (
    <div className="admin-sHell">
      <aside>
        <h3>Auto Admin</h3>
        <nav>
          <Link
            to={paths.home}
            style={{ color: location.pathname === paths.home ? '#38bdf8' : '#fff', textDecoration: 'none' }}
          >
            Панель управления
          </Link>
          <Link
            to={paths.users}
            style={{ color: location.pathname === paths.users ? '#38bdf8' : '#fff', textDecoration: 'none' }}
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
  )
};

export default AdminShell;
