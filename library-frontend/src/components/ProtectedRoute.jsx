import { useSelector } from 'react-redux'
import { Navigate, Outlet } from 'react-router-dom'
import { selectIsAuthenticated } from '../store/authSlice.js'

export default function ProtectedRoute({ redirectTo = '/login' }) {
  const isAuthenticated = useSelector(selectIsAuthenticated)
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />
  }
  return <Outlet />
}
