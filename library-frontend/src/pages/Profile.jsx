import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import {
  Crown, BookOpen, Shield, Mail, Timer, AlertCircle, RefreshCw,
} from 'lucide-react'
import { selectUser, selectUserRole } from '../store/authSlice.js'
import { userSubscriptionService } from '../services/api.js'

export default function Profile() {
  const navigate = useNavigate()
  const user = useSelector(selectUser)
  const role = useSelector(selectUserRole)
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    if (role !== 'MEMBER') return
    let cancelled = false
    userSubscriptionService.getSummary()
      .then((data) => { if (!cancelled) setSummary(data) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [role])

  const allowed = summary?.allowedBooks ?? 0
  const borrowed = summary?.borrowedBooks ?? 0
  const progress = allowed > 0 ? Math.min(100, (borrowed / allowed) * 100) : 0
  const daysLeft = summary?.daysRemaining ?? 0
  const statusLabel =
    summary?.status === 'ACTIVE'
      ? 'Active'
      : summary?.status === 'EXPIRING'
        ? 'Expiring'
        : summary?.status || ''

  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      {/* Profile banner */}
      <div className="relative flex h-64 w-full flex-col justify-end overflow-hidden rounded-3xl shadow-sm sm:h-72 lg:h-80">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-700 via-primary-800 to-indigo-950" />
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary-500/20 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="relative z-10 flex items-center gap-4 p-6 sm:gap-6 sm:p-8">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-primary-600 text-3xl font-bold text-white shadow-lg ring-4 ring-white/20 sm:h-28 sm:w-28 sm:text-4xl lg:h-32 lg:w-32">
            {user?.name?.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase() || '?'}
          </div>
          <div className="flex min-w-0 flex-col gap-2 text-white">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="truncate text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                {user?.name || 'Member'}
              </h1>
              <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-950">
                {role || 'Guest'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium text-white/85 sm:text-base">
              <span className="flex min-w-0 items-center gap-2">
                <Mail className="h-4 w-4 shrink-0" />
                <span className="truncate">{user?.email || '—'}</span>
              </span>
              <span className="hidden h-1 w-1 rounded-full bg-white/50 sm:block" />
              <span className="flex items-center gap-2">
                <Shield className="h-4 w-4 shrink-0" />
                {role === 'ADMIN' ? 'Admin Role' : 'Member Role'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Current Plan */}
        <div className="col-span-12 flex flex-col gap-6 lg:col-span-8">
          {role === 'MEMBER' && (
            <div className="group flex flex-col gap-6 rounded-3xl bg-white p-6 shadow-sm transition-shadow duration-300 hover:shadow-md dark:bg-gray-900 dark:ring-1 dark:ring-gray-800 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 text-primary-700 dark:text-primary-300">
                  <Crown className="h-7 w-7" />
                  <h2 className="text-xl font-bold sm:text-2xl">Current Plan</h2>
                </div>
                {summary ? (
                  <span className="flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                    {statusLabel}
                  </span>
                ) : (
                  <span className="flex items-center gap-2 rounded-full bg-amber-100 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    No Plan
                  </span>
                )}
              </div>

              {summary ? (
                <>
                  <div className="flex flex-col gap-1">
                    <h3 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50 sm:text-3xl">
                      {summary.membershipName || 'Active'} Membership
                    </h3>
                    <p className="flex items-center gap-2 text-base font-semibold text-gray-500 dark:text-gray-400">
                      <Timer className="h-4 w-4 text-amber-500" />
                      {daysLeft > 0 ? `${daysLeft} days remaining` : 'Expired'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <div className="flex flex-col gap-1 rounded-2xl bg-gray-50 p-4 dark:bg-gray-800/50">
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Purchased On</span>
                      <span className="text-sm font-bold text-gray-900 dark:text-gray-50">
                        {summary.startDate ? new Date(`${summary.startDate}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 rounded-2xl bg-gray-50 p-4 dark:bg-gray-800/50">
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Expires On</span>
                      <span className="text-sm font-bold text-gray-900 dark:text-gray-50">
                        {summary.expiryDate ? new Date(`${summary.expiryDate}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 rounded-2xl bg-gray-50 p-4 dark:bg-gray-800/50">
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Books Allowed</span>
                      <span className="text-xl font-bold text-gray-900 dark:text-gray-50">{allowed}</span>
                    </div>
                    <div className="relative flex flex-col gap-1 overflow-hidden rounded-2xl bg-gray-50 p-4 dark:bg-gray-800/50">
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Borrowed</span>
                      <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                        {borrowed} / {allowed}
                      </span>
                    </div>
                  </div>

                  <div className="w-full bg-gray-200 rounded-full dark:bg-gray-700">
                    <div className="bg-emerald-500 text-xs font-medium text-white text-center p-0.5 leading-none rounded-full h-4 flex items-center justify-center" style={{ width: `${progress}%` }}>
                      {Math.round(progress)}%
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate('/membership')}
                    className="self-start flex items-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary-700 hover:shadow-lg active:scale-95"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Renew Membership
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-8 dark:border-gray-700 dark:bg-gray-800/50">
                  <AlertCircle className="h-10 w-10 text-gray-300" />
                  <p className="mt-3 text-sm font-semibold text-gray-600 dark:text-gray-400">No active membership</p>
                  <p className="text-xs text-gray-400">Purchase a plan to start borrowing books</p>
                  <button
                    type="button"
                    onClick={() => navigate('/membership')}
                    className="mt-4 flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white transition-all duration-300 hover:bg-primary-700 active:scale-95"
                  >
                    <Crown className="h-4 w-4" />
                    View Plans
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        {role === 'MEMBER' && (
          <div className="col-span-12 flex flex-col gap-4 lg:col-span-4">
            <button
              type="button"
              onClick={() => navigate('/books')}
              className="group flex flex-col items-center justify-center gap-3 rounded-3xl bg-white p-6 shadow-sm transition-colors duration-300 hover:bg-primary-600 dark:bg-gray-900 dark:ring-1 dark:ring-gray-800 dark:hover:bg-primary-600 sm:p-8"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-primary-700 transition-colors duration-300 group-hover:bg-white group-hover:text-primary-600 dark:bg-primary-900/40 dark:text-primary-300">
                <BookOpen className="h-8 w-8" />
              </div>
              <span className="text-lg font-bold text-gray-900 group-hover:text-white dark:text-gray-50">Browse Books</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/membership')}
              className="group flex flex-col items-center justify-center gap-3 rounded-3xl bg-white p-6 shadow-sm transition-colors duration-300 hover:bg-amber-500 dark:bg-gray-900 dark:ring-1 dark:ring-gray-800 dark:hover:bg-amber-500 sm:p-8"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-700 transition-colors duration-300 group-hover:bg-white group-hover:text-amber-500 dark:bg-amber-900/40 dark:text-amber-300">
                <Shield className="h-8 w-8" />
              </div>
              <span className="text-lg font-bold text-gray-900 group-hover:text-white dark:text-gray-50">Membership Plans</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
