import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Chart from 'chart.js/auto'
import {
  AlertTriangle, Award, BookMarked, BookOpen, Calendar, CheckCircle2,
  ChevronLeft, ChevronRight, CircleDollarSign, Clock, Download,
  FilterX, Hash, MessageSquare, Printer, RefreshCw, Repeat,
  Search, Sparkles, Star, ThumbsUp, TrendingUp, X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import Button from '../components/Button.jsx'
import BookCover from '../components/BookCover.jsx'
import CategorySearchBar from '../components/CategorySearchBar.jsx'
import Modal from '../components/Modal.jsx'
import { CardSkeleton } from '../components/PageSkeleton.jsx'
import {
  borrowBook, getApiErrorMessage, getBookById, readingHistoryService,
  reservationService, wishlistService,
} from '../services/api.js'
import { coverOrSlug } from '../utils/bookCovers.js'

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const STATUS_META = {
  BORROWED: {
    label: 'Borrowing',
    icon: Clock,
    badge: 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-950 dark:text-blue-300',
    dot: 'bg-blue-500',
  },
  RETURNED: {
    label: 'Returned',
    icon: CheckCircle2,
    badge: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-300',
    dot: 'bg-emerald-500',
  },
  OVERDUE: {
    label: 'Overdue',
    icon: AlertTriangle,
    badge: 'bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-950 dark:text-rose-300',
    dot: 'bg-rose-500',
  },
  LOST: {
    label: 'Lost',
    icon: AlertTriangle,
    badge: 'bg-gray-200 text-gray-700 ring-gray-500/30 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-600',
    dot: 'bg-gray-600',
  },
  DAMAGED: {
    label: 'Damaged',
    icon: AlertTriangle,
    badge: 'bg-orange-50 text-orange-700 ring-orange-500/30 dark:bg-orange-950 dark:text-orange-300',
    dot: 'bg-orange-500',
  },
}

const RESERVATION_STATUS_LABEL = {
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  CANCELED: 'Cancelled',
  READY_FOR_PICKUP: 'Ready to Borrow',
  WAITING: 'Waiting',
}

const FINE_STATUS_LABEL = {
  PAID: 'Paid',
  UNPAID: 'Unpaid',
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'recentlyReturned', label: 'Recently Returned' },
  { value: 'highestRated', label: 'Highest Rated' },
  { value: 'alphabetical', label: 'Alphabetical' },
]

const ALERT_TYPES = {
  info: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200',
  warning: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200',
}

const GENRE_PALETTE = ['#818cf8', '#34d399', '#fbbf24', '#f472b6', '#60a5fa', '#a78bfa', '#fb7185', '#4ade80', '#f59e0b', '#22d3ee']

const fmtDate = (d) => {
  if (!d) return '—'
  const [y, m, day] = String(d).slice(0, 10).split('-')
  if (!y || !m || !day) return String(d)
  return `${day} ${MONTHS_SHORT[Number(m) - 1] || m} ${y}`
}

const fmtMoney = (n) => {
  if (n == null) return null
  return '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const daysAgo = (dateStr) => {
  if (!dateStr) return null
  const [y, m, d] = String(dateStr).slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return null
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((start - new Date(y, m - 1, d)) / 86400000)
}

function statusMeta(entry) {
  const meta = STATUS_META[entry.status] || STATUS_META.BORROWED
  const label = entry.status === 'OVERDUE' && entry.returnDate ? 'Returned Late' : meta.label
  return { ...meta, label }
}

function StarRating({ value, onChange, size = 'h-5 w-5' }) {
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          aria-label={`${star} star`}
          onClick={() => onChange?.(star)}
          className="cursor-pointer p-0.5 transition hover:scale-110"
        >
          <Star
            aria-hidden="true"
            className={`${size} ${star <= (value || 0) ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-gray-600'}`}
          />
        </button>
      ))}
    </div>
  )
}

function Timeline({ entry }) {
  const closed = entry.status === 'LOST' || entry.status === 'DAMAGED'
  const steps = [
    { label: 'Borrowed', date: entry.borrowDate, done: true },
    { label: 'Due Date', date: entry.dueDate, done: !!entry.dueDate },
    { label: closed ? 'Loan Closed' : 'Returned', date: entry.returnDate, done: !!entry.returnDate || closed },
    { label: 'Review', date: entry.review ? String(entry.reviewSubmittedAt || '').slice(0, 10) : null, done: !!entry.review },
  ]
  return (
    <ol className="mt-4 flex flex-wrap items-start gap-x-2 gap-y-3">
      {steps.map((s, i) => (
        <li key={s.label} className="flex items-center gap-2 text-xs">
          <span
            className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full ring-1 ${
              s.done
                ? 'bg-primary-600 text-white ring-primary-600 dark:bg-primary-500 dark:ring-primary-500'
                : 'bg-gray-100 text-gray-400 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700'
            }`}
          >
            {s.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
          </span>
          <span className="flex flex-col leading-tight">
            <span className={s.done ? 'font-medium text-gray-700 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'}>
              {s.label}
            </span>
            <span className="text-gray-400 dark:text-gray-500">{fmtDate(s.date)}</span>
          </span>
          {i < steps.length - 1 && (
            <span className={`mx-1 hidden h-px w-6 sm:block ${s.done ? 'bg-primary-400' : 'bg-gray-200 dark:bg-gray-700'}`} />
          )}
        </li>
      ))}
    </ol>
  )
}

function MonthlyChart({ labels, values }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!ref.current || !labels.length) return
    const chart = new Chart(ref.current.getContext('2d'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Books Read',
            data: values,
            backgroundColor: '#818cf8',
            hoverBackgroundColor: '#6366f1',
            borderRadius: 6,
            borderSkipped: false,
            maxBarThickness: 36,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (i) => `${i.parsed.y} book${i.parsed.y === 1 ? '' : 's'}` } },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#9ca3af', maxRotation: 45 } },
          y: { beginAtZero: true, grid: { color: 'rgba(148,163,184,0.15)' }, ticks: { color: '#9ca3af', stepSize: 1 } },
        },
      },
    })
    return () => chart.destroy()
  }, [labels, values])
  if (!labels.length) return null
  return <div className="h-64"><canvas ref={ref} aria-label="Books read per month chart" /></div>
}

function GenreChart({ labels, values }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!ref.current || !labels.length) return
    const chart = new Chart(ref.current.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: labels.map((_, i) => GENRE_PALETTE[i % GENRE_PALETTE.length]),
            borderColor: 'transparent',
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: { position: 'bottom', labels: { color: '#9ca3af', boxWidth: 10, padding: 12, usePointStyle: true } },
          tooltip: { callbacks: { label: (i) => ` ${i.label}: ${i.parsed} books` } },
        },
      },
    })
    return () => chart.destroy()
  }, [labels, values])
  if (!labels.length) return null
  return <div className="h-64"><canvas ref={ref} aria-label="Favorite genres chart" /></div>
}

function HistoryCover({ entry, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`View details of ${entry.bookTitle}`}
      className="h-24 w-[4.5rem] flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 ring-1 ring-gray-200 transition hover:ring-primary-400 dark:bg-gray-800 dark:ring-gray-700"
    >
      <BookCover
        src={coverOrSlug(entry.bookCoverImageUrl, entry.bookTitle)}
        alt={entry.bookTitle}
        className="h-full w-full"
        imgClassName="h-full w-full object-cover"
      />
    </button>
  )
}

function HistoryCard({ entry, actionId, onDetails, onBorrowAgain, onWishlist, onReview, onRating }) {
  const meta = statusMeta(entry)
  const StatusIcon = meta.icon
  const isActive = entry.status === 'BORROWED' || (entry.status === 'OVERDUE' && !entry.returnDate)
  return (
    <article className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-col gap-4 sm:flex-row">
        <HistoryCover entry={entry} onClick={onDetails} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3
                  className="cursor-pointer truncate text-base font-semibold text-gray-900 hover:text-primary-600 dark:text-gray-50 dark:hover:text-primary-400"
                  onClick={onDetails}
                  title={entry.bookTitle}
                >
                  {entry.bookTitle}
                </h3>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${meta.badge}`}>
                  <StatusIcon className="h-3.5 w-3.5" />
                  {meta.label}
                </span>
              </div>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{entry.bookAuthor}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                {entry.bookIsbn && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                    <Hash className="h-3 w-3" />
                    {entry.bookIsbn}
                  </span>
                )}
                {entry.bookCategory && (
                  <span className="rounded-full bg-primary-50 px-2 py-0.5 font-medium text-primary-700 dark:bg-primary-950 dark:text-primary-300">
                    {entry.bookCategory}
                  </span>
                )}
                {entry.membershipPlanName && (
                  <span className="rounded-full bg-purple-50 px-2 py-0.5 font-medium text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                    {entry.membershipPlanName}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-500 dark:text-gray-400">
            <span><span className="font-medium text-gray-700 dark:text-gray-300">Borrowed</span> {fmtDate(entry.borrowDate)}</span>
            <span><span className="font-medium text-gray-700 dark:text-gray-300">Due</span> {fmtDate(entry.dueDate)}</span>
            <span><span className="font-medium text-gray-700 dark:text-gray-300">Returned</span> {fmtDate(entry.returnDate)}</span>
            <span><span className="font-medium text-gray-700 dark:text-gray-300">Days</span> {entry.daysBorrowed != null ? `${entry.daysBorrowed}d` : '—'}</span>
            {Number(entry.fineAmount || 0) > 0 && (
              <span className={`font-semibold ${entry.fineStatus === 'PAID' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                Fine {fmtMoney(entry.fineAmount)} {entry.fineStatus === 'PAID' ? '(paid)' : '(unpaid)'}
              </span>
            )}
          </div>

          <Timeline entry={entry} />

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">Rating:</span>
              <StarRating value={entry.rating || 0} onChange={(r) => onRating(entry, r)} />
              {actionId === `rate-${entry.id}` && <span className="text-xs text-primary-600 dark:text-primary-400">saving...</span>}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="xs" variant="secondary" icon={BookOpen} onClick={onDetails}>View Details</Button>
              {!isActive && (
                <Button size="xs" variant="secondary" icon={Repeat} onClick={onBorrowAgain} loading={actionId === `borrow-${entry.bookId}`}>
                  Borrow Again
                </Button>
              )}
              <Button size="xs" variant="secondary" icon={Sparkles} onClick={onWishlist} loading={actionId === `wish-${entry.bookId}`}>
                Wishlist
              </Button>
              <Button size="xs" icon={MessageSquare} onClick={onReview}>
                {entry.review ? 'Edit Review' : 'Rate & Review'}
              </Button>
            </div>
          </div>

          {entry.review && (
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
              <MessageSquare className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm text-gray-700 dark:text-gray-300">{entry.review}</p>
                {entry.reviewSubmittedAt && (
                  <p className="mt-1 text-xs text-gray-400">{fmtDate(entry.reviewSubmittedAt)}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

function SectionCard({ icon: Icon, title, subtitle, children, action }) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-950 dark:text-primary-300">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-50">{title}</h2>
            {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

export default function ReadingHistory() {
  const navigate = useNavigate()
  const [history, setHistory] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionId, setActionId] = useState(null)

  const [filters, setFilters] = useState({
    keyword: '', author: '', genre: '', status: '',
    borrowFrom: '', borrowTo: '', returnFrom: '', returnTo: '', sort: 'newest',
  })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [dismissed, setDismissed] = useState({})

  const [details, setDetails] = useState(null)
  const [detailsBook, setDetailsBook] = useState(null)
  const [detailsReservations, setDetailsReservations] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)

  const [reviewTarget, setReviewTarget] = useState(null)
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewText, setReviewText] = useState('')
  const [reviewSaving, setReviewSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [data, statsData] = await Promise.all([
        readingHistoryService.getMy(),
        readingHistoryService.getStats(),
      ])
      setHistory(data)
      setStats(statsData)
    } catch (e) {
      setError(e)
      toast.error(getApiErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    Promise.all([
      readingHistoryService.getMy(),
      readingHistoryService.getStats(),
    ])
      .then(([data, statsData]) => {
        if (cancelled) return
        setHistory(data)
        setStats(statsData)
      })
      .catch((e) => {
        if (cancelled) return
        setError(e)
        toast.error(getApiErrorMessage(e))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const genres = useMemo(() => [...new Set(history.map((r) => r.bookCategory).filter(Boolean))].sort(), [history])

  const filtered = useMemo(() => {
    const keyword = filters.keyword.trim().toLowerCase()
    const author = filters.author.trim().toLowerCase()
    const rows = history.filter((r) => {
      if (keyword && !(r.bookTitle || '').toLowerCase().includes(keyword)) return false
      if (author && !(r.bookAuthor || '').toLowerCase().includes(author)) return false
      if (filters.genre && r.bookCategory !== filters.genre) return false
      if (filters.status && r.status !== filters.status) return false
      if (filters.borrowFrom && String(r.borrowDate || '').slice(0, 10) < filters.borrowFrom) return false
      if (filters.borrowTo && String(r.borrowDate || '').slice(0, 10) > filters.borrowTo) return false
      if (filters.returnFrom && String(r.returnDate || '').slice(0, 10) < filters.returnFrom) return false
      if (filters.returnTo && String(r.returnDate || '').slice(0, 10) > filters.returnTo) return false
      return true
    })
    switch (filters.sort) {
      case 'oldest':
        rows.sort((a, b) => String(a.borrowDate).localeCompare(String(b.borrowDate)))
        break
      case 'recentlyReturned':
        rows.sort((a, b) => String(b.returnDate || '').localeCompare(String(a.returnDate || '')))
        break
      case 'highestRated':
        rows.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1))
        break
      case 'alphabetical':
        rows.sort((a, b) => (a.bookTitle || '').localeCompare(b.bookTitle || ''))
        break
      default:
        rows.sort((a, b) => String(b.borrowDate).localeCompare(String(a.borrowDate)))
    }
    return rows
  }, [history, filters])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const pageNumbers = useMemo(() => {
    const pages = []
    for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) pages.push(i)
    return pages
  }, [currentPage, totalPages])

  const alerts = useMemo(() => {
    const list = []
    const recent = history.filter((r) => r.returnDate && daysAgo(r.returnDate) <= 7)
    if (recent.length) {
      list.push({ key: 'recent', type: 'info', icon: CheckCircle2, title: 'Recently Returned', text: `${recent.length} book${recent.length > 1 ? 's' : ''} returned in the last 7 days.` })
    }
    const reviewable = history.filter((r) => r.returnDate && !r.review)
    if (reviewable.length) {
      list.push({ key: 'review', type: 'success', icon: Star, title: 'Books Eligible for Review', text: `${reviewable.length} returned book${reviewable.length > 1 ? 's' : ''} waiting for your rating and review.` })
    }
    const fines = history.filter((r) => Number(r.fineAmount || 0) > 0 && r.fineStatus !== 'PAID')
    if (fines.length) {
      list.push({ key: 'fine', type: 'warning', icon: CircleDollarSign, title: 'Outstanding Fines', text: `You have ${fines.length} unpaid fine${fines.length > 1 ? 's' : ''}. Please clear them from the Payments page.` })
    }
    return list
  }, [history])

  const monthly = useMemo(() => {
    const map = new Map()
    for (const r of history) {
      const key = String(r.borrowDate || '').slice(0, 7)
      if (key.length < 7) continue
      map.set(key, (map.get(key) || 0) + 1)
    }
    const keys = [...map.keys()].sort()
    return {
      labels: keys.map((k) => {
        const [y, m] = k.split('-')
        return `${MONTHS_SHORT[Number(m) - 1] || m} ${y}`
      }),
      values: keys.map((k) => map.get(k)),
    }
  }, [history])

  const lateReturns = useMemo(
    () => history.filter((r) => r.returnDate && r.dueDate && String(r.returnDate) > String(r.dueDate)).length,
    [history],
  )

  const genreDist = useMemo(() => {
    const entries = Object.entries(stats?.genreDistribution || {}).sort((a, b) => b[1] - a[1])
    return { labels: entries.map(([k]) => k), values: entries.map(([, v]) => v) }
  }, [stats])

  const setFilter = (key) => (e) => {
    setPage(1)
    setFilters((f) => ({ ...f, [key]: e.target.value }))
  }

  const clearFilters = () => {
    setPage(1)
    setFilters({ keyword: '', author: '', genre: '', status: '', borrowFrom: '', borrowTo: '', returnFrom: '', returnTo: '', sort: 'newest' })
  }

  const hasActiveFilters = Object.entries(filters).some(([k, v]) => k !== 'sort' && v)

  const openDetails = async (entry) => {
    setDetails(entry)
    setDetailsBook(null)
    setDetailsReservations(null)
    setDetailsLoading(true)
    try {
      const [book, res] = await Promise.all([
        getBookById(entry.bookId).catch(() => null),
        reservationService.getByBook(entry.bookId).catch(() => null),
      ])
      setDetailsBook(book)
      setDetailsReservations(Array.isArray(res) ? res : [])
    } catch {
      // non-fatal: modal still shows history details
    } finally {
      setDetailsLoading(false)
    }
  }

  const handleRating = async (entry, rating) => {
    setActionId(`rate-${entry.id}`)
    try {
      await readingHistoryService.rate(entry.id, rating)
      toast.success('Rating saved')
      load()
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    } finally {
      setActionId(null)
    }
  }

  const openReview = (entry) => {
    setReviewTarget(entry)
    setReviewRating(entry.rating || 0)
    setReviewText(entry.review || '')
  }

  const saveReview = async () => {
    if (!reviewTarget) return
    setReviewSaving(true)
    try {
      if (reviewRating) await readingHistoryService.rate(reviewTarget.id, reviewRating)
      if (reviewText.trim()) await readingHistoryService.review(reviewTarget.id, reviewText.trim())
      toast.success('Rating and review saved')
      setReviewTarget(null)
      load()
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    } finally {
      setReviewSaving(false)
    }
  }

  const handleBorrowAgain = async (entry) => {
    setActionId(`borrow-${entry.bookId}`)
    try {
      await borrowBook(entry.bookId)
      toast.success(`"${entry.bookTitle}" borrowed again`)
      load()
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    } finally {
      setActionId(null)
    }
  }

  const handleWishlist = async (entry) => {
    setActionId(`wish-${entry.bookId}`)
    try {
      await wishlistService.add(entry.bookId)
      toast.success('Added to wishlist')
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    } finally {
      setActionId(null)
    }
  }

  const exportCsv = (rows, filename) => {
    const headers = ['Title', 'Author', 'ISBN', 'Genre', 'Borrowed', 'Due', 'Returned', 'Days Borrowed', 'Status', 'Rating', 'Fine', 'Fine Status', 'Plan', 'Review']
    const toRow = (r) => [
      r.bookTitle, r.bookAuthor, r.bookIsbn, r.bookCategory, r.borrowDate, r.dueDate, r.returnDate,
      r.daysBorrowed ?? '', statusMeta(r).label, r.rating ?? '', r.fineAmount ?? '', r.fineStatus ?? '',
      r.membershipPlanName ?? '', r.review ?? '',
    ]
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const csv = [headers, ...rows.map(toRow)].map((row) => row.map(esc).join(',')).join('\r\n')
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    toast.success(`${rows.length} entries exported`)
  }

  const statCards = [
    { label: 'Total Books Read', value: stats?.totalBooksRead ?? 0, icon: BookMarked, color: 'bg-primary-50 text-primary-600 dark:bg-primary-950 dark:text-primary-300' },
    { label: 'Currently Borrowed', value: stats?.currentlyBorrowed ?? 0, icon: Clock, color: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300' },
    { label: 'Books Returned', value: stats?.returnedBooks ?? 0, icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300' },
    { label: 'Overdue Returns', value: stats?.overdueReturns ?? 0, icon: AlertTriangle, color: 'bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-300' },
    { label: 'Favorite Genre', value: stats?.favoriteGenre || 'No Favorite Yet', icon: Award, color: 'bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-300' },
    { label: 'Total Reading Days', value: stats?.totalReadingDays ?? 0, icon: Calendar, color: 'bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-300' },
  ]

  const analyticsChips = [
    { label: 'Average Borrow Duration', value: stats?.averageBorrowDuration ? `${stats.averageBorrowDuration} days` : '—', icon: Clock, color: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300' },
    { label: 'Returned On Time', value: stats?.onTimeReturns ?? 0, icon: ThumbsUp, color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300' },
    { label: 'Late Returns', value: lateReturns, icon: AlertTriangle, color: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300' },
    { label: 'Total Fine Paid', value: fmtMoney(stats?.totalFinePaid) || '₹0.00', icon: CircleDollarSign, color: 'bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-300' },
  ]

  const inputCls = 'h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100'
  const selectCls = 'h-12 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm text-gray-700 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'

  return (
    <>
      <div className="space-y-6 animate-fadeIn print:hidden">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Reading History</h1>
            <p className="mt-0.5 text-sm text-gray-500">View your complete borrowing history, reading progress, and returned books.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" icon={Download} onClick={() => exportCsv(filtered, 'reading-history.csv')} disabled={!filtered.length} className="h-11 min-w-[140px]">
              Download / Excel
            </Button>
            <Button variant="secondary" size="sm" icon={Printer} onClick={() => window.print()} disabled={!filtered.length} className="h-11 min-w-[140px]">
              Print / PDF
            </Button>
            <Button variant="secondary" size="sm" icon={RefreshCw} onClick={load} loading={loading} className="h-11 min-w-[140px]">
              Refresh
            </Button>
          </div>
        </div>

        {alerts.filter((a) => !dismissed[a.key]).length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {alerts.filter((a) => !dismissed[a.key]).map((a) => (
              <div key={a.key} className={`relative flex items-start gap-3 rounded-xl border p-3.5 ${ALERT_TYPES[a.type]}`}>
                <a.icon className="mt-0.5 h-5 w-5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{a.title}</p>
                  <p className="mt-0.5 text-xs opacity-90">{a.text}</p>
                </div>
                <button
                  type="button"
                  aria-label={`Dismiss ${a.title} alert`}
                  onClick={() => setDismissed((d) => ({ ...d, [a.key]: true }))}
                  className="rounded p-1 transition hover:bg-black/5 dark:hover:bg-white/10"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {stats && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {statCards.map((s) => (
              <div key={s.label} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${s.color}`}>
                  <s.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-lg font-bold text-gray-900 dark:text-gray-50" title={String(s.value)}>{s.value}</p>
                  <p className="truncate text-xs text-gray-500" title={s.label}>{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-50">Filters</h2>
            {hasActiveFilters && (
              <Button variant="secondary" size="sm" icon={FilterX} onClick={clearFilters}>Clear Filters</Button>
            )}
          </div>
          <div className="mt-4 grid grid-cols-12 gap-4">
            <div className="col-span-12">
              <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">Search Book</label>
              <CategorySearchBar
                categories={genres.map((g) => ({ value: g, label: g }))}
                selectedCategory={filters.genre}
                onCategoryChange={(v) => { setPage(1); setFilters((f) => ({ ...f, genre: v })) }}
                value={filters.keyword}
                onValueChange={(v) => { setPage(1); setFilters((f) => ({ ...f, keyword: v })) }}
                placeholder="Search by book title..."
                ariaLabel="Search by book title"
                className="max-w-2xl"
              />
            </div>
            <div className="col-span-12 sm:col-span-6 lg:col-span-4">
              <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">Search Author</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Search by author..." value={filters.author} onChange={setFilter('author')} className={`${inputCls} pl-9`} aria-label="Search by author" />
              </div>
            </div>
            <div className="col-span-12 sm:col-span-6 lg:col-span-4">
              <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">Status</label>
              <select value={filters.status} onChange={setFilter('status')} className={`${selectCls} w-full`} aria-label="Reading status filter">
                <option value="">All Status</option>
                {Object.entries(STATUS_META).map(([key, m]) => <option key={key} value={key}>{m.label}</option>)}
              </select>
            </div>
            <div className="col-span-12 sm:col-span-6 lg:col-span-4">
              <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">Sort</label>
              <select value={filters.sort} onChange={setFilter('sort')} className={`${selectCls} w-full`} aria-label="Sort order">
                {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">Borrow Date</label>
              <div className="flex items-center gap-2">
                <input type="date" value={filters.borrowFrom} onChange={setFilter('borrowFrom')} className={inputCls} aria-label="Borrow date from" />
                <span className="flex-shrink-0 text-xs font-medium text-gray-400">to</span>
                <input type="date" value={filters.borrowTo} onChange={setFilter('borrowTo')} className={inputCls} aria-label="Borrow date to" />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">Return Date</label>
              <div className="flex items-center gap-2">
                <input type="date" value={filters.returnFrom} onChange={setFilter('returnFrom')} className={inputCls} aria-label="Return date from" />
                <span className="flex-shrink-0 text-xs font-medium text-gray-400">to</span>
                <input type="date" value={filters.returnTo} onChange={setFilter('returnTo')} className={inputCls} aria-label="Return date to" />
              </div>
            </div>
          </div>
        </div>

        {loading && history.length === 0 ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : error && history.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 py-20 text-center dark:border-rose-900 dark:bg-rose-950/30">
            <AlertTriangle className="h-14 w-14 text-rose-400" />
            <h3 className="mt-4 text-lg font-semibold text-rose-700 dark:text-rose-300">We couldn't load your reading history</h3>
            <p className="mt-1 text-sm text-rose-500">{getApiErrorMessage(error)}</p>
            <Button className="mt-5" icon={RefreshCw} onClick={load}>Try Again</Button>
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-20 text-center shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 dark:bg-primary-950">
              <BookOpen className="h-8 w-8 text-primary-600 dark:text-primary-300" />
            </div>
            <h3 className="mt-5 text-lg font-semibold text-gray-900 dark:text-gray-50">No Reading History Yet</h3>
            <p className="mt-1 max-w-sm text-sm text-gray-500">Your reading history will appear here once you start borrowing books.</p>
            <Button className="mt-6" onClick={() => navigate('/books')}>Browse Books</Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-20 text-center shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
              <Search className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="mt-5 text-lg font-semibold text-gray-900 dark:text-gray-50">No books match your filters. Try different filters.</h3>
            <p className="mt-1 max-w-sm text-sm text-gray-500">Try adjusting your search, filters, or date ranges.</p>
            <Button className="mt-6" variant="secondary" icon={FilterX} onClick={clearFilters}>Clear Filters</Button>
          </div>
        ) : (
          <>
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <p className="text-sm text-gray-500">
                Showing <span className="font-semibold text-gray-800 dark:text-gray-200">{filtered.length ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, filtered.length)}</span> of <span className="font-semibold text-gray-800 dark:text-gray-200">{filtered.length}</span> books
              </p>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>Rows per page</span>
                <select value={pageSize} onChange={(e) => { setPage(1); setPageSize(Number(e.target.value)) }} className={selectCls} aria-label="Rows per page">
                  {[10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-3">
              {pageRows.map((entry) => (
                <HistoryCard
                  key={entry.id}
                  entry={entry}
                  actionId={actionId}
                  onDetails={() => openDetails(entry)}
                  onBorrowAgain={() => handleBorrowAgain(entry)}
                  onWishlist={() => handleWishlist(entry)}
                  onReview={() => openReview(entry)}
                  onRating={handleRating}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <nav className="flex flex-col items-center justify-between gap-3 sm:flex-row" aria-label="Pagination">
                <p className="text-sm text-gray-500">Page {currentPage} of {totalPages}</p>
                <div className="flex items-center gap-1.5">
                  <Button variant="secondary" size="sm" icon={ChevronLeft} onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} aria-label="Previous page">Prev</Button>
                  {pageNumbers[0] > 1 && (
                    <>
                      <button type="button" onClick={() => setPage(1)} className={`h-9 w-9 rounded-lg text-sm font-medium transition ${currentPage === 1 ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'}`}>1</button>
                      <span className="px-1 text-gray-400">…</span>
                    </>
                  )}
                  {pageNumbers.map((n) => (
                    <button key={n} type="button" onClick={() => setPage(n)} aria-current={currentPage === n ? 'page' : undefined} className={`h-9 w-9 rounded-lg text-sm font-medium transition ${currentPage === n ? 'bg-primary-600 text-white shadow-md shadow-primary-500/25' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'}`}>
                      {n}
                    </button>
                  ))}
                  {pageNumbers[pageNumbers.length - 1] < totalPages && (
                    <>
                      <span className="px-1 text-gray-400">…</span>
                      <button type="button" onClick={() => setPage(totalPages)} className={`h-9 w-9 rounded-lg text-sm font-medium transition ${currentPage === totalPages ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'}`}>{totalPages}</button>
                    </>
                  )}
                  <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} aria-label="Next page">Next<ChevronRight className="h-4 w-4" /></Button>
                </div>
              </nav>
            )}
          </>
        )}

        {history.length > 0 && (
          <SectionCard icon={TrendingUp} title="Reading Analytics" subtitle="Insights from your reading journey">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {analyticsChips.map((c) => (
                <div key={c.label} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3.5 dark:border-gray-800 dark:bg-gray-800/50">
                  <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${c.color}`}>
                    <c.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-base font-bold text-gray-900 dark:text-gray-50" title={String(c.value)}>{c.value}</p>
                    <p className="truncate text-xs text-gray-500">{c.label}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
                <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">Books Read Per Month</h3>
                <MonthlyChart labels={monthly.labels} values={monthly.values} />
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
                <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">Favorite Genres</h3>
                <GenreChart labels={genreDist.labels} values={genreDist.values} />
              </div>
            </div>
          </SectionCard>
        )}
      </div>

      <div className="hidden print:block">
        <h1 className="mb-4 text-xl font-bold">Reading History</h1>
        {filtered.length > 0 ? (
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                {['Title', 'Author', 'ISBN', 'Genre', 'Borrowed', 'Due', 'Returned', 'Days', 'Status', 'Rating', 'Fine', 'Plan'].map((h) => (
                  <th key={h} className="border border-gray-300 px-2 py-1 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td className="border border-gray-300 px-2 py-1">{r.bookTitle}</td>
                  <td className="border border-gray-300 px-2 py-1">{r.bookAuthor}</td>
                  <td className="border border-gray-300 px-2 py-1">{r.bookIsbn || ''}</td>
                  <td className="border border-gray-300 px-2 py-1">{r.bookCategory || ''}</td>
                  <td className="border border-gray-300 px-2 py-1">{fmtDate(r.borrowDate)}</td>
                  <td className="border border-gray-300 px-2 py-1">{fmtDate(r.dueDate)}</td>
                  <td className="border border-gray-300 px-2 py-1">{fmtDate(r.returnDate)}</td>
                  <td className="border border-gray-300 px-2 py-1">{r.daysBorrowed ?? ''}</td>
                  <td className="border border-gray-300 px-2 py-1">{statusMeta(r).label}</td>
                  <td className="border border-gray-300 px-2 py-1">{r.rating ?? ''}</td>
                  <td className="border border-gray-300 px-2 py-1">{r.fineAmount ? fmtMoney(r.fineAmount) : ''}</td>
                  <td className="border border-gray-300 px-2 py-1">{r.membershipPlanName || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>Your reading history is empty.</p>
        )}
      </div>

      <Modal open={!!details} title={details?.bookTitle || 'About This Book'} onClose={() => setDetails(null)} size="lg">
        {details && (
          <div className="space-y-5">
            <div className="flex flex-col gap-4 sm:flex-row">
              <BookCover
                src={coverOrSlug(details.bookCoverImageUrl, details.bookTitle)}
                alt={details.bookTitle}
                className="h-40 w-28 flex-shrink-0 rounded-xl ring-1 ring-gray-200 dark:ring-gray-700"
                imgClassName="h-full w-full object-cover"
              />
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">{details.bookTitle}</h3>
                <p className="text-sm text-gray-500">by {details.bookAuthor}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${statusMeta(details).badge}`}>
                    {statusMeta(details).label}
                  </span>
                  {details.bookCategory && (
                    <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-700 dark:bg-primary-950 dark:text-primary-300">
                      {details.bookCategory}
                    </span>
                  )}
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
                  <div><dt className="text-xs font-medium text-gray-500">ISBN</dt><dd className="text-gray-800 dark:text-gray-200">{details.bookIsbn || '—'}</dd></div>
                  <div><dt className="text-xs font-medium text-gray-500">Author</dt><dd className="text-gray-800 dark:text-gray-200">{details.bookAuthor || '—'}</dd></div>
                  <div><dt className="text-xs font-medium text-gray-500">Publisher</dt><dd className="text-gray-800 dark:text-gray-200">{detailsBook?.publisher || '—'}</dd></div>
                  <div><dt className="text-xs font-medium text-gray-500">Category</dt><dd className="text-gray-800 dark:text-gray-200">{details.bookCategory || '—'}</dd></div>
                  <div><dt className="text-xs font-medium text-gray-500">Language</dt><dd className="text-gray-800 dark:text-gray-200">{detailsBook?.language || '—'}</dd></div>
                  <div><dt className="text-xs font-medium text-gray-500">Edition / Year</dt><dd className="text-gray-800 dark:text-gray-200">{detailsBook?.publicationYear || '—'}</dd></div>
                </dl>
              </div>
            </div>

            {detailsLoading ? (
              <div className="space-y-2">
                <div className="skeleton h-4 w-1/3" />
                <div className="skeleton h-24 w-full" />
              </div>
            ) : (
              <>
                {detailsBook?.description && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Book Description</h4>
                    <p className="mt-1.5 text-sm leading-relaxed text-gray-600 dark:text-gray-300">{detailsBook.description}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    ['Borrow Date', fmtDate(details.borrowDate)],
                    ['Due Date', fmtDate(details.dueDate)],
                    ['Return Date', fmtDate(details.returnDate)],
                    ['Borrow Duration', details.daysBorrowed != null ? `${details.daysBorrowed} days` : '—'],
                    ['Membership Used', details.membershipPlanName || '—'],
                    ['Fine Amount', details.fineAmount ? fmtMoney(details.fineAmount) : '—'],
                    ['Fine Status', FINE_STATUS_LABEL[details.fineStatus] || details.fineStatus || '—'],
                    ['Rating', details.rating ? `${details.rating} / 5` : 'Not rated'],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-800/50">
                      <p className="text-xs font-medium text-gray-500">{label}</p>
                      <p className="mt-0.5 text-sm font-semibold text-gray-800 dark:text-gray-200">{value}</p>
                    </div>
                  ))}
                </div>
                {details.review && (
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-3.5 dark:border-gray-800 dark:bg-gray-800/50">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Your Review</h4>
                    <p className="mt-1.5 text-sm leading-relaxed text-gray-600 dark:text-gray-300">{details.review}</p>
                    {details.reviewSubmittedAt && (
                      <p className="mt-1 text-xs text-gray-400">{fmtDate(details.reviewSubmittedAt)}</p>
                    )}
                  </div>
                )}
                {detailsReservations && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Reservation History</h4>
                    {detailsReservations.length ? (
                      <ul className="mt-2 divide-y divide-gray-100 rounded-xl border border-gray-100 dark:divide-gray-800 dark:border-gray-800">
                        {detailsReservations.map((res) => (
                          <li key={res.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm">
                            <div>
                              <p className="font-medium text-gray-800 dark:text-gray-200">{res.reservationNumber}</p>
                              <p className="text-xs text-gray-500">Reserved {fmtDate(res.reservationDate)}</p>
                            </div>
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${res.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : res.status === 'COMPLETED' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                              {RESERVATION_STATUS_LABEL[res.status] || res.status}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1.5 text-sm text-gray-500">No reservations for this book yet.</p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </Modal>

      <Modal open={!!reviewTarget} title={`Rate & Review: ${reviewTarget?.bookTitle || ''}`} onClose={() => setReviewTarget(null)}>
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-200">Your rating</p>
            <StarRating value={reviewRating} onChange={setReviewRating} size="h-7 w-7" />
          </div>
          <div>
            <label htmlFor="review-text" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">Your review</label>
            <textarea
              id="review-text"
              rows={4}
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Share your thoughts about this book..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
        </div>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => setReviewTarget(null)}>Cancel</Button>
          <Button onClick={saveReview} loading={reviewSaving} disabled={!reviewRating && !reviewText.trim()}>
            Save Review
          </Button>
        </div>
      </Modal>
    </>
  )
}
