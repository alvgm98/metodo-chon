import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, RequireAuth, useAuth } from './auth'
import { isSupabaseConfigured } from './lib/supabase'
import { PageLoader, ToastProvider } from './components/ui'
import { ProLayout } from './layouts/ProLayout'
import { LoginPage } from './pages/LoginPage'
import { SetupPage } from './pages/SetupPage'
import { NotFoundPage } from './pages/NotFoundPage'

const ClientsPage = lazy(() => import('./pages/ClientsPage'))
const ClientFormPage = lazy(() => import('./pages/ClientFormPage'))
const ClientDetailPage = lazy(() => import('./pages/ClientDetailPage'))
const ReportsPage = lazy(() => import('./pages/ReportsPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'))
const PortalPage = lazy(() => import('./pages/portal/PortalPage'))

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
})

function Home() {
  const { session, loading } = useAuth()
  if (loading) return <PageLoader />
  return <Navigate to={session ? '/clientes' : '/login'} replace />
}

const s = (el: ReactNode) => <Suspense fallback={<PageLoader />}>{el}</Suspense>

const router = createBrowserRouter([
  { path: '/', element: <Home /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/restablecer', element: s(<ResetPasswordPage />) },
  { path: '/p/:token', element: s(<PortalPage />) },
  {
    element: (
      <RequireAuth>
        <ProLayout />
      </RequireAuth>
    ),
    children: [
      { path: '/clientes', element: s(<ClientsPage />) },
      { path: '/clientes/nuevo', element: s(<ClientFormPage />) },
      { path: '/clientes/:id', element: s(<ClientDetailPage />) },
      { path: '/clientes/:id/editar', element: s(<ClientFormPage />) },
      { path: '/informes', element: s(<ReportsPage />) },
      { path: '/ajustes', element: s(<SettingsPage />) },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])

export function App() {
  if (!isSupabaseConfigured) return <SetupPage />
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
