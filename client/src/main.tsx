import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import { router } from './app/routing/router'

import './index.css'
import './app/styles/global.css'
import './app/styles/variables.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Toaster richColors position="top-center" closeButton />
    <RouterProvider router={router} />
  </StrictMode>,
)
