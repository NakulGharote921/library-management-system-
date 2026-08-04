import { useEffect } from 'react'
import { Provider, useDispatch, useSelector } from 'react-redux'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { store } from './store/index.js'
import AppLayout from './layout/AppLayout.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import { fetchMe, selectIsAuthenticated } from './store/authSlice.js'
import RoleGuard from './components/RoleGuard.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Books from './pages/Books.jsx'
import Users from './pages/Users.jsx'
import IssueBook from './pages/IssueBook.jsx'
import IssuedBooks from './pages/IssuedBooks.jsx'
import NotFound from './pages/NotFound.jsx'
import Report from './pages/Report.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import OAuthCallback from './pages/OAuthCallback.jsx'
import Categories from './pages/Categories.jsx'
import About from './pages/About.jsx'
import Reservations from './pages/Reservations.jsx'
import BorrowRequests from './pages/BorrowRequests.jsx'
import Payments from './pages/Payments.jsx'
import Profile from './pages/Profile.jsx'
import MembershipPlans from './pages/MembershipPlans.jsx'
import Subscriptions from './pages/Subscriptions.jsx'
import ReadingHistory from './pages/ReadingHistory.jsx'
import Wishlist from './pages/Wishlist.jsx'
import AuditLogs from './pages/AuditLogs.jsx'
import Analytics from './pages/Analytics.jsx'
import Settings from './pages/Settings.jsx'

function AuthInit({ children }) {
  const dispatch = useDispatch()
  const isAuthenticated = useSelector(selectIsAuthenticated)

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchMe())
    }
  }, [dispatch, isAuthenticated])

  return children
}

export default function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <AuthInit>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/oauth/callback" element={<OAuthCallback />} />

          <Route element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="books" element={<Books />} />
            <Route path="categories" element={<Categories />} />
            <Route path="about" element={<About />} />

            <Route element={<ProtectedRoute />}>
              <Route path="reading-history" element={<RoleGuard roles={['MEMBER']}><ReadingHistory /></RoleGuard>} />
              <Route path="wishlist" element={<RoleGuard roles={['MEMBER']}><Wishlist /></RoleGuard>} />
              <Route path="membership" element={<RoleGuard roles={['MEMBER']}><MembershipPlans /></RoleGuard>} />

              <Route path="members" element={<RoleGuard roles={['ADMIN']}><Users /></RoleGuard>} />

              <Route path="users" element={<RoleGuard roles={['ADMIN']}><Users /></RoleGuard>} />
              <Route path="issue" element={<RoleGuard roles={['ADMIN']}><IssueBook /></RoleGuard>} />
              <Route path="report" element={<RoleGuard roles={['ADMIN']}><Report /></RoleGuard>} />
              <Route path="history" element={<IssuedBooks />} />
              <Route path="reservations" element={<Reservations />} />
              <Route path="borrow-requests" element={<BorrowRequests />} />
              <Route path="payments" element={<Payments />} />
              <Route path="profile" element={<Profile />} />
              <Route path="subscriptions" element={<Subscriptions />} />
              <Route path="analytics" element={<RoleGuard roles={['ADMIN']}><Analytics /></RoleGuard>} />
              <Route path="audit-logs" element={<RoleGuard roles={['ADMIN']}><AuditLogs /></RoleGuard>} />
              <Route path="settings" element={<RoleGuard roles={['ADMIN']}><Settings /></RoleGuard>} />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
        </AuthInit>
      </BrowserRouter>
    </Provider>
  )
}
