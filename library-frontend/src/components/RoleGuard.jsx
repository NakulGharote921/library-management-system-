import { useSelector } from 'react-redux'
import { Navigate } from 'react-router-dom'
import { selectUserRole } from '../store/authSlice.js'

export default function RoleGuard({ roles, children }) {
  const userRole = useSelector(selectUserRole)
  if (!roles.includes(userRole)) {
    return <Navigate to="/" replace />
  }
  return children
}
