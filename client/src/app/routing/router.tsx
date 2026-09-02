import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import AdminLayout from './layouts/AdminLayout';
import AuthLayout from './layouts/AuthLayout';
import InstallLayout from './layouts/InstallLayout';
import { AppGate } from './guards/AppGate';

// Ленивая загрузка страниц для оптимизации сборки
const InstallPage = lazy(() => import('../../pages/install/installPage'));
const HomePage = lazy(() => import('../../pages/home/homePage'));
const NotFoundPage = lazy(() => import('../../pages/notFound/notFoundPage'));
const CreateAdminPage = lazy(() => import('../../pages/createAdmin/createAdminPage'));
const LoginPage = lazy(() => import('../../pages/login/loginPage'));
const RunMigrationsPage = lazy(() => import('../../pages/runMigrations/runMigrationsPage'));
const MigrationRecoveryPage = lazy(() => import('../../pages/migrationRecovery/MigrationRecoveryPage'));

// Вспомогательный компонент для отображения загрузки (Spinner/Skeleton)
const PageLoader = (component: React.ReactNode) => (
  <Suspense fallback={<div>Загрузка страницы...</div>}>
    {component}
  </Suspense>
)

const router = createBrowserRouter([
  {
    element: <AppGate />, // Проверка статуса bootstrap перед рендерингом маршрутов
    errorElement: PageLoader(<NotFoundPage />), // Глобальная обработка ошибок
    children: [
      {
        path: '/',
        element: <AdminLayout />,
        children: [
          {
            index: true,
            element: PageLoader(<HomePage />),
          },
        ],
      },
    
      {
        path: '/auth',
        element: <AuthLayout />,
        children: [
          {
            path: 'login',
            element: PageLoader(<LoginPage />),
          },
        ],
      },
      {
        path: '/install',
        element: <InstallLayout />,
        children: [
          {
            index: true,
            element: PageLoader(<InstallPage />),
          },
    
          {
            path: 'register',
            element: PageLoader(<CreateAdminPage />),
          },
          
          {
            path: 'runMigrations',
            element: PageLoader(<RunMigrationsPage />),
          },

          {
            path: 'migration-recovery',
            element: PageLoader(<MigrationRecoveryPage />),
          }
        ],
      }
    ]
  }
])

export function AppRouter() {
    return <RouterProvider router={router} />;
}