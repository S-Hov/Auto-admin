import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../providers/auth/AuthContext';
import { Button } from '../../../shared/ui/Button/Button';
import { useState } from 'react';
import { toast } from 'sonner';
import type { ApiError } from '../../../shared/api/apiClient';

export default function AdminLayout() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (!user) {
    return <div>Данные пользователя не получены</div>;
  }

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);

    try {
      await toast.promise(logout(), {
        loading: 'Выполняется выход...',
        success: 'Вы успешно вышли из системы',
        error: (error: ApiError) => error.message,
      }).unwrap();
    } catch {
      // Ошибка уже показана через toast
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{ width: '250px', background: '#1e293b', color: '#fff', padding: '20px' }}>
        <h3>Auto Admin</h3>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
          <Link
            to="/"
            style={{ color: location.pathname === '/' ? '#38bdf8' : '#fff', textDecoration: 'none' }}
          >
            Панель управления
          </Link>
          <Link
            to="/users"
            style={{ color: location.pathname === '/users' ? '#38bdf8' : '#fff', textDecoration: 'none' }}
          >
            Пользователи
          </Link>
        </nav>
      </aside>

      <main style={{ flex: 1, padding: '20px', background: '#f8fafc' }}>
        <header style={{ marginBottom: '20px', paddingBottom: '10px', borderBottom: '1px solid #e2e8f0' }}>
          <span>
            Вы вошли как: <strong>{user.username}</strong>
          </span>

          <Button
            type="button"
            variant="danger"
            onClick={() => void handleLogout()}
            isLoading={isLoggingOut}
          >
            Выйти
          </Button>
        </header>
        <Outlet />
      </main>
    </div>
  )
}