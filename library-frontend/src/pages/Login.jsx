import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'motion/react'
import {
  ArrowRight, Bell, BookOpen, CalendarDays, Eye, EyeOff, Library, Lock, Mail, ShieldCheck, Sparkles,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { login, clearError, selectAuth } from '../store/authSlice.js'
import { AuthHeroPanel, BackgroundDecor, SocialButtons, useHomeStats } from '../components/auth/AuthShared.jsx'

const FEATURES = [
  { icon: BookOpen, label: 'Borrow Books' },
  { icon: CalendarDays, label: 'Smart Reservations' },
  { icon: Bell, label: 'Real-time Notifications' },
  { icon: ShieldCheck, label: 'Flexible Plans' },
]

const INPUT_CLASS =
  'h-12 w-full rounded-2xl border bg-white/80 pl-11 pr-4 text-sm text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 focus:ring-4 dark:bg-white/5 dark:text-white dark:placeholder:text-gray-500'

function redirectPath(role) {
  if (role === 'ADMIN') return '/admin/dashboard'
  if (role === 'MEMBER') return '/member/dashboard'
  return '/'
}

export default function Login() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { isAuthenticated, loading, error, user } = useSelector(selectAuth)

  const [email, setEmail] = useState(() => localStorage.getItem('rememberedEmail') || '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(Boolean(localStorage.getItem('rememberedEmail')))
  const [fieldErrors, setFieldErrors] = useState({})
  const [signedIn, setSignedIn] = useState(false)

  const { stats, loading: statsLoading } = useHomeStats()
  const prevLoading = useRef(loading)

  useEffect(() => {
    if (searchParams.get('error')) {
      toast.error(searchParams.get('error') === 'google_login_failed' ? "We couldn't sign you in with Google. Please try again." : "Something went wrong while signing you in. Please try again.")
    }
  }, [searchParams])

  useEffect(() => {
    if (error) {
      toast.error(error)
      dispatch(clearError())
    }
  }, [error, dispatch])

  useEffect(() => {
    if (isAuthenticated && !signedIn) {
      navigate(redirectPath(user?.role), { replace: true })
    }
  }, [isAuthenticated, signedIn, user, navigate])

  useEffect(() => {
    if (prevLoading.current && !loading && isAuthenticated) {
      setSignedIn(true)
    }
    prevLoading.current = loading
  }, [loading, isAuthenticated])

  useEffect(() => {
    if (isAuthenticated && signedIn) {
      const timer = setTimeout(() => navigate(redirectPath(user?.role), { replace: true }), 800)
      return () => clearTimeout(timer)
    }
  }, [isAuthenticated, signedIn, user, navigate])

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
    if (remember) localStorage.setItem('rememberedEmail', email.trim())
    else localStorage.removeItem('rememberedEmail')
    dispatch(login({ email: email.trim(), password }))
  }

  const handleForgotPassword = () => {
    toast('Password reset is coming soon.', { icon: '🔐' })
  }

  const handleGithub = () => {
    toast('GitHub sign-in is not configured yet. Use Google instead.', { icon: 'ℹ️' })
  }

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <BackgroundDecor />

      <div className="relative z-10 grid w-full lg:grid-cols-2">
        <AuthHeroPanel
          title="Welcome to KodNest"
          subtitle="Borrow, Read, Learn and Grow with the smartest digital library."
          features={FEATURES}
          stats={stats}
          statsLoading={statsLoading}
        />

        {/* Right form panel */}
        <div className="relative flex items-center justify-center px-4 py-10 sm:px-8 lg:py-12">
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="w-full max-w-[460px] rounded-[28px] border border-white/50 bg-white/70 p-8 shadow-2xl shadow-primary-900/10 backdrop-blur-xl sm:p-10 dark:border-white/10 dark:bg-[#111827]/70 dark:shadow-black/30"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-600 to-sky-500 text-white shadow-lg shadow-primary-600/30">
                <Library className="h-5 w-5" />
              </span>
              <span className="text-2xl font-extrabold text-gray-900 dark:text-white">
                <b className="text-yellow-500">K</b>odNest
              </span>
            </div>

            <h2 className="mt-8 text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">Welcome Back</h2>
            <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">Sign in to continue your library journey.</p>

            <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
              <div>
                <label htmlFor="login-email" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    id="login-email"
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
                    placeholder="you@university.edu"
                    aria-invalid={!!fieldErrors.email}
                    autoFocus
                  />
                </div>
                {fieldErrors.email && <p className="mt-1.5 text-xs font-medium text-red-500">{fieldErrors.email}</p>}
              </div>

              <div>
                <label htmlFor="login-password" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    id="login-password"
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

              <div className="flex items-center justify-between">
                <label className="flex cursor-pointer select-none items-center gap-2.5 text-sm text-gray-600 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 bg-white text-primary-600 focus:ring-2 focus:ring-primary-500/30 focus:outline-none dark:border-gray-600 dark:bg-gray-800"
                  />
                  Remember me
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-sm font-semibold text-primary-600 transition hover:text-primary-700 dark:text-primary-400"
                >
                  Forgot password?
                </button>
              </div>

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="group flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary-600 to-primary-700 text-sm font-semibold text-white shadow-lg shadow-primary-600/25 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary-600/30 focus:outline-none focus:ring-4 focus:ring-primary-500/25 disabled:pointer-events-none disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
              <span className="text-xs font-medium uppercase tracking-widest text-gray-400">or</span>
              <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
            </div>

            <SocialButtons onGithub={handleGithub} />

            <p className="mt-7 text-center text-sm text-gray-500 dark:text-gray-400">
              Don&apos;t have an account?{' '}
              <Link to="/register" className="font-semibold text-primary-600 transition hover:text-primary-700 dark:text-primary-400">
                Create Account
              </Link>
            </p>
          </motion.div>
        </div>
      </div>

      {signedIn && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/90 backdrop-blur-xl dark:bg-gray-950/90"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-600 to-sky-500 text-white shadow-2xl shadow-primary-600/30">
            <Sparkles className="h-8 w-8" />
          </span>
          <div className="mt-6 h-1.5 w-40 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{ repeat: Infinity, duration: 0.8, ease: 'easeInOut' }}
              className="h-full w-full rounded-full bg-primary-600"
            />
          </div>
          <p className="mt-4 text-sm font-semibold text-gray-700 dark:text-gray-200">Signing you in...</p>
        </motion.div>
      )}
    </div>
  )
}
