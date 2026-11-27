import { StrictMode } from 'react';
import './shared/i18n';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';
import { AppRouter } from './app/routing/router';

import './index.css';
import './app/styles/global.css';
import './app/styles/variables.css';
import './app/styles/toasts.css';
import { AuthProvider } from './app/providers/auth/AuthProvider';
import { BootstrapProvider } from './app/providers/bootstrap/BootstrapProvider';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BootstrapProvider>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </BootstrapProvider>
    <Toaster
      className="app-toaster"
      position="top-center"
      closeButton
      offset={{ top: 16 }}
      visibleToasts={6}
      toastOptions={{
        classNames: {
          toast: 'app-toast',
          title: 'app-toast__title',
          description: 'app-toast__description',
          icon: 'app-toast__icon',
          closeButton: 'app-toast__close',
        },
      }}
    />
  </StrictMode>,
)
