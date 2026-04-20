import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { ConversationsProvider } from './contexts/ConversationsContext'
import Login from './pages/Login'
import Agent from './pages/Agent'
import Admin from './pages/Admin'
import InstallPrompt from './components/InstallPrompt'

/** Autenticado + estado de conversas persistente ao trocar entre chat e Admin (análise continua em segundo plano). */
function ProtectedLayout() {
  const { user, isLoading } = useAuth()
  if (isLoading) return <div className="loading-screen">Carregando...</div>
  if (!user) return <Navigate to="/login" replace />
  return (
    <ConversationsProvider userId={user.id}>
      <Outlet />
    </ConversationsProvider>
  )
}

function AdminPage() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'admin') return <Navigate to="/" replace />
  return <Admin />
}

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedLayout />}>
          <Route index element={<Agent />} />
          <Route path="admin" element={<AdminPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <InstallPrompt />
    </>
  )
}
