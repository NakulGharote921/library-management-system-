import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowRight, Bell, BookOpen, CalendarDays, Eye, EyeOff, Library, Lock, Mail, ShieldCheck, User } from 'lucide-react'
import toast from 'react-hot-toast'
import { register, clearError, selectAuth } from '../store/authSlice.js'
import { AuthHeroPanel, BackgroundDecor, SocialButtons, SuccessOverlay, useHomeStats } from '../components/auth/AuthShared.jsx'

const FEATURES = [
  { icon: BookOpen, label: 'Borrow Books' },
  { icon: CalendarDays, label: 'Smart Reservations' },
  { icon: Bell, label: 'Real-time Notifications' },
  { icon: ShieldCheck, label: 'Flexible Plans' },
]

function passwordStrength(pw) {
  let score = 0
  if (pw.length >= 6) score += 1
  if (pw.length >= 10) score += 1
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score += 1
  if (/\d/.test(pw)) score += 1
  if (/[^A-Za-z0-9]/.test(pw)) score += 1
  return Math.min(score, 4)
}

const STRENGTH_LABEL = ['Too short', 'Weak', 'Fair', 'Good', 'Strong']
const STRENGTH_COLOR = ['bg-red-500', 'bg-red-500', 'bg-amber-500', 'bg-lime-500', 'bg-emerald-500']
const STRENGTH_TEXT = ['text-red-500', 'text-red-500', 'text-amber-500', 'text-lime-600', 'text-emerald-500']

function FloatingField({ id, type = 'text', icon: Icon, value, onChange, error, placeholder, autoComplete, autoFocus, onRight }) {
  const [focused, setFocused] = useState(false)
  const floated = focused || value.length > 0
  return (
    <div>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input
          id={id}
          type={type}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={`h-14 w-full rounded-2xl border bg-white/80 pb-2 pl-11 pr-12 pt-5 text-sm text-gray-900 shadow-sm outline-none transition placeholder-transparent focus:ring-4 dark:bg-white/5 dark:text-white ${
            error
              ? 'border-red-400 focus:border-red-400 focus:ring-red-400/10 dark:border-red-500'
              : 'border-gray-200 focus:border-primary-500 focus:ring-primary-500/15 dark:border-gray-700'
          }`}
          aria-invalid={!!error}
        />
        <label
          htmlFor={id}
          className={`pointer-events-none absolute left-11 transition-all duration-200 ${
            floated
              ? 'top-3 translate-y-0 text-xs font-medium text-primary-600 dark:text-primary-400'
              : 'top-1/2 -translate-y-1/2 text-sm text-gray-400'
          }`}
        >
          {placeholder}
        </label>
        {onRight && onRight}
      </div>
      {error && <p className="mt-1.5 text-xs font-medium text-red-500">{error}</p>}
    </div>
  )
}

export default function Register() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { isAuthenticated, loading, error } = useSelector(selectAuth)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [created, setCreated] = useState(false)

  const { stats, loading: statsLoading } = useHomeStats()
  const prevLoading = useRef(loading)

  useEffect(() => {
    if (error) {
      toast.error(error)
      dispatch(clearError())
    }
  }, [error, dispatch])

  useEffect(() => {
    if (prevLoading.current && !loading && isAuthenticated) {
      setCreated(true)
    }
    prevLoading.current = loading
  }, [loading, isAuthenticated])

  useEffect(() => {
    if (isAuthenticated && created) {
      const timer = setTimeout(() => navigate('/login', { replace: true }), 1800)
      return () => clearTimeout(timer)
    }
  }, [isAuthenticated, created, navigate])

  const strength = passwordStrength(password)

  const validate = () => {
    const errs = {}
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!name.trim()) errs.name = 'Full name is required'
    else if (name.trim().length < 2) errs.name = 'Name must be at least 2 characters'
    if (!email.trim()) errs.email = 'Email is required'
    else if (!emailPattern.test(email.trim())) errs.email = 'Enter a valid email address'
    if (!password) errs.password = 'Password is required'
    else if (password.length < 6) errs.password = 'Password must be at least 6 characters'
    if (!confirmPassword) errs.confirmPassword = 'Confirm your password'
    else if (password !== confirmPassword) errs.confirmPassword = 'Passwords do not match'
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const clearErrorFor = (field) => setFieldErrors((f) => ({ ...f, [field]: '' }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return
    dispatch(register({ name: name.trim(), email: email.trim(), password }))
  }

  const handleGithub = () => {
    toast('GitHub sign-in is not configured yet. Use Google instead.', { icon: 'ℹ️' })
  }

  const handleTerms = () => {
    toast('Terms & Privacy docs are coming soon.', { icon: '📄' })
  }

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <BackgroundDecor />

      <div className="relative z-10 grid w-full md:grid-cols-[2fr_3fr] lg:grid-cols-2">
        <AuthHeroPanel
          title="Join KodNest"
          subtitle="Join thousands of readers building their future with the smartest digital library."
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

            <h2 className="mt-8 text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">Create Your Account</h2>
            <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">Start your library journey in minutes.</p>

            <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-4">
              <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <FloatingField
                  id="register-name"
                  icon={User}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    if (fieldErrors.name) clearErrorFor('name')
                  }}
                  error={fieldErrors.name}
                  placeholder="Full Name"
                  autoComplete="name"
                  autoFocus
                />
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
                <FloatingField
                  id="register-email"
                  type="email"
                  icon={Mail}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (fieldErrors.email) clearErrorFor('email')
                  }}
                  error={fieldErrors.email}
                  placeholder="Email Address"
                  autoComplete="email"
                />
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }}>
                <FloatingField
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  icon={Lock}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (fieldErrors.password) clearErrorFor('password')
                  }}
                  error={fieldErrors.password}
                  placeholder="Password"
                  autoComplete="new-password"
                  onRight={
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-600 dark:hover:text-gray-200"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  }
                />
                {password && (
                  <div className="mt-2">
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                            i <= strength ? STRENGTH_COLOR[strength] : 'bg-gray-200 dark:bg-gray-700'
                          }`}
                        />
                      ))}
                    </div>
                    <p className={`mt-1 text-xs font-medium ${STRENGTH_TEXT[strength]}`}>{STRENGTH_LABEL[strength]}</p>
                  </div>
                )}
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.34 }}>
                <FloatingField
                  id="register-confirm"
                  type={showPassword ? 'text' : 'password'}
                  icon={Lock}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value)
                    if (fieldErrors.confirmPassword) clearErrorFor('confirmPassword')
                  }}
                  error={fieldErrors.confirmPassword}
                  placeholder="Confirm Password"
                  autoComplete="new-password"
                />
              </motion.div>

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="group sticky bottom-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary-600 to-primary-700 text-sm font-semibold text-white shadow-lg shadow-primary-600/25 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary-600/30 focus:outline-none focus:ring-4 focus:ring-primary-500/25 disabled:pointer-events-none disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      Creating account...
                    </>
                  ) : (
                    <>
                      Create My Account
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>
              </div>

              <p className="text-center text-xs leading-relaxed text-gray-400 dark:text-gray-500">
                By creating an account, you agree to our{' '}
                <button type="button" onClick={handleTerms} className="font-semibold text-primary-600 hover:underline dark:text-primary-400">
                  Terms of Service
                </button>{' '}
                and{' '}
                <button type="button" onClick={handleTerms} className="font-semibold text-primary-600 hover:underline dark:text-primary-400">
                  Privacy Policy
                </button>
                .
              </p>
            </form>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
              <span className="text-xs font-medium uppercase tracking-widest text-gray-400">Or continue with</span>
              <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
            </div>

            <SocialButtons onGithub={handleGithub} />

            <p className="mt-7 text-center text-sm text-gray-500 dark:text-gray-400">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-primary-600 transition hover:text-primary-700 dark:text-primary-400">
                Sign In
              </Link>
            </p>
          </motion.div>
        </div>
      </div>

      {created && <SuccessOverlay title="Account created!" subtitle="Redirecting you to the sign-in page…" />}
    </div>
  )
}
