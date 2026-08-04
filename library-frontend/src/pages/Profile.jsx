import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Crown, BookOpen, Calendar, Shield, RefreshCw, AlertCircle } from 'lucide-react'
import { selectUser, selectUserRole } from '../store/authSlice.js'
import Button from '../components/Button.jsx'
import { issuedBookService, userSubscriptionService } from '../services/api.js'

export default function Profile() {
  const navigate = useNavigate()
  const user = useSelector(selectUser)
  const role = useSelector(selectUserRole)
  const [activeSub, setActiveSub] = useState(null)
  const [myLoans, setMyLoans] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [sub, loans] = await Promise.all([
        userSubscriptionService.getActive().catch(() => null),
        role === 'MEMBER' ? issuedBookService.getMyBooks().catch(() => []) : Promise.resolve([]),
      ])
      setActiveSub(sub || null)
      setMyLoans(loans)
    } catch (e) {
    } finally {
      setLoading(false)
    }
  }, [role])

  useEffect(() => { load() }, [load])

  const activeLoans = myLoans.filter((l) => l.status === 'ISSUED')
  const daysLeft = activeSub
    ? Math.max(0, Math.ceil((new Date(activeSub.endDate) - new Date()) / (1000 * 60 * 60 * 24)))
    : 0

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">My Profile</h1>
          <p className="text-sm text-gray-500">Your account details and membership</p>
        </div>
        <Button variant="secondary" size="sm" type="button" icon={RefreshCw} onClick={load} loading={loading}>
          Refresh
        </Button>
      </div>

      {/* User Info Card */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 text-2xl font-bold text-white">
            {user?.name?.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase() || '?'}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-50">{user?.name}</h2>
            <span className="inline-flex items-center rounded-full bg-primary-100 px-3 py-0.5 text-xs font-semibold text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
              {role}
            </span>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Email</p>
            <p className="mt-1 text-sm text-gray-900 dark:text-gray-50">{user?.email || '—'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Role</p>
            <p className="mt-1 text-sm text-gray-900 dark:text-gray-50">{role || '—'}</p>
          </div>
        </div>
      </div>

      {/* Active Membership Card */}
      {role === 'MEMBER' && (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-gray-50">
            <Crown className="h-4 w-4 text-amber-500" /> Current Plan
          </h3>

          {activeSub ? (
            <div className="mt-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-md">
                  <Crown className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-50">{activeSub.plan?.name || 'Active'} Membership</p>
                  <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                    {activeSub.status === 'ACTIVE' ? 'Active' : activeSub.status === 'EXPIRING' ? 'Expiring Soon' : activeSub.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 rounded-xl bg-gray-50 p-4 dark:bg-gray-800/50">
                <div>
                  <p className="text-xs text-gray-500">Purchased On</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                    {new Date(activeSub.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Expires On</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                    {new Date(activeSub.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Books Allowed</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">{activeSub.plan?.maxBooks || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Books Borrowed</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                    {activeLoans.length} / {activeSub.plan?.maxBooks || 0}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400">
                    {daysLeft > 0 ? `${daysLeft} days remaining` : 'Expired'}
                  </span>
                </div>
                <Button variant="secondary" size="sm" type="button" icon={RefreshCw} onClick={() => navigate('/membership')}>
                  Renew Membership
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex flex-col items-center rounded-xl border border-dashed border-gray-200 bg-gray-50 py-6 dark:border-gray-700 dark:bg-gray-800/50">
              <AlertCircle className="h-8 w-8 text-gray-300" />
              <p className="mt-2 text-sm font-semibold text-gray-600 dark:text-gray-400">No active membership</p>
              <p className="text-xs text-gray-400">Purchase a plan to start borrowing books</p>
              <Button className="mt-4" variant="primary" size="sm" type="button" icon={Crown} onClick={() => navigate('/membership')}>
                View Plans
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      {role === 'MEMBER' && (
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" icon={BookOpen} onClick={() => navigate('/books')}>
            Browse Books
          </Button>
          <Button variant="secondary" icon={Shield} onClick={() => navigate('/membership')}>
            Membership Plans
          </Button>
        </div>
      )}
    </div>
  )
}