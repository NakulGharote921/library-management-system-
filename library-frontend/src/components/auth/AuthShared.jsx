import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { Library } from 'lucide-react'
import { bookService, homeStatsService } from '../../services/api.js'
import { authService } from '../../services/authService.js'
import { preferCover, preloadCover, DEFAULT_COVER } from '../../utils/bookCovers.js'

export const STATS_FALLBACK = { books: 15000, members: 2500, borrowedBooks: 0, reservations: 0, satisfaction: 98, categories: 0 }

export const COVER_POSITIONS = [
  'left-[5%] top-[10%] -rotate-6',
  'right-[6%] top-[12%] rotate-6',
  'left-[1%] top-[40%] rotate-12',
  'right-[1%] top-[44%] -rotate-12',
  'left-[12%] bottom-[7%] rotate-3',
  'right-[8%] bottom-[5%] -rotate-3',
]

export function useFloatingCovers(count = 6) {
  const [covers, setCovers] = useState([])
  useEffect(() => {
    let cancelled = false
    bookService
      .getAll()
      .then((books) => {
        if (cancelled || !Array.isArray(books) || !books.length) return
        const urls = books.slice(0, count).map((b) => preferCover(b))
        urls.forEach((u) => preloadCover(u))
        setCovers(urls)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [count])
  return covers
}

export function useHomeStats() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let cancelled = false
    homeStatsService
      .get()
      .then((data) => {
        if (!cancelled) setStats(data)
      })
      .catch(() => {
        if (!cancelled) setStats(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])
  return { stats, loading }
}

export function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52Z" />
    </svg>
  )
}

export function GithubIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55v-2.15c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.72-1.54-2.55-.29-5.23-1.28-5.23-5.69 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.05 0 0 .96-.31 3.15 1.18a11 11 0 0 1 5.74 0c2.19-1.49 3.15-1.18 3.15-1.18.62 1.59.23 2.76.11 3.05.73.81 1.18 1.84 1.18 3.1 0 4.42-2.69 5.39-5.25 5.68.41.35.77 1.04.77 2.1v3.11c0 .3.21.66.8.55A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  )
}

export function BackgroundDecor() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary-500/20 blur-3xl dark:bg-primary-500/10" />
      <div className="absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-sky-500/20 blur-3xl dark:bg-sky-500/10" />
      <div className="absolute left-1/3 top-1/4 h-40 w-40 rounded-full bg-violet-500/10 blur-2xl" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(37,99,235,0.08)_1px,transparent_0)] bg-[size:26px_26px]" />
      {Array.from({ length: 14 }).map((_, i) => (
        <span
          key={i}
          className="absolute h-1 w-1 rounded-full bg-primary-400/40"
          style={{
            left: `${(i * 37 + 11) % 100}%`,
            top: `${(i * 53 + 7) % 100}%`,
            animation: `float ${6 + (i % 5)}s ease-in-out ${i * 0.4}s infinite`,
          }}
        />
      ))}
    </div>
  )
}

export function FloatingCover({ src, position, index }) {
  return (
    <div className={`absolute z-0 overflow-visible ${position}`}>
      <motion.img
        src={src}
        alt=""
        aria-hidden="true"
        className="w-24 rounded-xl object-contain drop-shadow-2xl ring-1 ring-white/30 sm:w-28 lg:w-36 xl:w-40"
        initial={{ opacity: 0, y: 40, scale: 0.9 }}
        animate={{ opacity: 1, y: [0, -12, 0], scale: 1 }}
        transition={{
          opacity: { delay: 0.5 + index * 0.15, duration: 0.6 },
          y: { duration: 6 + (index % 3), repeat: Infinity, ease: 'easeInOut', delay: index * 0.4 },
        }}
      />
    </div>
  )
}

function StatSkeleton() {
  return (
    <>
      <div className="mx-auto h-6 w-14 animate-pulse rounded-md bg-white/20" />
      <div className="mx-auto mt-2 h-3 w-12 animate-pulse rounded bg-white/15" />
    </>
  )
}

export function AuthHeroPanel({ title, subtitle, features, stats, statsLoading }) {
  const covers = useFloatingCovers(6)
  const displayCovers = Array.from({ length: 6 }, (_, i) => covers[i] || DEFAULT_COVER)
  const data = stats || STATS_FALLBACK
  const statCards = [
    { value: `${data.books.toLocaleString()}+`, label: 'Books' },
    { value: `${data.members.toLocaleString()}+`, label: 'Members' },
    { value: `${data.satisfaction}%`, label: 'Satisfaction' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="relative hidden items-center justify-center overflow-hidden bg-gradient-to-br from-primary-800 via-primary-600 to-sky-600 p-10 md:flex xl:p-12"
    >
      <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 animate-pulse rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 animate-pulse rounded-full bg-sky-300/20 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.12)_1px,transparent_0)] bg-[size:26px_26px]" />

      {displayCovers.map((src, i) => (
        <FloatingCover key={i} src={src} position={COVER_POSITIONS[i]} index={i} />
      ))}

      <div className="relative z-10 max-w-md xl:max-w-lg">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-white/25 backdrop-blur">
            <Library className="h-6 w-6" />
          </span>
          <span className="text-2xl font-extrabold text-white">
            <b className="text-yellow-400">K</b>odNest Library
          </span>
        </div>

        <h1 className="mt-8 text-3xl font-extrabold leading-tight text-white xl:text-5xl">
          {title}{' '}
          <span className="bg-gradient-to-r from-sky-200 to-white bg-clip-text text-transparent">Library</span>
        </h1>
        <p className="mt-4 text-base text-primary-50/90 xl:text-lg">{subtitle}</p>

        <ul className="mt-8 grid max-w-md grid-cols-1 gap-3 sm:grid-cols-2">
          {features.map(({ icon: Icon, label }, i) => (
            <motion.li
              key={label}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.08 }}
              className="flex items-center gap-2.5 text-sm font-medium text-white"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25">
                <Icon className="h-3.5 w-3.5" />
              </span>
              {label}
            </motion.li>
          ))}
        </ul>

        <div className="mt-10 grid max-w-md grid-cols-3 gap-3">
          {statCards.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className="rounded-2xl bg-white/10 p-4 text-center ring-1 ring-white/20 backdrop-blur"
            >
              {statsLoading ? (
                <StatSkeleton />
              ) : (
                <p className="text-xl font-extrabold text-white">{s.value}</p>
              )}
              <p className="mt-0.5 text-xs font-medium text-primary-100">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

export function SuccessOverlay({ title = 'Account created!', subtitle = 'Redirecting you to your dashboard…' }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/90 backdrop-blur-xl dark:bg-gray-950/90"
    >
      <motion.svg
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        viewBox="0 0 52 52"
        className="h-24 w-24"
      >
        <circle cx="26" cy="26" r="24" fill="none" className="stroke-emerald-500" strokeWidth="3" />
        <motion.path
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 0.25, duration: 0.5, ease: 'easeOut' }}
          fill="none"
          className="stroke-emerald-500"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14 27l8 8 16-16"
        />
      </motion.svg>
      <p className="mt-6 text-lg font-bold text-gray-900 dark:text-white">{title}</p>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
    </motion.div>
  )
}

export function SocialButtons() {
  return (
    <div className="grid gap-3">
      <a
        href={authService.googleLoginUrl()}
        className="flex h-12 items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-gray-50 hover:shadow-md dark:border-gray-700 dark:bg-white/5 dark:text-gray-200 dark:hover:bg-white/10"
      >
        <GoogleIcon />
        Continue with Google
      </a>
    </div>
  )
}
