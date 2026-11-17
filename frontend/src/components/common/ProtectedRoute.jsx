import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function ProtectedRoute() {
  const { user, isLoading } = useAuth()
  if (isLoading) return <p className="route-loading" role="status">Checking your session…</p>
  return user ? <Outlet /> : <Navigate to="/login" replace />
}
