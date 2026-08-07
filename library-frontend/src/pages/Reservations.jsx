import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen, Clock, CheckCircle, XCircle, AlertTriangle,
  RefreshCw, Eye, Ban,
  Tag, MapPin, Timer,
  Hash, Mail, User, ThumbsUp, ExternalLink, TrendingUp,
  Download, ArrowUpDown, Crown, CalendarClock, Users, BarChart3,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useSelector } from 'react-redux'
import { selectUserRole } from '../store/authSlice.js'
import Button from '../components/Button.jsx'
import BookCover from '../components/BookCover.jsx'
import CategorySearchBar from '../components/CategorySearchBar.jsx'
import Modal from '../components/Modal.jsx'
import { CardSkeleton } from '../components/PageSkeleton.jsx'
import { getApiErrorMessage, reservationService, borrowBook, reserveBook } from '../services/api.js'
import { useCategories } from '../store/CategoryContext.js'
import { coverOrSlug } from '../utils/bookCovers.js'

const STATUS_LABEL = {
  WAITING: 'Waiting',
  READY_FOR_PICKUP: 'Ready for Pickup',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
}

const STATUS_COLORS = {
  WAITING: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950 dark:text-amber-300',
  READY_FOR_PICKUP: 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-950 dark:text-blue-300',
  COMPLETED: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-300',
  CANCELLED: 'bg-gray-100 text-gray-600 ring-gray-500/20 dark:bg-gray-800 dark:text-gray-400',
  EXPIRED: 'bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-950 dark:text-rose-300',
}

const STATUS_ICONS = {
  WAITING: Clock,
  READY_FOR_PICKUP: AlertTriangle,
  COMPLETED: CheckCircle,
  CANCELLED: XCircle,
  EXPIRED: Ban,
}

const STATUS_STEPS = {
  WAITING: ['Reserved', 'Waiting in queue', 'Notified when ready', 'Ready for pickup', 'Completed'],
  READY_FOR_PICKUP: ['Reserved', 'Waiting in queue', 'Notified when ready', 'Ready for pickup', 'Completed'],
  COMPLETED: ['Reserved', 'Waiting in queue', 'Notified when ready', 'Ready for pickup', 'Completed'],
  CANCELLED: ['Reserved', 'Cancelled'],
  EXPIRED: ['Reserved', 'Waiting in queue', 'Notified when ready', 'Pickup expired', 'Expired'],
}

const STATUS_BADGE = {
  WAITING: { bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-800 dark:text-amber-200', dot: 'bg-amber-500' },
  READY_FOR_PICKUP: { bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-800 dark:text-blue-200', dot: 'bg-blue-500' },
  COMPLETED: { bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-800 dark:text-emerald-200', dot: 'bg-emerald-500' },
  CANCELLED: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', dot: 'bg-gray-400' },
  EXPIRED: { bg: 'bg-rose-100 dark:bg-rose-900/40', text: 'text-rose-800 dark:text-rose-200', dot: 'bg-rose-500' },
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function daysBetween(fromIso) {
  if (!fromIso) return null
  const diff = new Date(fromIso) - new Date()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

function initials(name) {
  return (name || '').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')
}

export default function Reservations() {
  const navigate = useNavigate()
  const role = useSelector(selectUserRole)
  const isAdmin = role === 'ADMIN'
  const [reservations, setReservations] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('all')
  const [actionId, setActionId] = useState(null)
  const [detailReservation, setDetailReservation] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [confirmState, setConfirmState] = useState(null)
  const [error, setError] = useState(null)
  const [sortBy, setSortBy] = useState('reservationDate')
  const [sortOrder, setSortOrder] = useState('desc')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [overridePos, setOverridePos] = useState('')
  const [overriding, setOverriding] = useState(false)
  const mountedRef = useRef(true)
  const lastToastRef = useRef({ message: '', at: 0 })

  const showErrorOnce = (e) => {
    const message = getApiErrorMessage(e)
    const now = Date.now()
    if (lastToastRef.current.message === message && now - lastToastRef.current.at < 3000) return
    lastToastRef.current = { message, at: now }
    toast.error(message)
  }

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const [data, statsData] = await Promise.all([
        isAdmin ? reservationService.getAll({}) : reservationService.getMy(),
        isAdmin ? reservationService.getAdminStats() : reservationService.getStats(),
      ])
      if (!mountedRef.current) return
      setReservations(data)
      setStats(statsData)
      setError(null)
    } catch (e) {
      if (!mountedRef.current) return
      setError(e)
      if (!silent) showErrorOnce(e)
    } finally {
      if (!silent && mountedRef.current) setLoading(false)
    }
  }, [isAdmin])

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    let cancelled = false
    Promise.all([
      isAdmin ? reservationService.getAll({}) : reservationService.getMy(),
      isAdmin ? reservationService.getAdminStats() : reservationService.getStats(),
    ])
      .then(([data, statsData]) => {
        if (cancelled || !mountedRef.current) return
        setReservations(data)
        setStats(statsData)
        setError(null)
      })
      .catch((e) => {
        if (cancelled || !mountedRef.current) return
        setError(e)
        showErrorOnce(e)
      })
      .finally(() => {
        if (!cancelled && mountedRef.current) setLoading(false)
      })
    return () => { cancelled = true }
  }, [isAdmin])

  useEffect(() => {
    const timer = setInterval(() => load(true), 60000)
    return () => clearInterval(timer)
  }, [load])

  const openDetail = useCallback(async (id) => {
    setDetailLoading(true)
    setDetailOpen(true)
    try {
      const detail = await reservationService.getById(id)
      setDetailReservation(detail)
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    } finally {
      setDetailLoading(false)
    }
  }, [])

  const closeDetail = useCallback(() => {
    setDetailOpen(false)
    setDetailReservation(null)
  }, [])

  const { categories: dbCategories, loading: categoriesLoading, error: categoriesError, refresh: refreshCategories } = useCategories()
  const categories = useMemo(
    () => dbCategories.map((c) => c.name),
    [dbCategories],
  )

  const filtered = useMemo(() => {
    let rows = reservations
    if (tab !== 'all') {
      const statusMap = {
        waiting: 'WAITING',
        ready: 'READY_FOR_PICKUP',
        completed: 'COMPLETED',
        cancelled: 'CANCELLED',
        expired: 'EXPIRED',
      }
      rows = reservations.filter((r) => r.status === (statusMap[tab] || tab.toUpperCase()))
    }
    if (categoryFilter) {
      rows = rows.filter((r) => r.bookCategory === categoryFilter)
    }
    const q = search.trim().toLowerCase()
    if (q) {
      rows = rows.filter((r) =>
        (r.bookTitle || '').toLowerCase().includes(q) ||
        (r.bookAuthor || '').toLowerCase().includes(q) ||
        (r.bookIsbn || '').toLowerCase().includes(q) ||
        String(r.reservationNumber || '').toLowerCase().includes(q))
    }
    const list = [...rows]
    const dir = sortOrder === 'asc' ? 1 : -1
    list.sort((a, b) => {
      let cmp
      if (sortBy === 'queuePosition') cmp = (a.queuePosition ?? 0) - (b.queuePosition ?? 0)
      else if (sortBy === 'bookTitle') cmp = (a.bookTitle || '').localeCompare(b.bookTitle || '')
      else if (sortBy === 'memberName') cmp = (a.userName || '').localeCompare(b.userName || '')
      else cmp = new Date(a.reservationDate) - new Date(b.reservationDate)
      return cmp * dir
    })
    return list
  }, [reservations, tab, sortBy, sortOrder, search, categoryFilter])

  const exportCsv = () => {
    if (!filtered.length) {
      toast.error('Nothing to export')
      return
    }
    const headers = ['Reservation ID', 'Reservation No.', 'Member', 'Member ID', 'Email', 'Book', 'ISBN', 'Author', 'Reservation Date', 'Queue Position', 'Pickup Expiry', 'Status', 'Plan', 'Notification']
    const lines = [headers.join(',')]
    for (const r of filtered) {
      lines.push([
        r.id, r.reservationNumber ?? '',
        `"${(r.userName || '').replace(/"/g, '""')}"`, r.userId ?? '', r.userEmail ?? '',
        `"${(r.bookTitle || '').replace(/"/g, '""')}"`, r.bookIsbn ?? '',
        `"${(r.bookAuthor || '').replace(/"/g, '""')}"`,
        formatDateTime(r.reservationDate), r.queuePosition ?? '',
        r.pickupExpiryDate ? formatDateTime(r.pickupExpiryDate) : '',
        STATUS_LABEL[r.status] || r.status, r.membershipPlanName ?? '',
        r.notificationSent ? 'Sent' : 'Not sent',
      ].join(','))
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.setAttribute('download', `reservations-${tab}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('CSV exported')
  }

  const applyOverride = async () => {
    const pos = parseInt(overridePos, 10)
    if (!pos || pos < 1) {
      toast.error('Enter a valid queue position')
      return
    }
    if (!detailReservation) return
    setOverriding(true)
    try {
      await reservationService.overrideQueue(detailReservation.id, pos)
      toast.success(`Queue position updated to #${pos}`)
      setOverridePos('')
      closeDetail()
      load()
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    } finally {
      setOverriding(false)
    }
  }

  const handleAction = async (action, id, detail = null) => {
    setActionId(`${action}-${id}`)
    try {
      switch (action) {
        case 'approve':
          await reservationService.approve(id)
          toast.success('Reservation approved')
          break
        case 'cancel':
          await reservationService.cancel(id)
          toast.success('Reservation cancelled')
          break
        case 'adminCancel':
          await reservationService.adminCancel(id)
          toast.success('Reservation cancelled')
          break
        case 'pickup':
          await reservationService.markPickup(id)
          toast.success('Pickup confirmed')
          break
        case 'complete':
          await reservationService.markComplete(id)
          toast.success('Reservation completed')
          break
        case 'expire':
          await reservationService.expire(id)
          toast.success('Reservation expired')
          break
        case 'delete':
          await reservationService.remove(id)
          toast.success('Reservation deleted')
          break
        case 'borrow':
          await borrowBook(detail?.bookId)
          toast.success('Book borrowed — enjoy reading!')
          break
        case 'reserveAgain':
          await reserveBook(detail?.bookId)
          toast.success('Reservation created — check your queue position')
          break
        default:
          break
      }
      load()
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    } finally {
      setActionId(null)
    }
  }

  const requestConfirm = (action, id, detail = null) => {
    setConfirmState({ action, id, detail })
  }

  const confirmLabels = {
    approve: { title: 'Approve Reservation', body: 'Approve this reservation and mark the book as ready for pickup?' },
    cancel: { title: 'Cancel Reservation', body: 'Cancelling will remove you from the waiting queue. This cannot be undone.' },
    adminCancel: { title: 'Cancel Reservation', body: 'Cancel this reservation for the user? The next person in the queue will be notified.' },
    pickup: { title: 'Confirm Pickup', body: 'Confirm that the book has been picked up and issue it to the member?' },
    expire: { title: 'Expire Reservation', body: 'Expire this reservation now? The next person in the queue will be notified.' },
    delete: { title: 'Delete Reservation', body: 'Permanently delete this record? This cannot be undone.' },
    borrow: { title: 'Borrow Now', body: 'Borrow this reserved book now? The reservation will be completed and a loan created.' },
    reserveAgain: { title: 'Reserve Again', body: 'Create a new reservation for this book?' },
  }

  const statCards = [
    { label: 'Total Reservations', value: stats?.total || 0, icon: BookOpen, color: 'bg-primary-50 text-primary-600 dark:bg-primary-950 dark:text-primary-300' },
    { label: 'Waiting', value: stats?.waiting || 0, icon: Clock, color: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300' },
    { label: 'Ready for Pickup', value: stats?.readyForPickup || 0, icon: AlertTriangle, color: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300' },
    { label: 'Completed', value: stats?.completed || 0, icon: CheckCircle, color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300' },
    { label: 'Cancelled', value: stats?.cancelled || 0, icon: XCircle, color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
    { label: 'Expired', value: stats?.expired || 0, icon: Ban, color: 'bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-300' },
  ]

  if (loading && reservations.length === 0) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
      </div>
    )
  }

  if (error && reservations.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 py-20 text-center dark:border-rose-900 dark:bg-rose-950/30">
        <AlertTriangle className="h-14 w-14 text-rose-400" />
        <h3 className="mt-4 text-lg font-semibold text-rose-700 dark:text-rose-300">Unable to load reservations</h3>
        <p className="mt-1 max-w-sm text-sm text-rose-500">{getApiErrorMessage(error)}</p>
        <Button className="mt-5" icon={RefreshCw} onClick={() => load()}>Try Again</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">{isAdmin ? 'Reservations' : 'My Reservations'}</h1>
          <p className="text-sm text-gray-500">
            {isAdmin ? 'Manage all reservations and waiting queues' : 'Track your book reservations and pickup status'}
          </p>
        </div>
        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <ArrowUpDown className="h-4 w-4 text-gray-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent text-sm font-semibold text-gray-700 outline-none dark:text-gray-200"
              >
                <option value="reservationDate">Reservation Date</option>
                <option value="queuePosition">Queue Position</option>
                <option value="bookTitle">Book Title</option>
                <option value="memberName">Member Name</option>
              </select>
              <button
                type="button"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="rounded-lg px-1.5 py-0.5 text-xs font-bold text-gray-500 transition hover:bg-gray-100 dark:hover:bg-gray-800"
                title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
              >
                {sortOrder === 'asc' ? 'A→Z' : 'Z→A'}
              </button>
            </div>
            <Button variant="secondary" size="sm" type="button" icon={Download} onClick={exportCsv} disabled={!filtered.length}>
              Export CSV
            </Button>
          </div>
        )}
        <Button variant="secondary" size="sm" type="button" icon={RefreshCw} onClick={load} loading={loading}>
          Refresh
        </Button>
      </div>

      {error && reservations.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <p className="flex-1">Could not refresh reservations. Showing previously loaded data.</p>
          <Button variant="secondary" size="xs" onClick={() => load()} loading={loading}>Retry</Button>
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {statCards.map((s) => (
            <div key={s.label} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${s.color}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-50">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {isAdmin && stats && (
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-gray-50">
            <TrendingUp className="h-4 w-4 text-primary-500" /> Reservation Analytics
          </h3>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800/50">
              <p className="flex items-center gap-1.5 text-xs text-gray-400"><Clock className="h-3.5 w-3.5" /> Avg. Wait Time</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-50">
                {stats.avgWaitHours != null ? (stats.avgWaitHours < 1 ? '<1' : Math.round(stats.avgWaitHours)) : 0}
                <span className="ml-1 text-sm font-medium text-gray-400">{stats.avgWaitHours != null && stats.avgWaitHours < 1 && stats.avgWaitHours > 0 ? 'hr' : 'hrs'}</span>
              </p>
              <p className="mt-1 text-xs text-gray-500">reservation → completion</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800/50">
              <p className="flex items-center gap-1.5 text-xs text-gray-400"><ThumbsUp className="h-3.5 w-3.5" /> Success Rate</p>
              <p className="mt-1 text-2xl font-bold text-emerald-600">{stats.successRate ?? 0}%</p>
              <p className="mt-1 text-xs text-gray-500">completed vs resolved</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800/50">
              <p className="flex items-center gap-1.5 text-xs text-gray-400"><TrendingUp className="h-3.5 w-3.5" /> Most Reserved Books</p>
              {stats.mostReservedBooks?.length ? (
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {stats.mostReservedBooks.slice(0, 5).map((b) => (
                    <button
                      key={b.bookId}
                      type="button"
                      onClick={() => navigate(`/books/${b.bookId}`)}
                      className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 transition hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-300"
                    >
                      {b.title} <span className="text-indigo-400">×{b.reservationCount}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs text-gray-400">No data yet</p>
              )}
            </div>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-4">
            <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800/50">
              <p className="flex items-center gap-1.5 text-xs text-gray-400"><CalendarClock className="h-3.5 w-3.5" /> Today's Reservations</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-50">{stats.todayReservations ?? 0}</p>
              <p className="mt-1 text-xs text-gray-500">created today</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800/50">
              <p className="flex items-center gap-1.5 text-xs text-gray-400"><Clock className="h-3.5 w-3.5" /> Peak Reservation Hours</p>
              {stats.peakReservationHours?.length ? (
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {stats.peakReservationHours.map((h) => (
                    <span key={h.hour} className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                      {String(h.hour).padStart(2, '0')}:00 <span className="text-amber-400">×{h.count}</span>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs text-gray-400">No data yet</p>
              )}
            </div>
            <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800/50">
              <p className="flex items-center gap-1.5 text-xs text-gray-400"><Users className="h-3.5 w-3.5" /> Top Active Members</p>
              {stats.topActiveMembers?.length ? (
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {stats.topActiveMembers.map((m) => (
                    <span key={m.name} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      {m.name} <span className="text-emerald-400">×{m.count}</span>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs text-gray-400">No data yet</p>
              )}
            </div>
            <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800/50">
              <p className="flex items-center gap-1.5 text-xs text-gray-400"><BarChart3 className="h-3.5 w-3.5" /> Monthly Trends</p>
              {stats.monthlyTrends?.length ? (
                <div className="mt-1.5 flex items-end gap-1">
                  {stats.monthlyTrends.slice(-6).map((m) => (
                    <div key={m.month} className="flex flex-1 flex-col items-center gap-1" title={`${m.month}: ${m.count}`}>
                      <div
                        className="w-full rounded-sm bg-primary-500/80"
                        style={{ height: `${Math.max(3, Math.min(32, (m.count || 0) * 4))}px` }}
                      />
                      <span className="text-[10px] text-gray-400">{m.month.slice(2)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs text-gray-400">No data yet</p>
              )}
            </div>
          </div>
        </div>
      )}

      <CategorySearchBar
        categories={categories.map((c) => ({ value: c, label: c }))}
        selectedCategory={categoryFilter}
        onCategoryChange={setCategoryFilter}
        value={search}
        onValueChange={setSearch}
        placeholder="Search by title, author, ISBN or reservation no..."
        ariaLabel="Search reservations"
        loading={categoriesLoading}
        error={categoriesError}
        onRetry={refreshCategories}
      />

      <div className="flex flex-wrap gap-2 rounded-2xl border border-gray-100 bg-white p-2 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        {['all', 'waiting', 'ready', 'completed', 'cancelled', 'expired'].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition capitalize ${
              tab === t ? 'bg-primary-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'
            }`}
          >
            {t === 'ready' ? 'Ready for Pickup' : t === 'all' ? 'All' : t}
          </button>
        ))}
      </div>

      {!loading && filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center dark:border-gray-800 dark:bg-gray-900">
          <BookOpen className="h-10 w-10 text-gray-400" />
          <p className="mt-3 text-lg font-semibold text-gray-800 dark:text-gray-100">
            {tab === 'all' ? 'No Reservations Yet' : `No ${tab} reservations`}
          </p>
          <p className="mt-1 text-sm text-gray-500 max-w-sm">
            {tab === 'all' ? 'Reserve books that are currently unavailable and track your queue position here.' : 'No reservations match this status.'}
          </p>
          <Button className="mt-5" icon={BookOpen} onClick={() => navigate('/books')}>
            Browse Books
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((res) => {
            const StatusIcon = STATUS_ICONS[res.status] || Clock
            const isWaiting = res.status === 'WAITING'
            const isReady = res.status === 'READY_FOR_PICKUP'
            const isCompleted = res.status === 'COMPLETED'
            const isCancelled = res.status === 'CANCELLED'
            const isExpired = res.status === 'EXPIRED'
            const badge = STATUS_BADGE[res.status] || STATUS_BADGE.WAITING
            const expiryDate = res.pickupExpiryDate ? new Date(res.pickupExpiryDate) : null
            const hoursLeft = expiryDate ? Math.max(0, Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60))) : 0
            const daysLeft = daysBetween(res.pickupExpiryDate)
            const coverSrc = coverOrSlug(res.bookCoverImageUrl, res.bookTitle)

            return (
              <div
                key={res.id}
                className={`flex flex-col rounded-2xl border bg-white p-5 shadow-sm transition dark:bg-gray-900 ${
                  isReady ? 'border-blue-200 ring-1 ring-blue-400/30 dark:border-blue-800' : 'border-gray-100 dark:border-gray-800'
                }`}
              >
                <div className="flex gap-3">
                  <BookCover
                    src={coverSrc}
                    alt={res.bookTitle}
                    className="h-16 w-12 shrink-0 rounded-lg ring-1 ring-gray-200 dark:ring-gray-700"
                    imgClassName="h-full w-full rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => navigate(`/books/${res.bookId}`)}
                      className="text-left text-base font-bold text-gray-900 dark:text-gray-50 line-clamp-1 transition hover:text-primary-600 dark:hover:text-primary-400"
                      title="View Book Details"
                    >
                      {res.bookTitle || 'Unknown Book'}
                    </button>
                    <p className="text-sm text-gray-500">{res.bookAuthor}</p>
                    {res.bookIsbn && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-400 font-mono">
                        <Hash className="h-3 w-3" /> {res.bookIsbn}
                      </p>
                    )}
                    {res.reservationNumber && (
                      <p className="mt-0.5 text-[11px] text-gray-400 font-mono">
                        Reservation {res.reservationNumber}
                      </p>
                    )}
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {res.bookCategory && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                          <Tag className="h-3 w-3" /> {res.bookCategory}
                        </span>
                      )}
                      {res.bookShelf && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                          <MapPin className="h-3 w-3" /> {res.bookShelf}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {isAdmin && res.userName && (
                  <button
                    type="button"
                    onClick={() => navigate('/users')}
                    className="mt-3 flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 text-left transition hover:bg-gray-100 dark:bg-gray-800/50 dark:hover:bg-gray-800"
                    title="View Member"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-indigo-600 text-xs font-bold text-white">
                      {initials(res.userName)}
                    </div>
                    <div className="min-w-0">
                      <p className="flex items-center gap-1 text-sm font-semibold text-gray-900 dark:text-gray-50">
                        <User className="h-3 w-3 text-gray-400" /> {res.userName}
                      </p>
                      <p className="flex items-center gap-1 text-xs text-gray-500 truncate">
                        <Mail className="h-3 w-3" /> {res.userEmail}
                      </p>
                    </div>
                    {res.membershipPlanName && (
                      <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                        <Crown className="h-3 w-3" /> {res.membershipPlanName}
                      </span>
                    )}
                  </button>
                )}

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StatusIcon className={`h-4 w-4 ${badge.text}`} />
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${badge.bg} ${badge.text}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                      {STATUS_LABEL[res.status] || res.status}
                    </span>
                  </div>
                  <span className="inline-flex items-center justify-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                    #{res.queuePosition}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 rounded-xl bg-gray-50 p-3 text-xs dark:bg-gray-800/50">
                  <div>
                    <p className="text-gray-400">Reserved On</p>
                    <p className="font-medium text-gray-900 dark:text-gray-50">{formatDate(res.reservationDate)}</p>
                  </div>
                  {isWaiting && (
                    <div>
                      <p className="text-gray-400">Est. Wait</p>
                      <p className="font-medium text-amber-600">~{Math.max(1, (res.queuePosition || 1) * 3 - 2)} days</p>
                    </div>
                  )}
                  {isReady && expiryDate && (
                    <div>
                      <p className="text-gray-400">Collect Before</p>
                      <p className={`font-medium ${hoursLeft < 6 ? 'text-rose-600' : 'text-blue-600'}`}>
                        {daysLeft && daysLeft > 0 ? `${daysLeft} day${daysLeft > 1 ? 's' : ''}` : `${hoursLeft}h left`}
                      </p>
                    </div>
                  )}
                  {isCompleted && res.completedAt && (
                    <div>
                      <p className="text-gray-400">Completed On</p>
                      <p className="font-medium text-emerald-600">{formatDate(res.completedAt)}</p>
                    </div>
                  )}
                  {(isCancelled || isExpired) && res.completedAt && (
                    <div>
                      <p className="text-gray-400">{isCancelled ? 'Cancelled On' : 'Expired On'}</p>
                      <p className="font-medium text-gray-900 dark:text-gray-50">{formatDate(res.completedAt)}</p>
                    </div>
                  )}
                  {isReady && expiryDate && (
                    <div className="col-span-2">
                      <p className="text-gray-400">Pickup Expiry</p>
                      <p className="font-medium text-gray-900 dark:text-gray-50">{formatDateTime(res.pickupExpiryDate)}</p>
                    </div>
                  )}
                </div>

                <div className="mt-auto flex flex-wrap gap-2 pt-4">
                  <Button
                    variant="secondary" size="sm" type="button" icon={Eye}
                    onClick={() => openDetail(res.id)}
                    className="flex-1"
                  >
                    View Details
                  </Button>
                  {isReady && !isAdmin && (
                    <Button
                      variant="primary" size="sm" type="button" icon={BookOpen}
                      loading={actionId === `borrow-${res.id}`}
                      onClick={() => requestConfirm('borrow', res.id, res)}
                      className="flex-1"
                    >
                      Borrow Now
                    </Button>
                  )}
                  {isExpired && (
                    <Button
                      variant="secondary" size="sm" type="button" icon={RefreshCw}
                      loading={actionId === `reserveAgain-${res.id}`}
                      onClick={() => requestConfirm('reserveAgain', res.id, res)}
                      className="flex-1"
                    >
                      Reserve Again
                    </Button>
                  )}
                  {isWaiting && isAdmin && (
                    <Button
                      variant="primary" size="sm" type="button" icon={ThumbsUp}
                      loading={actionId === `approve-${res.id}`}
                      onClick={() => requestConfirm('approve', res.id, res)}
                      className="flex-1"
                    >
                      Approve
                    </Button>
                  )}
                  {isWaiting && (
                    <Button
                      variant="danger" size="sm" type="button" icon={XCircle}
                      loading={actionId === `cancel-${res.id}`}
                      onClick={() => requestConfirm('cancel', res.id, res)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  )}
                  {isReady && isAdmin && (
                    <Button
                      variant="primary" size="sm" type="button" icon={CheckCircle}
                      loading={actionId === `pickup-${res.id}`}
                      onClick={() => requestConfirm('pickup', res.id, res)}
                      className="flex-1"
                    >
                      Mark Picked Up
                    </Button>
                  )}
                  {isReady && (
                    <Button
                      variant="danger" size="sm" type="button" icon={XCircle}
                      loading={actionId === `adminCancel-${res.id}`}
                      onClick={() => requestConfirm('adminCancel', res.id, res)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  )}
                  {isReady && isAdmin && (
                    <Button
                      variant="danger" size="sm" type="button" icon={Ban}
                      loading={actionId === `expire-${res.id}`}
                      onClick={() => requestConfirm('expire', res.id, res)}
                      className="flex-1"
                    >
                      Expire
                    </Button>
                  )}
                  {isCompleted && res.loanId && (
                    <Button
                      variant="secondary" size="sm" type="button" icon={ExternalLink}
                      onClick={() => navigate('/issued-books')}
                      className="flex-1"
                    >
                      View Loan
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal
        open={detailOpen}
        title="Reservation Details"
        onClose={closeDetail}
        size="lg"
        footer={
          detailReservation && (
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" type="button" onClick={closeDetail}>Close</Button>
              {detailReservation.status === 'WAITING' && isAdmin && (
                <Button variant="primary" size="sm" type="button" onClick={() => { closeDetail(); requestConfirm('approve', detailReservation.id) }}>
                  Approve Reservation
                </Button>
              )}
              {detailReservation.status === 'WAITING' && (
                <Button variant="danger" size="sm" type="button" onClick={() => { closeDetail(); requestConfirm('cancel', detailReservation.id) }}>
                  Cancel Reservation
                </Button>
              )}
              {detailReservation.status === 'READY_FOR_PICKUP' && !isAdmin && (
                <Button variant="primary" size="sm" type="button" icon={BookOpen} onClick={() => { closeDetail(); requestConfirm('borrow', detailReservation.id, detailReservation) }}>
                  Borrow Now
                </Button>
              )}
              {detailReservation.status === 'READY_FOR_PICKUP' && isAdmin && (
                <Button variant="primary" size="sm" type="button" onClick={() => { closeDetail(); requestConfirm('pickup', detailReservation.id) }}>
                  Mark Picked Up
                </Button>
              )}
              {detailReservation.status === 'READY_FOR_PICKUP' && (
                <Button variant="danger" size="sm" type="button" onClick={() => { closeDetail(); requestConfirm('adminCancel', detailReservation.id) }}>
                  Cancel Reservation
                </Button>
              )}
              {detailReservation.status === 'READY_FOR_PICKUP' && isAdmin && (
                <Button variant="danger" size="sm" type="button" onClick={() => { closeDetail(); requestConfirm('expire', detailReservation.id) }}>
                  Expire Reservation
                </Button>
              )}
              {detailReservation.status === 'EXPIRED' && isAdmin && (
                <Button variant="danger" size="sm" type="button" onClick={() => { closeDetail(); requestConfirm('delete', detailReservation.id) }}>
                  Delete Record
                </Button>
              )}
              {detailReservation.status === 'COMPLETED' && detailReservation.loanId && (
                <Button variant="secondary" size="sm" type="button" icon={ExternalLink} onClick={() => { closeDetail(); navigate('/issued-books') }}>
                  View Loan
                </Button>
              )}
            </div>
          )
        }
      >
        {detailLoading ? (
          <div className="flex flex-col gap-4 py-8">
            <div className="flex items-center gap-4">
              <div className="skeleton h-14 w-14 shrink-0 rounded-full" />
              <div className="flex flex-col gap-3">
                <div className="skeleton h-4 w-32" />
                <div className="skeleton h-4 w-24" />
              </div>
            </div>
            <div className="skeleton h-24 w-full" />
          </div>
        ) : detailReservation ? (
          <div className="space-y-5">
            <div className="flex gap-4 rounded-xl bg-gray-50 p-4 dark:bg-gray-800/50">
              <BookCover
                src={coverOrSlug(detailReservation.bookCoverImageUrl, detailReservation.bookTitle)}
                alt={detailReservation.bookTitle}
                className="h-20 w-14 shrink-0 rounded-lg ring-1 ring-gray-200 dark:ring-gray-700"
                imgClassName="h-full w-full rounded-lg object-cover"
              />
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50">{detailReservation.bookTitle}</h3>
                <p className="text-sm text-gray-500">{detailReservation.bookAuthor}</p>
                {detailReservation.bookIsbn && (
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-400 font-mono">
                    <Hash className="h-3 w-3" /> ISBN: {detailReservation.bookIsbn}
                  </p>
                )}
                {detailReservation.bookPublisher && (
                  <p className="mt-0.5 text-xs text-gray-400">Publisher: {detailReservation.bookPublisher}</p>
                )}
                <div className="mt-1 flex flex-wrap gap-2">
                  {detailReservation.bookCategory && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                      <Tag className="h-3 w-3" /> {detailReservation.bookCategory}
                    </span>
                  )}
                  {detailReservation.bookShelf && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      <MapPin className="h-3 w-3" /> {detailReservation.bookShelf}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => { closeDetail(); navigate(`/books/${detailReservation.bookId}`) }}
                    className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600 transition hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    <ExternalLink className="h-3 w-3" /> View Book
                  </button>
                </div>
              </div>
            </div>

            {detailReservation.userName && (
              <button
                type="button"
                onClick={() => isAdmin && (closeDetail(), navigate('/users'))}
                className={`flex items-center gap-3 rounded-xl bg-gray-50 p-3 text-left transition dark:bg-gray-800/50 ${isAdmin ? 'hover:bg-gray-100 dark:hover:bg-gray-800' : ''}`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-indigo-600 text-sm font-bold text-white">
                  {initials(detailReservation.userName)}
                </div>
                <div>
                  <p className="flex items-center gap-1 text-sm font-semibold text-gray-900 dark:text-gray-50">
                    <User className="h-3 w-3 text-gray-400" /> {detailReservation.userName}
                  </p>
                  <p className="flex items-center gap-1 text-xs text-gray-500">
                    <Mail className="h-3 w-3" /> {detailReservation.userEmail}
                  </p>
                </div>
                {detailReservation.membershipPlanName && (
                  <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                    <Crown className="h-3 w-3" /> {detailReservation.membershipPlanName}
                  </span>
                )}
              </button>
            )}

            <div className="flex items-center justify-between">
              {(() => { const SI = STATUS_ICONS[detailReservation.status] || Clock; return (
              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ring-1 ring-inset ${STATUS_COLORS[detailReservation.status] || STATUS_COLORS.WAITING}`}>
                <SI className="h-4 w-4" />
                {STATUS_LABEL[detailReservation.status] || detailReservation.status}
              </span>
              )})()}
              <span className="text-sm text-gray-400">Queue #{detailReservation.queuePosition}</span>
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Timer className="h-4 w-4" /> Reservation Timeline
              </h4>
              <div className="relative border-l-2 border-gray-200 dark:border-gray-700 pl-4 space-y-3">
                {STATUS_STEPS[detailReservation.status]?.map((step, i) => {
                  const steps = STATUS_STEPS[detailReservation.status] || []
                  const currentStepLabel = detailReservation.status === 'COMPLETED' ? 'Completed'
                    : detailReservation.status === 'READY_FOR_PICKUP' ? 'Ready for pickup'
                    : detailReservation.status === 'WAITING' ? 'Waiting in queue'
                    : detailReservation.status === 'CANCELLED' ? 'Cancelled'
                    : detailReservation.status === 'EXPIRED' ? 'Pickup expired'
                    : 'Reserved'
                  const currentIdx = steps.indexOf(currentStepLabel)
                  const isPast = i < currentIdx
                  const isCurrent = i === currentIdx
                  return (
                    <div key={i} className={`flex items-center gap-2 text-xs ${isPast ? 'text-emerald-600 dark:text-emerald-400' : isCurrent ? 'text-primary-600 dark:text-primary-400 font-semibold' : 'text-gray-400'}`}>
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${isPast ? 'bg-emerald-500' : isCurrent ? 'bg-primary-500 ring-4 ring-primary-100 dark:ring-primary-900' : 'bg-gray-300'}`} />
                      <span>{step}</span>
                      {isPast && <CheckCircle className="h-3 w-3" />}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-gray-50 p-3 text-xs dark:bg-gray-800/50">
                <p className="text-gray-400">Reservation ID</p>
                <p className="font-medium text-gray-900 dark:text-gray-50 font-mono">#{detailReservation.id}</p>
              </div>
              {detailReservation.reservationNumber && (
                <div className="rounded-xl bg-gray-50 p-3 text-xs dark:bg-gray-800/50">
                  <p className="text-gray-400">Reservation No.</p>
                  <p className="font-medium text-primary-600 font-mono">{detailReservation.reservationNumber}</p>
                </div>
              )}
              <div className="rounded-xl bg-gray-50 p-3 text-xs dark:bg-gray-800/50">
                <p className="text-gray-400">Queue Position</p>
                <p className="font-medium text-gray-900 dark:text-gray-50">#{detailReservation.queuePosition}</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-3 text-xs dark:bg-gray-800/50">
                <p className="text-gray-400">Reserved On</p>
                <p className="font-medium text-gray-900 dark:text-gray-50">{formatDate(detailReservation.reservationDate)}</p>
              </div>
              {detailReservation.estimatedWaitDays != null && detailReservation.status === 'WAITING' && (
                <div className="rounded-xl bg-gray-50 p-3 text-xs dark:bg-gray-800/50">
                  <p className="text-gray-400">Est. Wait</p>
                  <p className="font-medium text-amber-600">~{detailReservation.estimatedWaitDays} days</p>
                </div>
              )}
              {detailReservation.pickupExpiryDate && (
                <div className="rounded-xl bg-gray-50 p-3 text-xs dark:bg-gray-800/50">
                  <p className="text-gray-400">Pickup By</p>
                  <p className="font-medium text-gray-900 dark:text-gray-50">{formatDateTime(detailReservation.pickupExpiryDate)}</p>
                </div>
              )}
              <div className="rounded-xl bg-gray-50 p-3 text-xs dark:bg-gray-800/50">
                <p className="text-gray-400">Notification</p>
                <p className={`font-medium ${detailReservation.notificationSent ? 'text-emerald-600' : 'text-gray-500'}`}>
                  {detailReservation.notificationSent ? 'Notification Sent' : 'Not sent'}
                </p>
              </div>
              {detailReservation.membershipPlanName && (
                <div className="rounded-xl bg-gray-50 p-3 text-xs dark:bg-gray-800/50">
                  <p className="text-gray-400">Membership Plan</p>
                  <p className="flex items-center gap-1 font-medium text-indigo-600 dark:text-indigo-300">
                    <Crown className="h-3 w-3" /> {detailReservation.membershipPlanName}
                  </p>
                </div>
              )}
              {detailReservation.completedAt && (
                <div className="rounded-xl bg-gray-50 p-3 text-xs dark:bg-gray-800/50">
                  <p className="text-gray-400">Last Updated</p>
                  <p className="font-medium text-gray-900 dark:text-gray-50">{formatDateTime(detailReservation.updatedAt || detailReservation.completedAt)}</p>
                </div>
              )}
              {detailReservation.loanId && (
                <div className="rounded-xl bg-gray-50 p-3 text-xs dark:bg-gray-800/50">
                  <p className="text-gray-400">Loan ID</p>
                  <p className="font-medium text-primary-600">#{detailReservation.loanId}</p>
                </div>
              )}
              <div className="rounded-xl bg-gray-50 p-3 text-xs dark:bg-gray-800/50">
                <p className="text-gray-400">Created</p>
                <p className="font-medium text-gray-900 dark:text-gray-50">{formatDateTime(detailReservation.createdAt)}</p>
              </div>
            </div>

            {detailReservation.status === 'WAITING' && isAdmin && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs dark:border-amber-900 dark:bg-amber-950/40">
                <p className="flex items-center gap-1 font-semibold text-amber-800 dark:text-amber-200">
                  <ArrowUpDown className="h-3.5 w-3.5" /> Override Queue Position
                </p>
                <p className="mt-0.5 text-[11px] text-amber-700 dark:text-amber-300">
                  Explicitly reposition this reservation in the FIFO queue (admin override).
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    value={overridePos}
                    onChange={(e) => setOverridePos(e.target.value)}
                    placeholder={`Current: #${detailReservation.queuePosition}`}
                    className="w-40 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                  />
                  <Button variant="primary" size="xs" type="button" icon={ArrowUpDown} onClick={applyOverride} loading={overriding}>
                    Apply Override
                  </Button>
                </div>
              </div>
            )}

            {detailReservation.notes && (
              <div className="rounded-xl bg-gray-50 p-3 text-xs dark:bg-gray-800/50">
                <p className="text-gray-400">Notes</p>
                <p className="mt-0.5 text-gray-700 dark:text-gray-300">{detailReservation.notes}</p>
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      <Modal
        open={!!confirmState}
        title={confirmState ? (confirmLabels[confirmState.action] || {}).title || 'Confirm Action' : ''}
        onClose={() => setConfirmState(null)}
        size="sm"
        footer={
          confirmState && (
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" type="button" onClick={() => setConfirmState(null)}>
                No, Go Back
              </Button>
              <Button
                variant={confirmState.action === 'approve' || confirmState.action === 'pickup' || confirmState.action === 'borrow' || confirmState.action === 'reserveAgain' ? 'primary' : 'danger'}
                size="sm"
                type="button"
                loading={actionId === `${confirmState.action}-${confirmState.id}`}
                onClick={() => {
                  const { action, id, detail } = confirmState
                  setConfirmState(null)
                  handleAction(action, id, detail)
                }}
              >
                Yes, {confirmState.action === 'pickup' ? 'Confirm Pickup' : confirmState.action === 'borrow' ? 'Borrow Now' : confirmState.action === 'reserveAgain' ? 'Reserve Again' : 'Confirm'}
              </Button>
            </div>
          )
        }
      >
        {confirmState && (
          <div className="flex flex-col items-center gap-3 py-2 text-center">
            <div className={`flex h-12 w-12 items-center justify-center rounded-full ${
              confirmState.action === 'approve' || confirmState.action === 'pickup'
                ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40'
                : 'bg-rose-100 text-rose-600 dark:bg-rose-900/40'
            }`}>
              <AlertTriangle className="h-6 w-6" />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {(confirmLabels[confirmState.action] || {}).body || 'Are you sure?'}
            </p>
            {confirmState.detail && (
              <p className="text-xs text-gray-400">
                {confirmState.detail.bookTitle}
                {confirmState.detail.reservationNumber ? ` · ${confirmState.detail.reservationNumber}` : ''}
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
