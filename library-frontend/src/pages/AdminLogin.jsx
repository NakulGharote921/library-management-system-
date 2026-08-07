import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowLeft, ArrowRight, Eye, EyeOff, Library, Lock, Mail, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { login, logout, clearError, selectAuth } from '../store/authSlice.js'
import { BackgroundDecor, useHomeStats } from '../components/auth/AuthShared.jsx'

const INPUT_CLASS =
  'h-12 w-full rounded-2xl border bg-white/80 pl-11 pr-4 text-sm text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 focus:ring-4 dark:bg-white/5 dark:text-white dark:placeholder:text-gray-500'

export default function AdminLogin() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { isAuthenticated, loading, error, user } = useSelector(selectAuth)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})

  const { stats, loading: statsLoading } = useHomeStats()

  useEffect(() => {
    if (error) {
      toast.error(error)
      dispatch(clearError())
    }
  }, [error, dispatch])

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'ADMIN') {
        navigate('/admin/dashboard', { replace: true })
      } else {
        toast.error('This account is not an Admin. Please use Member login.')
        dispatch(logout())
      }
    }
  }, [isAuthenticated, user, dispatch, navigate])

  const validate = () => {
    const errs = {}
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email.trim()) errs.email = 'Email is required'
    else if (!emailPattern.test(email.trim())) errs.email = 'Enter a valid email address'
    if (!password) errs.password = 'Password is required'
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return
    dispatch(login({ email: email.trim(), password }))
  }

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <BackgroundDecor />

      <div className="relative z-10 grid w-full lg:grid-cols-2">
        <div className="relative hidden items-center justify-center overflow-hidden bg-gradient-to-br from-purple-900 via-purple-700 to-primary-600 p-10 md:flex xl:p-12">
          <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 animate-pulse rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 animate-pulse rounded-full bg-sky-300/20 blur-3xl" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.12)_1px,transparent_0)] bg-[size:26px_26px]" />

          <div className="relative z-10 max-w-md xl:max-w-lg">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-white/25 backdrop-blur">
                <ShieldCheck className="h-6 w-6" />
              </span>
              <span className="text-2xl font-extrabold text-white">
                <b className="text-yellow-400">K</b>odNest Admin
              </span>
            </div>

            <h1 className="mt-8 text-3xl font-extrabold leading-tight text-white xl:text-5xl">
              Admin <span className="bg-gradient-to-r from-sky-200 to-white bg-clip-text text-transparent">Portal</span>
            </h1>
            <p className="mt-4 text-base text-purple-100/90 xl:text-lg">
              Manage books, members, circulation and generate insights — all in one place.
            </p>

            <div className="mt-10 grid max-w-md grid-cols-3 gap-3">
              {[
                { value: `${(stats?.books ?? 15000).toLocaleString()}+`, label: 'Books' },
                { value: `${(stats?.members ?? 2500).toLocaleString()}+`, label: 'Members' },
                { value: `${stats?.satisfaction ?? 98}%`, label: 'Satisfaction' },
              ].map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="rounded-2xl bg-white/10 p-4 text-center ring-1 ring-white/20 backdrop-blur"
                >
                  {statsLoading ? (
                    <div className="mx-auto h-6 w-14 animate-pulse rounded-md bg-white/20" />
                  ) : (
                    <p className="text-xl font-extrabold text-white">{s.value}</p>
                  )}
                  <p className="mt-0.5 text-xs font-medium text-purple-100">{s.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative flex items-center justify-center px-4 py-10 sm:px-8 lg:py-12">
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="w-full max-w-[460px] rounded-[28px] border border-white/50 bg-white/70 p-8 shadow-2xl shadow-purple-900/10 backdrop-blur-xl sm:p-10 dark:border-white/10 dark:bg-[#111827]/70 dark:shadow-black/30"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-primary-600 text-white shadow-lg shadow-purple-600/30">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <span className="text-2xl font-extrabold text-gray-900 dark:text-white">
                <b className="text-yellow-500">K</b>odNest
              </span>
            </div>

            <h2 className="mt-8 text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">Admin Login</h2>
            <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">Restricted access. Authorized administrators only.</p>

            <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
              <div>
                <label htmlFor="admin-email" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Admin Email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    id="admin-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (fieldErrors.email) setFieldErrors((f) => ({ ...f, email: '' }))
                    }}
                    className={`${INPUT_CLASS} ${
                      fieldErrors.email
                        ? 'border-red-400 focus:border-red-400 focus:ring-red-400/10 dark:border-red-500'
                        : 'border-gray-200 focus:border-primary-500 focus:ring-primary-500/15 dark:border-gray-700'
                    }`}
                    placeholder="admin@library.com"
                    aria-invalid={!!fieldErrors.email}
                    autoFocus
                  />
                </div>
                {fieldErrors.email && <p className="mt-1.5 text-xs font-medium text-red-500">{fieldErrors.email}</p>}
              </div>

              <div>
                <label htmlFor="admin-password" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    id="admin-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (fieldErrors.password) setFieldErrors((f) => ({ ...f, password: '' }))
                    }}
                    className={`${INPUT_CLASS} pr-12 ${
                      fieldErrors.password
                        ? 'border-red-400 focus:border-red-400 focus:ring-red-400/10 dark:border-red-500'
                        : 'border-gray-200 focus:border-primary-500 focus:ring-primary-500/15 dark:border-gray-700'
                    }`}
                    placeholder="••••••••"
                    aria-invalid={!!fieldErrors.password}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-600 dark:hover:text-gray-200"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {fieldErrors.password && <p className="mt-1.5 text-xs font-medium text-red-500">{fieldErrors.password}</p>}
              </div>

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="group flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-primary-600 text-sm font-semibold text-white shadow-lg shadow-purple-600/25 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-purple-600/30 focus:outline-none focus:ring-4 focus:ring-purple-500/25 disabled:pointer-events-none disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Admin Sign In
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-7 flex items-center justify-between text-sm">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 font-semibold text-primary-600 transition hover:text-primary-700 dark:text-primary-400"
              >
                <ArrowLeft className="h-4 w-4" />
                Member login
              </Link>
              <Link
                to="/home"
                className="inline-flex items-center gap-1.5 font-semibold text-primary-600 transition hover:text-primary-700 dark:text-primary-400"
              >
                <Library className="h-4 w-4" />
                Back to Home
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
