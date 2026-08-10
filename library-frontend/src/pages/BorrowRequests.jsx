import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import {
  Book, CheckCircle2, XCircle, RefreshCw, Clock, Eye, Crown,
  Search, ShieldAlert, AlertTriangle, Ban, ExternalLink, CalendarClock, X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { selectUserRole } from '../store/authSlice.js'
import Button from '../components/Button.jsx'
import BookCover from '../components/BookCover.jsx'
import Modal from '../components/Modal.jsx'
import Pagination from '../components/Pagination.jsx'
import { CardSkeleton } from '../components/PageSkeleton.jsx'
import { borrowRequestService, getApiErrorMessage } from '../services/api.js'
import { coverOrSlug } from '../utils/bookCovers.js'

const STATUS_LABEL = {
  PENDING: 'Waiting for Approval',
  APPROVED: 'Approved',
  REJECTED: 'Not Approved',
  CANCELLED: 'Cancelled',
}

const STATUS_BADGE = {
  PENDING: { bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-800 dark:text-amber-200', dot: 'bg-amber-500' },
  APPROVED: { bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-800 dark:text-emerald-200', dot: 'bg-emerald-500' },
  REJECTED: { bg: 'bg-rose-100 dark:bg-rose-900/40', text: 'text-rose-800 dark:text-rose-200', dot: 'bg-rose-500' },
  CANCELLED: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-300', dot: 'bg-gray-400' },
}

const PLAN_OPTIONS = ['Student', 'Basic', 'Silver', 'Gold', 'Premium']

const DATE_RANGE_OPTIONS = [
  { key: 'all', label: 'All Time' },
  { key: 'today', label: 'Today' },
  { key: '7d', label: 'Last 7 Days' },
  { key: '30d', label: 'Last 30 Days' },
  { key: 'custom', label: 'Custom Range' },
]

const SORT_OPTIONS = [
  { key: 'newest', label: 'Newest First' },
  { key: 'oldest', label: 'Oldest First' },
  { key: 'borrowDate', label: 'Borrow Date' },
  { key: 'dueDate', label: 'Due Date' },
]

const QUICK_REJECT_REASONS = [
  'Book reserved for another member',
  'Borrow limit exceeded',
  'Membership expired',
  'Outstanding fine on account',
  'Suspected policy violation',
]

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function initials(name) {
  if (!name) return '?'
  return name.split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase()
}

function StatusBadge({ status }) {
  const s = STATUS_BADGE[status] || STATUS_BADGE.PENDING
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${s.bg} ${s.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {STATUS_LABEL[status] || status}
    </span>
  )
}

function MemberCell({ r }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-xs font-bold text-white">
        {initials(r.userName)}
      </div>
      <div className="min-w-0">
        <p className="truncate font-medium text-gray-900 dark:text-gray-50">{r.userName}</p>
        <p className="truncate text-xs text-gray-500">{r.userEmail}</p>
      </div>
    </div>
  )
}

function BookCell({ r }) {
  return (
    <div className="flex items-center gap-3">
      <BookCover
        src={coverOrSlug(r.bookCoverImageUrl, r.bookTitle)}
        alt=""
        className="h-10 w-7 shrink-0"
        imgClassName="h-full w-full rounded-sm object-cover"
      />
      <div className="min-w-0 max-w-xs">
        <p className="truncate font-medium text-gray-900 dark:text-gray-50">{r.bookTitle}</p>
        <p className="truncate text-xs text-gray-500">{r.bookAuthor}</p>
        {r.bookIsbn && <p className="truncate font-mono text-[11px] text-gray-400">{r.bookIsbn}</p>}
      </div>
    </div>
  )
}

const CARD_STYLES = {
  PENDING: { label: 'Waiting for Approval', icon: Clock, iconBg: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', active: 'border-amber-500 bg-amber-50 dark:border-amber-600 dark:bg-amber-950/40' },
  APPROVED: { label: 'Approved', icon: CheckCircle2, iconBg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', active: 'border-emerald-500 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/40' },
  REJECTED: { label: 'Not Approved', icon: XCircle, iconBg: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300', active: 'border-rose-500 bg-rose-50 dark:border-rose-600 dark:bg-rose-950/40' },
  CANCELLED: { label: 'Cancelled', icon: Ban, iconBg: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300', active: 'border-gray-500 bg-gray-50 dark:border-gray-600 dark:bg-gray-800/60' },
}

export default function BorrowRequests() {
  const navigate = useNavigate()
  const role = useSelector(selectUserRole)
  const isStaff = role === 'ADMIN'

  const [requests, setRequests] = useState([])
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, cancelled: 0, total: 0 })
  const [loading, setLoading] = useState(true)

  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [planFilter, setPlanFilter] = useState('ALL')
  const [dateRange, setDateRange] = useState('all')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [sort, setSort] = useState('newest')
  const [page, setPage] = useState(0)

  const [actionId, setActionId] = useState(null)
  const [approveTarget, setApproveTarget] = useState(null)
  const [approveInfo, setApproveInfo] = useState(null)
  const [infoLoading, setInfoLoading] = useState(false)
  const [rejectTarget, setRejectTarget] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejecting, setRejecting] = useState(false)
  const [detailRequest, setDetailRequest] = useState(null)
  const [detailInfo, setDetailInfo] = useState(null)
  const [reasonTarget, setReasonTarget] = useState(null)
  const [cancelTarget, setCancelTarget] = useState(null)
  const [cancelling, setCancelling] = useState(false)

  const loadStats = useCallback(async () => {
    if (!isStaff) return
    try {
      const s = await borrowRequestService.getStats()
      setStats(s)
    } catch {
      // stats are best-effort
    }
  }, [isStaff])

  const load = useCallback(async () => {
    try {
      const data = isStaff
        ? await borrowRequestService.getAll({})
        : await borrowRequestService.getMy()
      setRequests(data)
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    } finally {
      setLoading(false)
    }
    loadStats()
  }, [isStaff, loadStats])

  useEffect(() => {
    load()
  }, [load])

  const refreshAll = useCallback(() => {
    load()
    window.dispatchEvent(new CustomEvent('dashboard:refresh'))
  }, [load])

  const handleApprove = async () => {
    if (!approveTarget) return
    setActionId(`approve-${approveTarget.id}`)
    try {
      await borrowRequestService.approve(approveTarget.id)
      toast.success('Borrow request approved.')
      setApproveTarget(null)
      setApproveInfo(null)
      refreshAll()
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    } finally {
      setActionId(null)
    }
  }

  const handleReject = async () => {
    if (!rejectTarget || !rejectReason.trim()) return
    setRejecting(true)
    try {
      await borrowRequestService.reject(rejectTarget.id, rejectReason.trim())
      toast.success('Borrow request rejected')
      setRejectTarget(null)
      setRejectReason('')
      refreshAll()
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    } finally {
      setRejecting(false)
    }
  }

  const handleCancel = async () => {
    if (!cancelTarget) return
    setCancelling(true)
    try {
      await borrowRequestService.cancel(cancelTarget.id)
      toast.success('Borrow request cancelled')
      setCancelTarget(null)
      refreshAll()
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    } finally {
      setCancelling(false)
    }
  }

  const openApprove = async (r) => {
    setApproveTarget(r)
    setApproveInfo(null)
    setInfoLoading(true)
    try {
      const info = await borrowRequestService.getApprovalInfo(r.id)
      setApproveInfo(info)
    } catch (e) {
      toast.error(getApiErrorMessage(e))
      setApproveTarget(null)
    } finally {
      setInfoLoading(false)
    }
  }

  const openDetails = async (r) => {
    setDetailRequest(r)
    setDetailInfo(null)
    if (isStaff) {
      try {
        setDetailInfo(await borrowRequestService.getApprovalInfo(r.id))
      } catch {
        setDetailInfo(null)
      }
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const from7 = new Date(startOfToday.getTime() - 6 * 86400000)
    const from30 = new Date(startOfToday.getTime() - 29 * 86400000)

    let list = requests.filter((r) => {
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false
      if (planFilter !== 'ALL' && (r.membershipPlanName || '') !== planFilter) return false

      if (dateRange === 'today' && new Date(r.requestDate) < startOfToday) return false
      if (dateRange === '7d' && new Date(r.requestDate) < from7) return false
      if (dateRange === '30d' && new Date(r.requestDate) < from30) return false
      if (dateRange === 'custom') {
        const d = new Date(r.requestDate)
        if (customFrom && d < new Date(`${customFrom}T00:00:00`)) return false
        if (customTo && d > new Date(`${customTo}T23:59:59`)) return false
      }

      if (q) {
        const haystack = [r.userName, r.userEmail, r.bookTitle, r.bookAuthor, r.bookIsbn]
          .filter(Boolean).join(' ').toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })

    const timeOf = (d) => (d ? new Date(d).getTime() : 0)
    list = [...list].sort((a, b) => {
      if (sort === 'oldest') return timeOf(a.requestDate) - timeOf(b.requestDate)
      if (sort === 'borrowDate') return timeOf(a.borrowStartDate) - timeOf(b.borrowStartDate)
      if (sort === 'dueDate') return timeOf(a.dueDate) - timeOf(b.dueDate)
      return timeOf(b.requestDate) - timeOf(a.requestDate)
    })

    return list
  }, [requests, query, statusFilter, planFilter, dateRange, customFrom, customTo, sort])

  const pageSize = 8
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, pages - 1)
  const slice = filtered.slice(currentPage * pageSize, currentPage * pageSize + pageSize)

  const activeFilterCount =
    (statusFilter !== 'ALL' ? 1 : 0) + (planFilter !== 'ALL' ? 1 : 0) + (dateRange !== 'all' ? 1 : 0) + (query ? 1 : 0)

  const clearFilters = () => {
    setQuery('')
    setStatusFilter('ALL')
    setPlanFilter('ALL')
    setDateRange('all')
    setCustomFrom('')
    setCustomTo('')
    setPage(0)
  }

  const selectStyles = 'rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100'

  if (loading) return <CardSkeleton />

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50">
            {isStaff ? 'Borrow Requests' : 'My Borrow Requests'}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {isStaff
              ? 'Review, approve or reject member borrow requests. Approving issues the book automatically.'
              : 'Track the status of your borrow requests.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isStaff && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
              <Clock className="h-3 w-3" /> {stats.pending} pending
            </span>
          )}
          <Button variant="secondary" size="sm" type="button" icon={RefreshCw} onClick={() => { setLoading(true); load() }}>
            Refresh
          </Button>
        </div>
      </div>

      {isStaff && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {Object.keys(CARD_STYLES).map((key) => {
              const c = CARD_STYLES[key]
              const Icon = c.icon
              const value = stats[key] ?? 0
              const isActive = statusFilter === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => { setStatusFilter(isActive ? 'ALL' : key); setPage(0) }}
                  className={`rounded-xl border px-4 py-3 text-left transition ${
                    isActive
                      ? c.active
                      : 'border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{value}</p>
                    <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${c.iconBg}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                  </div>
                  <p className={`mt-1 text-xs font-semibold ${isActive ? 'text-gray-800 dark:text-gray-100' : 'text-gray-500'}`}>
                    {c.label}
                  </p>
                </button>
              )
            })}
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setPage(0) }}
                  placeholder="Search member, email, title or ISBN..."
                  className="w-full rounded-lg border border-gray-200 bg-gray-50/60 py-2 pl-10 pr-3 text-sm focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-100 dark:border-gray-800 dark:bg-gray-800/60 dark:focus:bg-gray-900"
                  aria-label="Search borrow requests"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex lg:flex-wrap">
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setPage(0) }}
                  className={selectStyles}
                  aria-label="Filter by status"
                >
                  <option value="ALL">All Statuses</option>
                  {Object.keys(STATUS_LABEL).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                </select>
                <select
                  value={planFilter}
                  onChange={(e) => { setPlanFilter(e.target.value); setPage(0) }}
                  className={selectStyles}
                  aria-label="Filter by membership plan"
                >
                  <option value="ALL">All Plans</option>
                  {PLAN_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <select
                  value={dateRange}
                  onChange={(e) => { setDateRange(e.target.value); setPage(0) }}
                  className={selectStyles}
                  aria-label="Filter by date range"
                >
                  {DATE_RANGE_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                </select>
                <select
                  value={sort}
                  onChange={(e) => { setSort(e.target.value); setPage(0) }}
                  className={selectStyles}
                  aria-label="Sort requests"
                >
                  {SORT_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                </select>
              </div>
            </div>
            {dateRange === 'custom' && (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                <label className="text-xs font-semibold text-gray-500">From</label>
                <input type="date" value={customFrom} onChange={(e) => { setCustomFrom(e.target.value); setPage(0) }} className={`${selectStyles} w-auto`} />
                <label className="text-xs font-semibold text-gray-500">To</label>
                <input type="date" value={customTo} onChange={(e) => { setCustomTo(e.target.value); setPage(0) }} className={`${selectStyles} w-auto`} />
                <span className="text-xs text-gray-400">Filters by request time</span>
              </div>
            )}
            {activeFilterCount > 0 && (
              <div className="mt-3 flex items-center gap-2">
                <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400">
                  <X className="h-3 w-3" /> Clear {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''}
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {!isStaff && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Object.keys(STATUS_LABEL).map((s) => (
            <div key={s} className="rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">
                {requests.filter((r) => r.status === s).length}
              </p>
              <p className="text-xs font-semibold text-gray-500">{STATUS_LABEL[s]}</p>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
          <p className="text-sm text-gray-500">
            {filtered.length} request{filtered.length === 1 ? '' : 's'}
            {filtered.length !== requests.length && <span className="text-gray-400"> (of {requests.length})</span>}
          </p>
          <span className="inline-flex items-center gap-1 text-xs text-gray-400">
            <CalendarClock className="h-3.5 w-3.5" /> Borrow Date = issue date on approval
          </span>
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
            <thead className="bg-gray-50/80 dark:bg-gray-800/60">
              <tr>
                {isStaff && <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Member</th>}
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Book</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Borrow Date</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Due Date</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Plan</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Requested</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Decision</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {slice.map((r) => (
                <tr key={r.id} className="transition hover:bg-primary-50/40 dark:hover:bg-gray-800/50">
                  {isStaff && <td className="whitespace-nowrap px-4 py-3"><MemberCell r={r} /></td>}
                  <td className="px-4 py-3"><BookCell r={r} /></td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-700 dark:text-gray-300">{formatDate(r.borrowStartDate)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-700 dark:text-gray-300">
                    {formatDate(r.dueDate)}
                    {r.status === 'PENDING' && <span className="ml-1 text-[11px] text-gray-400">(est.)</span>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5 text-xs font-semibold text-primary-700 dark:bg-primary-950/40 dark:text-primary-300">
                      <Crown className="h-3 w-3" /> {r.membershipPlanName || '—'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-600 dark:text-gray-300">{formatDateTime(r.requestDate)}</td>
                  <td className="whitespace-nowrap px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="max-w-[220px] px-4 py-3">
                    {r.status === 'PENDING' ? (
                      <span className="text-xs italic text-gray-400">Awaiting review</span>
                    ) : r.status === 'CANCELLED' ? (
                      <span className="text-xs text-gray-500">Cancelled by member</span>
                    ) : (
                      <div className="min-w-0">
                        {r.decisionNotes && <p className="truncate text-xs text-gray-600 dark:text-gray-300">{r.decisionNotes}</p>}
                        <p className="whitespace-nowrap text-[11px] text-gray-400">Decided {formatDateTime(r.decidedAt || r.cancelledAt)}</p>
                      </div>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {isStaff ? (
                      <div className="flex justify-end gap-1.5">
                        {r.status === 'PENDING' && (
                          <>
                            <Button variant="success" size="xs" type="button" icon={CheckCircle2} onClick={() => openApprove(r)}>
                              Approve
                            </Button>
                            <Button variant="danger" size="xs" type="button" icon={XCircle} onClick={() => { setRejectTarget(r); setRejectReason('') }}>
                              Reject
                            </Button>
                          </>
                        )}
                        {r.status === 'APPROVED' && (
                          <Button variant="secondary" size="xs" type="button" icon={ExternalLink} onClick={() => navigate('/issued-books')}>
                            View Loan
                          </Button>
                        )}
                        {r.status === 'REJECTED' && (
                          <Button variant="secondary" size="xs" type="button" icon={AlertTriangle} onClick={() => setReasonTarget(r)}>
                            View Reason
                          </Button>
                        )}
                        <Button variant="secondary" size="xs" type="button" icon={Eye} onClick={() => openDetails(r)}>
                          Details
                        </Button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-1.5">
                        {r.status === 'PENDING' && (
                          <Button variant="danger" size="xs" type="button" icon={Ban} onClick={() => setCancelTarget(r)}>
                            Cancel Borrow Request
                          </Button>
                        )}
                        <Button variant="secondary" size="xs" type="button" icon={Eye} onClick={() => openDetails(r)}>
                          Details
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid gap-3 p-4 md:hidden">
          {slice.length === 0 && (
            <div className="py-8 text-center text-sm text-gray-500">No requests match your filters.</div>
          )}
          {slice.map((r) => (
            <div key={r.id} className="rounded-xl border border-gray-100 p-4 dark:border-gray-800">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {isStaff && <MemberCell r={r} />}
                  <p className="mt-2 font-medium text-gray-900 dark:text-gray-50">{r.bookTitle}</p>
                  <p className="text-xs text-gray-500">{r.bookAuthor}</p>
                </div>
                <StatusBadge status={r.status} />
              </div>
              <dl className="mt-3 space-y-1.5 text-xs text-gray-600 dark:text-gray-300">
                <div className="flex justify-between"><dt className="text-gray-400">Borrow</dt><dd>{formatDate(r.borrowStartDate)}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-400">Due</dt><dd>{formatDate(r.dueDate)}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-400">Plan</dt><dd>{r.membershipPlanName || '—'}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-400">Requested</dt><dd>{formatDateTime(r.requestDate)}</dd></div>
              </dl>
              <div className="mt-3 flex justify-end gap-1.5">
                {isStaff ? (
                  <>
                    {r.status === 'PENDING' && (
                      <>
                        <Button variant="success" size="xs" type="button" icon={CheckCircle2} onClick={() => openApprove(r)}>Approve</Button>
                        <Button variant="danger" size="xs" type="button" icon={XCircle} onClick={() => { setRejectTarget(r); setRejectReason('') }}>Reject</Button>
                      </>
                    )}
                    {r.status === 'APPROVED' && (
                      <Button variant="secondary" size="xs" type="button" icon={ExternalLink} onClick={() => navigate('/issued-books')}>View Loan</Button>
                    )}
                    {r.status === 'REJECTED' && (
                      <Button variant="secondary" size="xs" type="button" icon={AlertTriangle} onClick={() => setReasonTarget(r)}>View Reason</Button>
                    )}
                    <Button variant="secondary" size="xs" type="button" icon={Eye} onClick={() => openDetails(r)}>Details</Button>
                  </>
                ) : (
                  <>
                    {r.status === 'PENDING' && (
                      <Button variant="danger" size="xs" type="button" icon={Ban} onClick={() => setCancelTarget(r)}>Cancel Borrow Request</Button>
                    )}
                    <Button variant="secondary" size="xs" type="button" icon={Eye} onClick={() => openDetails(r)}>Details</Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="hidden flex-col items-center justify-center border-t border-gray-100 py-16 text-center md:flex dark:border-gray-800">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-gray-800">
              <Search className="h-5 w-5" />
            </div>
            <p className="mt-3 text-lg font-semibold text-gray-800 dark:text-gray-100">
              {isStaff ? 'No borrow requests yet.' : "You haven't sent any borrow requests yet."}
            </p>
            <p className="mt-1 max-w-md text-sm text-gray-500 dark:text-gray-400">
              {activeFilterCount > 0
                ? 'Try adjusting the filters or search terms.'
                : isStaff
                  ? 'Members will appear here when they send a borrow request.'
                  : 'Go to the Books page and press "Borrow" to send a request to an administrator.'}
            </p>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 dark:border-gray-800">
            <p className="text-xs text-gray-500">
              Page {currentPage + 1} of {pages}
            </p>
            <Pagination currentPage={currentPage} totalPages={pages} onChange={setPage} />
          </div>
        )}
      </div>

      {/* Approve confirmation modal */}
      <Modal
        open={!!approveTarget}
        title="Approve Borrow Request"
        size="md"
        onClose={() => { setApproveTarget(null); setApproveInfo(null) }}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" type="button" onClick={() => { setApproveTarget(null); setApproveInfo(null) }}>
              Cancel
            </Button>
            <Button
              variant="success"
              type="button"
              icon={CheckCircle2}
              loading={actionId === `approve-${approveTarget?.id}`}
              disabled={!approveInfo || infoLoading || !approveInfo.canApprove}
              onClick={handleApprove}
            >
              Approve & Issue Book
            </Button>
          </div>
        }
      >
        {infoLoading || !approveInfo ? (
          <div className="flex items-center justify-center py-12 text-sm text-gray-400">
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Loading request details…
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl bg-gray-50 p-4 dark:bg-gray-800/50">
              <BookCover
                src={coverOrSlug(approveInfo.bookCoverImageUrl, approveInfo.bookTitle)}
                alt=""
                className="h-16 w-12 shrink-0"
                imgClassName="h-full w-full rounded-md object-cover"
              />
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 dark:text-gray-50">{approveInfo.bookTitle}</p>
                <p className="text-xs text-gray-500">{approveInfo.bookAuthor}</p>
                {approveInfo.bookIsbn && <p className="mt-0.5 text-xs font-mono text-gray-400">ISBN: {approveInfo.bookIsbn}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <dt className="text-xs font-semibold text-gray-500">Member</dt>
                <dd className="mt-0.5 text-sm font-medium text-gray-900 dark:text-gray-50">{approveInfo.memberName}</dd>
                <dd className="text-xs text-gray-400">{approveInfo.memberEmail}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-gray-500">Membership Plan</dt>
                <dd className="mt-0.5 text-sm font-medium text-gray-900 dark:text-gray-50">{approveInfo.membershipPlanName || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-gray-500">Borrow Date</dt>
                <dd className="mt-0.5 text-sm text-gray-800 dark:text-gray-100">{formatDate(approveInfo.borrowStartDate)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-gray-500">Due Date</dt>
                <dd className="mt-0.5 text-sm text-gray-800 dark:text-gray-100">{formatDate(approveInfo.dueDate)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-gray-500">Available Copies</dt>
                <dd className="mt-0.5 text-sm text-gray-800 dark:text-gray-100">
                  {approveInfo.availableCopies} / {approveInfo.totalCopies}
                  {approveInfo.availableCopies <= 0 && <span className="ml-1 text-xs font-semibold text-rose-500">(none)</span>}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-gray-500">Borrow Limit</dt>
                <dd className="mt-0.5 text-sm text-gray-800 dark:text-gray-100">
                  {approveInfo.booksCurrentlyBorrowed} / {approveInfo.borrowLimit} books in use
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-gray-500">Outstanding Fine</dt>
                <dd className="mt-0.5 text-sm text-gray-800 dark:text-gray-100">
                  {approveInfo.outstandingFineCount > 0
                    ? `$${Number(approveInfo.outstandingFineAmount || 0).toFixed(2)} (${approveInfo.outstandingFineCount})`
                    : 'None'}
                </dd>
              </div>
            </div>

            {approveInfo.warnings?.length > 0 ? (
              <div className="space-y-2 rounded-xl border border-rose-200 bg-rose-50 p-3 dark:border-rose-900 dark:bg-rose-950/40">
                {approveInfo.warnings.map((w, i) => (
                  <p key={i} className="flex items-start gap-2 text-xs font-medium text-rose-700 dark:text-rose-300">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {w}
                  </p>
                ))}
                <p className="text-[11px] text-rose-600 dark:text-rose-400">Approval is disabled until these issues are resolved.</p>
              </div>
            ) : (
              <p className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                All checks passed. Approving will create the loan, reduce available copies and notify the member.
              </p>
            )}
          </div>
        )}
      </Modal>

      {/* Reject modal */}
      <Modal
        open={!!rejectTarget}
        title="Reject this borrow request?"
        size="sm"
        onClose={() => setRejectTarget(null)}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" type="button" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" type="button" icon={XCircle} loading={rejecting} disabled={!rejectReason.trim()} onClick={handleReject}>
              Reject Request
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Reject <strong className="text-gray-900 dark:text-gray-50">{rejectTarget?.userName}</strong>'s request for{' '}
            <strong className="text-gray-900 dark:text-gray-50">{rejectTarget?.bookTitle}</strong>?
          </p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_REJECT_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRejectReason(r)}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                  rejectReason === r
                    ? 'border-rose-400 bg-rose-50 text-rose-700 dark:border-rose-600 dark:bg-rose-950/40 dark:text-rose-300'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">
              Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter a reason for the rejection..."
              rows={3}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100"
            />
            <p className="mt-1 text-[11px] text-gray-400">The member will be notified with this reason.</p>
          </div>
        </div>
      </Modal>

      {/* View reason modal */}
      <Modal
        open={!!reasonTarget}
        title="Rejection Reason"
        size="sm"
        onClose={() => setReasonTarget(null)}
        footer={
          <div className="flex justify-end">
            <Button variant="secondary" type="button" onClick={() => setReasonTarget(null)}>Close</Button>
          </div>
        }
      >
        {reasonTarget && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {reasonTarget.userName}'s request for <strong className="text-gray-900 dark:text-gray-50">{reasonTarget.bookTitle}</strong>
            </p>
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 dark:border-rose-900 dark:bg-rose-950/40">
              <p className="flex items-start gap-2 text-sm text-rose-700 dark:text-rose-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                {reasonTarget.decisionNotes || 'No reason provided.'}
              </p>
            </div>
            <p className="text-xs text-gray-400">Rejected {formatDateTime(reasonTarget.decidedAt)}</p>
          </div>
        )}
      </Modal>

      {/* Cancel confirmation modal */}
      <Modal
        open={!!cancelTarget}
        title="Cancel Borrow Request"
        size="sm"
        onClose={() => setCancelTarget(null)}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" type="button" onClick={() => setCancelTarget(null)}>Keep Request</Button>
            <Button variant="danger" type="button" icon={Ban} loading={cancelling} onClick={handleCancel}>
              Cancel Borrow Request
            </Button>
          </div>
        }
      >
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Cancel your pending request for <strong className="text-gray-900 dark:text-gray-50">{cancelTarget?.bookTitle}</strong>?
          An administrator will no longer be able to approve it.
        </p>
      </Modal>

      {/* Details modal */}
      <Modal
        open={!!detailRequest}
        title="Borrow Request Details"
        size="md"
        onClose={() => { setDetailRequest(null); setDetailInfo(null) }}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {detailRequest?.status === 'APPROVED' && (
              <Button variant="secondary" type="button" icon={ExternalLink} onClick={() => { setDetailRequest(null); navigate('/issued-books') }}>
                View Loan
              </Button>
            )}
            <Button variant="secondary" type="button" onClick={() => { setDetailRequest(null); setDetailInfo(null) }}>
              Close
            </Button>
          </div>
        }
      >
        {detailRequest && (
          <div className="space-y-4 text-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800/50">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  <ShieldAlert className="h-3.5 w-3.5" /> Member
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-sm font-bold text-white">
                    {initials(detailRequest.userName)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-50">{detailRequest.userName}</p>
                    <p className="text-xs text-gray-500">{detailRequest.userEmail}</p>
                  </div>
                </div>
                {detailInfo && (
                  <dl className="mt-3 space-y-1.5 border-t border-gray-200 pt-3 text-xs dark:border-gray-700">
                    <div className="flex justify-between"><dt className="text-gray-500">Membership Plan</dt><dd className="font-semibold text-gray-800 dark:text-gray-100">{detailInfo.membershipPlanName || '—'}</dd></div>
                    <div className="flex justify-between"><dt className="text-gray-500">Borrow Limit</dt><dd className="font-semibold text-gray-800 dark:text-gray-100">{detailInfo.booksCurrentlyBorrowed} / {detailInfo.borrowLimit}</dd></div>
                    <div className="flex justify-between"><dt className="text-gray-500">Outstanding Fine</dt><dd className="font-semibold text-gray-800 dark:text-gray-100">{detailInfo.outstandingFineCount > 0 ? `$${Number(detailInfo.outstandingFineAmount || 0).toFixed(2)}` : 'None'}</dd></div>
                  </dl>
                )}
              </div>
              <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800/50">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  <Book className="h-3.5 w-3.5" /> Book
                </p>
                <div className="flex items-center gap-3">
                  <BookCover
                    src={coverOrSlug(detailRequest.bookCoverImageUrl, detailRequest.bookTitle)}
                    alt=""
                    className="h-14 w-10 shrink-0"
                    imgClassName="h-full w-full rounded-md object-cover"
                  />
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-gray-50">{detailRequest.bookTitle}</p>
                    <p className="text-xs text-gray-500">{detailRequest.bookAuthor}</p>
                    {detailRequest.bookIsbn && <p className="text-[11px] font-mono text-gray-400">ISBN: {detailRequest.bookIsbn}</p>}
                  </div>
                </div>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <dt className="text-xs font-semibold text-gray-500">Borrow Date</dt>
                <dd className="mt-0.5 text-gray-800 dark:text-gray-100">{formatDate(detailRequest.borrowStartDate)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-gray-500">Due Date</dt>
                <dd className="mt-0.5 text-gray-800 dark:text-gray-100">{formatDate(detailRequest.dueDate)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-gray-500">Membership Plan</dt>
                <dd className="mt-0.5 text-gray-800 dark:text-gray-100">{detailRequest.membershipPlanName || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-gray-500">Current Status</dt>
                <dd className="mt-0.5"><StatusBadge status={detailRequest.status} /></dd>
              </div>
              {detailRequest.issuedBookId && (
                <div>
                  <dt className="text-xs font-semibold text-gray-500">Loan ID</dt>
                  <dd className="mt-0.5 font-mono text-gray-800 dark:text-gray-100">#{detailRequest.issuedBookId}</dd>
                </div>
              )}
            </dl>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Status Timeline</p>
              <ol className="space-y-2">
                <li className="flex items-start gap-2.5">
                  <span className="mt-1 flex h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />
                  <div>
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-100">Request Created</p>
                    <p className="text-xs text-gray-400">{formatDateTime(detailRequest.requestDate)}</p>
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className={`mt-1 flex h-2.5 w-2.5 shrink-0 rounded-full ${
                    detailRequest.status === 'APPROVED' ? 'bg-emerald-500' :
                    detailRequest.status === 'REJECTED' ? 'bg-rose-500' :
                    detailRequest.status === 'CANCELLED' ? 'bg-gray-400' : 'bg-amber-400'
                  }`} />
                  <div>
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-100">
                      {detailRequest.status === 'PENDING' ? 'Awaiting Decision' : STATUS_LABEL[detailRequest.status]}
                    </p>
                    <p className="text-xs text-gray-400">
                      {detailRequest.status === 'PENDING'
                        ? 'Waiting for an administrator to review'
                        : formatDateTime(detailRequest.decidedAt || detailRequest.cancelledAt)}
                    </p>
                    {detailRequest.decisionNotes && detailRequest.status !== 'PENDING' && (
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{detailRequest.decisionNotes}</p>
                    )}
                  </div>
                </li>
                {detailRequest.issuedBookId && (
                  <li className="flex items-start gap-2.5">
                    <span className="mt-1 flex h-2.5 w-2.5 shrink-0 rounded-full bg-primary-500" />
                    <div>
                      <p className="text-xs font-semibold text-gray-800 dark:text-gray-100">Loan Issued</p>
                      <p className="text-xs text-gray-400">Loan #{detailRequest.issuedBookId} created — visible in Issued Books</p>
                    </div>
                  </li>
                )}
              </ol>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
