import { createBrowserRouter } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import AdminLayout from './layouts/AdminLayout'
import AuthLayout from './layouts/AuthLayout'
import InstallLayout from './layouts/InstallLayout'

// Ленивая загрузка страниц для оптимизации сборки
const InstallPage = lazy(() => import('../../pages/install/installPage'))
const HomePage = lazy(() => import('../../pages/home/homePage'))
const NotFoundPage = lazy(() => import('../../pages/notFound/notFoundPage'))

// Вспомогательный компонент для отображения загрузки (Spinner/Skeleton)
const PageLoader = (component: React.ReactNode) => (
  <Suspense fallback={<div>Загрузка страницы...</div>}>
    {component}
  </Suspense>
)

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AdminLayout />,
    errorElement: PageLoader(<NotFoundPage />), // Глобальная обработка 404 и ошибок
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
    errorElement: PageLoader(<NotFoundPage />),
    children: [
      // {
      //   path: 'login',=
      //   element: PageLoader(<LoginPage />),
      // },
      // {
      //   path: 'register',=
      //   element: PageLoader(<RegisterPage />),
      // },
    ],
  },
  {
    path: '/install',
    element: <InstallLayout />,
    errorElement: PageLoader(<NotFoundPage />),
    children: [
      {
        index: true,
        element: PageLoader(<InstallPage />),
      }
    ],
  }
])
