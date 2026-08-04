import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import { router } from './app/routing/router'

import './index.css'
import './app/styles/global.css'
import './app/styles/variables.css'
import { AuthProvider } from './app/providers/auth/AuthProvider'
import { BootstrapProvider } from './app/providers/bootstrap/BootstrapProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BootstrapProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </BootstrapProvider>
    <Toaster
        richColors
        position="top-center"
        closeButton
        offset={{ top: 16 }}
        visibleToasts={6}
    />
  </StrictMode>,
)
