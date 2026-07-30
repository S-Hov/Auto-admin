import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../providers/auth/AuthContext';

export default function AdminLayout() {
  const location = useLocation();
  const { user, status } = useAuth();


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
          {status === 'checking' && (
            <span>Проверяем сессию...</span>
          )}

          {status === 'authenticated' && user && (
            <span>
                Вы вошли как: <strong>{user.username}</strong>
                {/* ID: <strong>{user.userId}</strong>
                Роль: <strong>{user.roleKey}</strong> */}
            </span>
          )}

          {status === 'unauthenticated' && (
            <span>Сессия отсутствует</span>
          )}

          {status === 'error' && (
            <span>Не удалось проверить сессию</span>
          )}
        </header>

        <Outlet />
      </main>
    </div>
  )
}