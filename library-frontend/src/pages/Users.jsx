import { useCallback, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import {
  AlertTriangle, Ban, Bell, BookOpen, CalendarClock, CheckCircle2, ChevronDown,
  ChevronLeft, ChevronRight, CreditCard, Crown, Eye, FileDown, History, Mail,
  MoreHorizontal, Pencil, Plus, Printer, RefreshCw, Search, ShieldCheck, Trash2,
  User, UserX, Users as UsersIcon, Phone,
} from 'lucide-react'
import Button from '../components/Button.jsx'
import Modal from '../components/Modal.jsx'
import FormInput from '../components/FormInput.jsx'
import StatsCard from '../components/StatsCard.jsx'
import { CardSkeleton } from '../components/PageSkeleton.jsx'
import {
  getApiErrorMessage, issuedBookService, subscriptionService,
  userSubscriptionService, userService,
} from '../services/api.js'

const emptyUser = {
  name: '',
  email: '',
  phone: '',
  enrollmentDate: '',
  role: 'MEMBER',
  password: '',
}

const ROLE_COLORS = {
  ADMIN: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  MEMBER: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
}

const STATUS_META = {
  ACTIVE: {
    label: 'Active',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    dot: 'bg-emerald-500',
  },
  INACTIVE: {
    label: 'Inactive',
    badge: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
    dot: 'bg-gray-400',
  },
  PENDING_VERIFICATION: {
    label: 'Pending Verification',
    badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
    dot: 'bg-yellow-500',
  },
  SUSPENDED: {
    label: 'Suspended',
    badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    dot: 'bg-orange-500',
  },
  BLOCKED: {
    label: 'Blocked',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    dot: 'bg-red-500',
  },
  DELETED: {
    label: 'Deleted',
    badge: 'bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    dot: 'bg-gray-400',
  },
}

const ROLE_LABEL = {
  ADMIN: 'Administrator',
  MEMBER: 'Member',
}

const LOAN_STATUS_LABEL = {
  ISSUED: 'Borrowed',
  BORROWED: 'Borrowed',
  RETURNED: 'Returned',
  OVERDUE: 'Overdue',
  LOST: 'Lost',
  DAMAGED: 'Damaged',
}

const RESERVATION_STATUS_LABEL = {
  WAITING: 'Waiting',
  READY_FOR_PICKUP: 'Ready for Pickup',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
}

const MEMBERSHIP_STATUS_LABEL = {
  PENDING_PAYMENT: 'Payment Pending',
  ACTIVE: 'Active',
  EXPIRING: 'Expiring',
  EXPIRED: 'Expired',
  CANCELLED: 'Cancelled',
  REPLACED: 'Replaced',
}

const PAYMENT_STATUS_LABEL = {
  PENDING: 'Pending',
  SUCCESS: 'Paid',
  FAILED: 'Payment Failed',
  REFUNDED: 'Refunded',
  CANCELLED: 'Cancelled',
}

const PAYMENT_TYPE_LABEL = {
  FINE: 'Fine',
  SUBSCRIPTION: 'Membership',
}

const PLAN_COLORS = {
  NONE: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  STUDENT: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  BASIC: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  SILVER: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  GOLD: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  PREMIUM: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
}

const PROFILE_TABS = [
  { key: 'personal', label: 'Personal', icon: User },
  { key: 'membership', label: 'Membership', icon: Crown },
  { key: 'loans', label: 'Loans', icon: BookOpen },
  { key: 'reservations', label: 'Reservations', icon: CalendarClock },
  { key: 'payments', label: 'Payments', icon: CreditCard },
  { key: 'reading', label: 'Reading History', icon: History },
  { key: 'notifications', label: 'Notifications', icon: Bell },
]

const AVATAR_GRADIENTS = [
  'from-blue-400 to-indigo-500',
  'from-emerald-400 to-teal-500',
  'from-amber-400 to-orange-500',
  'from-rose-400 to-pink-500',
  'from-violet-400 to-purple-500',
  'from-cyan-400 to-blue-500',
]

function initials(name) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')
}

function avatarGradient(name) {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 997
  return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length]
}

function timeAgo(dt) {
  if (!dt) return 'Never'
  const diff = Date.now() - new Date(dt).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dt).toLocaleDateString()
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString()
}

function fmtDateTime(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString()
}

function formatCurrency(amount) {
  if (amount == null) return '₹0'
  const num = typeof amount === 'number' ? amount : Number(amount)
  return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || {
    label: status || '—',
    badge: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
    dot: 'bg-gray-400',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  )
}

function PlanBadge({ plan }) {
  const key = (plan || 'NONE').toUpperCase()
  const cls = PLAN_COLORS[key] || PLAN_COLORS.NONE
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>{key}</span>
}

function ProfileStat({ label, value }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3 text-center dark:border-gray-800 dark:bg-gray-800/40">
      <p className="text-xl font-bold text-gray-900 dark:text-gray-50">{value}</p>
      <p className="mt-0.5 text-xs text-gray-500">{label}</p>
    </div>
  )
}

function LoanStatusBadge({ status }) {
  const meta =
    status === 'RETURNED'
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${meta}`}>{LOAN_STATUS_LABEL[status] || '—'}</span>
}

function ReservationStatusBadge({ status }) {
  const map = {
    WAITING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
    READY_FOR_PICKUP: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    COMPLETED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    CANCELLED: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
    EXPIRED: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  }
  const cls = map[status] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>{RESERVATION_STATUS_LABEL[status] || '—'}</span>
}

export default function Users() {
  const [pageData, setPageData] = useState({ content: [], totalPages: 0, totalElements: 0, number: 0 })
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState(null)
  const [overviewLoading, setOverviewLoading] = useState(true)

  const [keyword, setKeyword] = useState('')
  const [debouncedKw, setDebouncedKw] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [planFilter, setPlanFilter] = useState('')
  const [borrowStatusFilter, setBorrowStatusFilter] = useState('')
  const [sortBy, setSortBy] = useState('')
  const [page, setPage] = useState(0)
  const pageSize = 12

  const [modalOpen, setModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyUser)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const [profileOpen, setProfileOpen] = useState(false)
  const [profileUser, setProfileUser] = useState(null)
  const [profileData, setProfileData] = useState(null)
  const [profileTab, setProfileTab] = useState('personal')
  const [tabData, setTabData] = useState({})
  const [tabLoading, setTabLoading] = useState(false)

  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [upgradeTarget, setUpgradeTarget] = useState(null)
  const [plans, setPlans] = useState([])
  const [upgradingId, setUpgradingId] = useState(null)

  const [openMenuId, setOpenMenuId] = useState(null)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedKw(keyword)
      setPage(0)
    }, 350)
    return () => clearTimeout(t)
  }, [keyword])

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true)
    try {
      const o = await userService.getOverview()
      setOverview(o)
    } catch (e) {
      // overview is secondary; do not hard-fail the page
    } finally {
      setOverviewLoading(false)
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, size: pageSize, keyword: debouncedKw || undefined }
      if (roleFilter) params.role = roleFilter
      if (statusFilter) params.status = statusFilter
      if (planFilter) params.subscriptionPlan = planFilter
      if (borrowStatusFilter) params.borrowStatus = borrowStatusFilter
      if (sortBy) params.sort = sortBy
      const data = await userService.getPaginated(params)
      setPageData(data)
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [page, debouncedKw, roleFilter, statusFilter, planFilter, borrowStatusFilter, sortBy])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    loadOverview()
  }, [loadOverview])

  const resetFilters = () => {
    setRoleFilter('')
    setStatusFilter('')
    setPlanFilter('')
    setBorrowStatusFilter('')
    setSortBy('')
    setKeyword('')
    setDebouncedKw('')
    setPage(0)
  }

  const hasFilters = roleFilter || statusFilter || planFilter || borrowStatusFilter || sortBy || debouncedKw

  const openCreate = () => {
    setEditing(null)
    setForm(emptyUser)
    setErrors({})
    setModalOpen(true)
  }

  const openEdit = (s) => {
    setEditing(s)
    setForm({
      name: s.name,
      email: s.email,
      phone: s.phone || '',
      enrollmentDate: s.enrollmentDate || '',
      role: s.role || 'MEMBER',
      password: '',
    })
    setErrors({})
    setModalOpen(true)
    setOpenMenuId(null)
  }

  const validate = () => {
    const next = {}
    if (!form.name.trim()) next.name = 'Full name is required'
    if (!form.email.trim()) next.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = 'Please enter a valid email address'
    if (!editing && form.password && form.password.length < 6) next.password = 'Password must be at least 6 characters'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const saveUser = async () => {
    if (!validate()) return
    setSaving(true)
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      enrollmentDate: form.enrollmentDate || null,
    }
    try {
      if (editing) {
        await userService.update(editing.id, payload)
        toast.success('Changes saved successfully.')
      } else {
        await userService.create({ ...payload, role: form.role, password: form.password })
        toast.success(form.role === 'ADMIN' ? 'Administrator added successfully.' : 'Member added successfully.')
      }
      setModalOpen(false)
      load()
      loadOverview()
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    const id = deleteTarget.id
    setDeleteTarget(null)
    setOpenMenuId(null)
    try {
      await userService.remove(id)
      toast.success('Member removed successfully.')
      load()
      loadOverview()
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    }
  }

  const changeStatus = async (user, newStatus) => {
    const label = STATUS_META[newStatus]?.label || newStatus
    if (!window.confirm(`Set ${user.name}'s status to "${label}"?`)) return
    setOpenMenuId(null)
    try {
      await userService.updateStatus(user.id, newStatus)
      toast.success(`${user.name} is now ${label}`)
      load()
      loadOverview()
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    }
  }

  const openProfile = async (user) => {
    setProfileUser(user)
    setProfileTab('personal')
    setProfileData(null)
    setTabData({})
    setProfileOpen(true)
    setOpenMenuId(null)
    try {
      const p = await userService.getProfile(user.id)
      setProfileData(p)
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    }
  }

  const loadTabData = useCallback(async (userId, tab) => {
    setTabLoading(true)
    try {
      let data = null
      if (tab === 'loans') data = await issuedBookService.getByUser(userId)
      else if (tab === 'reservations') data = await userService.getMemberReservations(userId)
      else if (tab === 'payments') data = await userService.getMemberPayments(userId)
      else if (tab === 'reading') {
        const [history, stats] = await Promise.all([
          userService.getMemberReadingHistory(userId),
          userService.getMemberReadingStats(userId),
        ])
        data = { history, stats }
      } else if (tab === 'notifications') data = await userService.getMemberNotifications(userId)
      else if (tab === 'membership') data = await userService.getMemberSubscriptions(userId)
      setTabData((prev) => ({ ...prev, [tab]: data }))
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    } finally {
      setTabLoading(false)
    }
  }, [])

  const switchTab = (tab) => {
    setProfileTab(tab)
    if (tab !== 'personal' && profileUser && !tabData[tab]) {
      loadTabData(profileUser.id, tab)
    }
  }

  const openProfileTab = (user, tab) => {
    setProfileUser(user)
    setProfileTab(tab)
    setTabData({})
    setProfileOpen(true)
    setOpenMenuId(null)
    loadTabData(user.id, tab)
  }

  const openUpgrade = async (user) => {
    setUpgradeTarget(user)
    setUpgradeOpen(true)
    setOpenMenuId(null)
    try {
      const all = await subscriptionService.getPlans()
      setPlans(all)
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    }
  }

  const upgradeTo = async (plan) => {
    setUpgradingId(plan.id)
    try {
      await userSubscriptionService.purchase(plan.id)
      toast.success(`${upgradeTarget.name} is now on ${plan.name}`)
      setUpgradeOpen(false)
      load()
      loadOverview()
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    } finally {
      setUpgradingId(null)
    }
  }

  const fetchAllRows = async () => {
    const params = {
      page: 0,
      size: 10000,
      keyword: debouncedKw || undefined,
      role: roleFilter || undefined,
      status: statusFilter || undefined,
      subscriptionPlan: planFilter || undefined,
      borrowStatus: borrowStatusFilter || undefined,
      sort: sortBy || undefined,
    }
    const data = await userService.getPaginated(params)
    return data.content || []
  }

  const exportCsv = async () => {
    try {
      const rows = await fetchAllRows()
      const headers = [
        'Membership No', 'Name', 'Email', 'Phone', 'Role', 'Status', 'Plan',
        'Member Since', 'Last Login', 'Books Borrowed', 'Reservations', 'Overdue', 'Amount Due',
      ]
      const esc = (v) => {
        const s = v == null ? '' : String(v)
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
      }
      const lines = [headers.join(',')]
      for (const u of rows) {
        lines.push([
          u.membershipId, u.name, u.email, u.phone, u.role,
          STATUS_META[u.status]?.label || u.status, u.subscriptionPlan,
          u.enrollmentDate || '', u.lastLogin ? new Date(u.lastLogin).toLocaleString() : '',
          u.booksIssued, u.reservations, u.overdue, u.outstandingFine ?? 0,
        ].map(esc).join(','))
      }
      const blob = new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `members-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    }
  }

  const exportPdf = async () => {
    try {
      const rows = await fetchAllRows()
      const win = window.open('', '_blank', 'width=1100,height=700')
      if (!win) return
      const h = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
      const body = rows
        .map((u) => `<tr>
          <td>${h(u.membershipId)}</td><td>${h(u.name)}</td><td>${h(u.email)}</td>
          <td>${h(u.phone || '—')}</td><td>${h(u.role)}</td>
          <td>${h(STATUS_META[u.status]?.label || u.status)}</td><td>${h(u.subscriptionPlan)}</td>
          <td>${h(u.enrollmentDate || '—')}</td><td>${h(u.booksIssued)}</td><td>${h(u.reservations)}</td>
          <td>${h(u.overdue)}</td><td>${h(u.outstandingFine ?? 0)}</td>
        </tr>`)
        .join('')
      win.document.write(`<!DOCTYPE html><html><head><title>Members Report</title><style>
        body{font-family:Segoe UI,Arial,sans-serif;padding:24px;color:#111}
        h1{font-size:20px;margin:0 0 4px}
        p{color:#666;margin:0 0 16px;font-size:12px}
        table{width:100%;border-collapse:collapse;font-size:12px}
        th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}
        th{background:#f3f4f6;font-weight:600}
      </style></head><body>
        <h1>Members Report</h1>
        <p>Generated ${new Date().toLocaleString()} · ${rows.length} members</p>
        <table><thead><tr>
          <th>Membership ID</th><th>Name</th><th>Email</th><th>Phone</th><th>Role</th>
          <th>Status</th><th>Plan</th><th>Member Since</th><th>Issued</th><th>Reserved</th><th>Overdue</th><th>Outstanding Fine</th>
        </tr></thead><tbody>${body}</tbody></table>
        <script>window.onload=function(){setTimeout(function(){window.print()},300)}</script>
      </body></html>`)
      win.document.close()
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    }
  }

  const { content: users, totalPages, totalElements, number: currentPage } = pageData

  const FilterSelect = ({ label, value, onChange, options }) => (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => { onChange(e.target.value); setPage(0) }}
        className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50/60 py-2.5 pl-3 pr-8 text-sm focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-100 dark:border-gray-800 dark:bg-gray-800/60 dark:focus:bg-gray-900"
        aria-label={label}
      >
        <option value="">{label}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
    </div>
  )

  const overviewCards = [
    { title: 'Total Members', value: overview?.totalMembers, icon: UsersIcon, color: 'blue' },
    { title: 'Active Members', value: overview?.activeMembers, icon: CheckCircle2, color: 'green' },
    { title: 'Inactive Members', value: overview?.inactiveMembers, icon: UserX, color: 'amber' },
    { title: 'Blocked Members', value: overview?.blockedMembers, icon: Ban, color: 'rose' },
    { title: 'Premium Members', value: overview?.premiumMembers, icon: Crown, color: 'violet' },
    { title: 'Members With Overdue Books', value: overview?.membersWithOverdueBooks, icon: AlertTriangle, color: 'rose' },
  ]

  const renderKebab = (user) => (
    <div className="relative" ref={openMenuId === user.id ? menuRef : null}>
      <button
        type="button"
        onClick={() => setOpenMenuId(openMenuId === user.id ? null : user.id)}
        className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-gray-800 dark:hover:text-gray-200"
        aria-label="Member actions"
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>
      {openMenuId === user.id && (
        <div className="absolute right-0 z-20 mt-1 w-56 overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-lg dark:border-gray-800 dark:bg-gray-900">
          <button type="button" onClick={() => openProfile(user)} className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800">
            <Eye className="h-4 w-4 text-gray-400" /> View Profile
          </button>
          <button type="button" onClick={() => openEdit(user)} className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800">
            <Pencil className="h-4 w-4 text-gray-400" /> Edit Member
          </button>
          <button type="button" onClick={() => openProfileTab(user, 'loans')} className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800">
            <BookOpen className="h-4 w-4 text-gray-400" /> View Borrow History
          </button>
          <button type="button" onClick={() => openProfileTab(user, 'reservations')} className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800">
            <CalendarClock className="h-4 w-4 text-gray-400" /> View Reservations
          </button>
          <button type="button" onClick={() => openProfileTab(user, 'reading')} className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800">
            <History className="h-4 w-4 text-gray-400" /> View Reading History
          </button>
          <button type="button" onClick={() => openProfileTab(user, 'payments')} className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800">
            <CreditCard className="h-4 w-4 text-gray-400" /> View Payments
          </button>
          <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
          <button type="button" onClick={() => openUpgrade(user)} className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800">
            <ShieldCheck className="h-4 w-4 text-gray-400" /> Upgrade Membership
          </button>
          {(user.status === 'ACTIVE' || user.status === 'PENDING_VERIFICATION') && (
            <>
              <button type="button" onClick={() => changeStatus(user, 'SUSPENDED')} className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-900/20">
                <UserX className="h-4 w-4" /> Suspend Member
              </button>
              <button type="button" onClick={() => changeStatus(user, 'BLOCKED')} className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20">
                <Ban className="h-4 w-4" /> Block Member
              </button>
            </>
          )}
          {(user.status === 'SUSPENDED' || user.status === 'BLOCKED') && (
            <button type="button" onClick={() => changeStatus(user, 'ACTIVE')} className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/20">
              <CheckCircle2 className="h-4 w-4" /> Activate Member
            </button>
          )}
          <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
          <button type="button" onClick={() => { setDeleteTarget(user); setOpenMenuId(null) }} className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20">
            <Trash2 className="h-4 w-4" /> Delete Member
          </button>
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Members</h1>
          <p className="text-sm text-gray-500">Manage registered library members.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" type="button" icon={FileDown} onClick={exportCsv}>Export CSV</Button>
          <Button variant="secondary" type="button" icon={Printer} onClick={exportPdf}>Export PDF</Button>
          <Button variant="secondary" type="button" icon={RefreshCw} onClick={() => { load(); loadOverview() }} loading={loading}>
            Refresh
          </Button>
          <Button type="button" icon={Plus} onClick={openCreate}>Add Member</Button>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {overviewLoading
          ? overviewCards.map((_, i) => <CardSkeleton key={i} />)
          : overviewCards.map((c) => (
              <StatsCard key={c.title} title={c.title} value={c.value ?? 0} icon={c.icon} color={c.color} />
            ))}
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="grid gap-3 lg:grid-cols-[1.6fr_1fr_1fr_1fr_1fr]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Search by name, email, phone or membership ID"
              className="w-full rounded-xl border border-gray-200 bg-gray-50/60 py-2.5 pl-9 pr-3 text-sm focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-100 dark:border-gray-800 dark:bg-gray-800/60 dark:focus:bg-gray-900"
            />
          </div>
          <FilterSelect label="Role" value={roleFilter} onChange={setRoleFilter} options={[
            { value: 'MEMBER', label: 'Member' },
          ]} />
          <FilterSelect label="Status" value={statusFilter} onChange={setStatusFilter} options={[
            { value: 'ACTIVE', label: 'Active' },
            { value: 'INACTIVE', label: 'Inactive' },
            { value: 'PENDING_VERIFICATION', label: 'Pending Verification' },
            { value: 'SUSPENDED', label: 'Suspended' },
            { value: 'BLOCKED', label: 'Blocked' },
          ]} />
          <FilterSelect label="Membership Plan" value={planFilter} onChange={setPlanFilter} options={[
            { value: 'STUDENT', label: 'Student' },
            { value: 'BASIC', label: 'Basic' },
            { value: 'SILVER', label: 'Silver' },
            { value: 'GOLD', label: 'Gold' },
            { value: 'PREMIUM', label: 'Premium' },
          ]} />
          <FilterSelect label="Borrow Status" value={borrowStatusFilter} onChange={setBorrowStatusFilter} options={[
            { value: 'ISSUED', label: 'Has Issued Books' },
            { value: 'RESERVED', label: 'Has Reservations' },
            { value: 'OVERDUE', label: 'Has Overdue Books' },
            { value: 'PENDING_REQUEST', label: 'Has Pending Requests' },
          ]} />
        </div>
        <div className="mt-3 flex items-center justify-between">
          <FilterSelect label="Registered: Newest" value={sortBy} onChange={setSortBy} options={[
            { value: 'oldest', label: 'Oldest first' },
          ]} />
          {hasFilters && (
            <button type="button" onClick={resetFilters} className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400">
              Clear filters
            </button>
          )}
        </div>
      </section>

      {loading ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
        </section>
      ) : users.length === 0 ? (
        <section className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-16 text-center dark:border-gray-700">
          <User className="h-12 w-12 text-gray-300 dark:text-gray-600" />
          <p className="mt-3 font-semibold text-gray-700 dark:text-gray-200">No members found.</p>
          <p className="mt-1 text-sm text-gray-500">Try changing your search or filters.</p>
        </section>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {users.map((u) => (
            <article key={u.id} className="group relative rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-start gap-3">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${avatarGradient(u.name)} text-sm font-bold text-white`}>
                  {initials(u.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-semibold text-gray-900 dark:text-gray-50">{u.name}</h3>
                  </div>
                  <p className="truncate text-xs text-gray-500">{u.email}</p>
                  <p className="mt-0.5 text-xs font-medium text-gray-400">{u.membershipId}</p>
                </div>
                {renderKebab(u)}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_COLORS[u.role] || ROLE_COLORS.MEMBER}`}>{u.role}</span>
                <StatusBadge status={u.status} />
                <PlanBadge plan={u.subscriptionPlan} />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-gray-100 pt-3 text-xs dark:border-gray-800">
                <div>
                  <p className="text-gray-500">Member Since</p>
                  <p className="mt-0.5 font-medium text-gray-800 dark:text-gray-200">{fmtDate(u.enrollmentDate)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Last Login</p>
                  <p className="mt-0.5 font-medium text-gray-800 dark:text-gray-200">{timeAgo(u.lastLogin)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Phone</p>
                  <p className="mt-0.5 truncate font-medium text-gray-800 dark:text-gray-200">{u.phone || '—'}</p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-4 gap-2 rounded-xl bg-gray-50/70 p-2.5 text-center dark:bg-gray-800/40">
                <div>
                  <p className="text-base font-bold text-gray-900 dark:text-gray-50">{u.booksIssued}</p>
                  <p className="text-[10px] text-gray-500">Issued</p>
                </div>
                <div>
                  <p className="text-base font-bold text-gray-900 dark:text-gray-50">{u.reservations}</p>
                  <p className="text-[10px] text-gray-500">Reserved</p>
                </div>
                <div>
                  <p className={`text-base font-bold ${u.overdue > 0 ? 'text-red-500' : 'text-gray-900 dark:text-gray-50'}`}>{u.overdue}</p>
                  <p className="text-[10px] text-gray-500">Overdue</p>
                </div>
                <div>
                  <p className="text-base font-bold text-gray-900 dark:text-gray-50">{formatCurrency(u.outstandingFine)}</p>
                  <p className="text-[10px] text-gray-500">Fine</p>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}

      {totalPages > 1 && (
        <nav className="flex items-center justify-between" aria-label="Pagination">
          <p className="text-sm text-gray-500">
            Showing <span className="font-medium text-gray-800 dark:text-gray-200">{users.length}</span> of{' '}
            <span className="font-medium text-gray-800 dark:text-gray-200">{totalElements}</span> members
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 disabled:opacity-40 dark:hover:bg-gray-800"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPage(i)}
                className={`h-8 w-8 rounded-lg text-sm font-medium transition ${
                  i === currentPage
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              type="button"
              disabled={currentPage >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 disabled:opacity-40 dark:hover:bg-gray-800"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </nav>
      )}

      <Modal
        open={modalOpen}
        title={editing ? 'Edit Member' : 'Add Member'}
        onClose={() => setModalOpen(false)}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={saveUser} loading={saving}>{editing ? 'Save Changes' : 'Add Member'}</Button>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormInput label="Full name" id="member-name" value={form.name} error={errors.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <FormInput label="Email" id="member-email" type="email" value={form.email} error={errors.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <FormInput label="Phone (optional)" id="member-phone" value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <FormInput label="Member since" id="member-enrollment" type="date" value={form.enrollmentDate}
            onChange={(e) => setForm({ ...form, enrollmentDate: e.target.value })} />
          {!editing && (
            <>
              <div>
                <label htmlFor="member-role" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">Account Type</label>
                <select
                  id="member-role"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/60 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:border-gray-800 dark:bg-gray-800/60"
                >
                  <option value="MEMBER">Member</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </div>
              <FormInput label="Password" id="member-password" type="password" value={form.password} error={errors.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </>
          )}
        </div>
      </Modal>

      <Modal
        open={profileOpen}
        title={profileUser ? `Member Profile · ${profileUser.name}` : 'Member Profile'}
        size="lg"
        onClose={() => setProfileOpen(false)}
      >
        {profileUser && (
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-gray-100 pb-3 dark:border-gray-800">
              {PROFILE_TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => switchTab(t.key)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition ${
                    profileTab === t.key
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                  }`}
                >
                  <t.icon className="h-4 w-4" />
                  {t.label}
                </button>
              ))}
            </div>

            {tabLoading && profileTab !== 'personal' && <CardSkeleton />}

            {profileTab === 'personal' && (
              profileData ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${avatarGradient(profileData.name)} text-xl font-bold text-white`}>
                      {initials(profileData.name)}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50">{profileData.name}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <StatusBadge status={profileData.status} />
                        <PlanBadge plan={profileData.subscriptionPlan} />
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_COLORS[profileData.role] || ROLE_COLORS.MEMBER}`}>{ROLE_LABEL[profileData.role] || 'Member'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="flex items-center gap-3 rounded-xl border border-gray-100 p-3 dark:border-gray-800">
                      <Mail className="h-4 w-4 shrink-0 text-gray-400" />
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500">Email</p>
                        <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">{profileData.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-xl border border-gray-100 p-3 dark:border-gray-800">
                      <Phone className="h-4 w-4 shrink-0 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Phone</p>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{profileData.phone || '—'}</p>
                      </div>
                    </div>
                    <div className="rounded-xl border border-gray-100 p-3 dark:border-gray-800">
                      <p className="text-xs text-gray-500">Membership No</p>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{profileData.membershipId}</p>
                    </div>
                    <div className="rounded-xl border border-gray-100 p-3 dark:border-gray-800">
                      <p className="text-xs text-gray-500">Joined</p>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{fmtDateTime(profileData.createdAt)}</p>
                    </div>
                    <div className="rounded-xl border border-gray-100 p-3 dark:border-gray-800">
                      <p className="text-xs text-gray-500">Member Since</p>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{fmtDate(profileData.enrollmentDate)}</p>
                    </div>
                    <div className="rounded-xl border border-gray-100 p-3 dark:border-gray-800">
                      <p className="text-xs text-gray-500">Last Login</p>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{fmtDateTime(profileData.lastLogin)}</p>
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">Member Statistics</p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <ProfileStat label="Issued Books" value={profileData.stats?.booksIssued ?? 0} />
                      <ProfileStat label="Returned Books" value={profileData.stats?.booksReturned ?? 0} />
                      <ProfileStat label="Reservations" value={profileData.stats?.activeReservations ?? 0} />
                      <ProfileStat label="Completed Reservations" value={profileData.stats?.completedReservations ?? 0} />
                      <ProfileStat label="Pending Requests" value={profileData.stats?.pendingBorrowRequests ?? 0} />
                      <ProfileStat label="Overdue Books" value={profileData.stats?.overdueBooks ?? 0} />
                      <ProfileStat label="Amount Due" value={formatCurrency(profileData.stats?.totalFine)} />
                      <ProfileStat label="Total Payments" value={formatCurrency(profileData.stats?.totalPaymentsAmount)} />
                    </div>
                  </div>
                </div>
              ) : (
                <CardSkeleton />
              )
            )}

            {profileTab === 'membership' && !tabLoading && (
              tabData.membership && tabData.membership.length ? (
                <div className="space-y-3">
                  {tabData.membership.map((s) => (
                    <div key={s.id} className="flex items-center justify-between rounded-xl border border-gray-100 p-4 dark:border-gray-800">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-gray-50">{s.plan?.name || s.planName}</p>
                        <p className="text-xs text-gray-500">{fmtDate(s.startDate)} → {fmtDate(s.endDate)}</p>
                      </div>
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        s.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                          : s.status === 'EXPIRING'
                            ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                      }`}>{MEMBERSHIP_STATUS_LABEL[s.status] || '—'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-6 text-center text-sm text-gray-500">No membership history yet.</p>
              )
            )}

            {profileTab === 'loans' && !tabLoading && (
              tabData.loans && tabData.loans.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-xs text-gray-500 dark:border-gray-800">
                        <th className="pb-2 pr-3 font-medium">Book</th>
                        <th className="pb-2 pr-3 font-medium">Borrowed On</th>
                        <th className="pb-2 pr-3 font-medium">Return By</th>
                        <th className="pb-2 pr-3 font-medium">Returned</th>
                        <th className="pb-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tabData.loans.map((l) => (
                        <tr key={l.id} className="border-b border-gray-50 dark:border-gray-800/50">
                          <td className="py-2.5 pr-3 font-medium text-gray-800 dark:text-gray-200">{l.bookTitle || l.book?.title}</td>
                          <td className="py-2.5 pr-3 text-gray-600 dark:text-gray-300">{fmtDate(l.issueDate)}</td>
                          <td className="py-2.5 pr-3 text-gray-600 dark:text-gray-300">{fmtDate(l.dueDate)}</td>
                          <td className="py-2.5 pr-3 text-gray-600 dark:text-gray-300">{fmtDate(l.returnDate)}</td>
                          <td className="py-2.5"><LoanStatusBadge status={l.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="py-6 text-center text-sm text-gray-500">No borrowed books yet.</p>
              )
            )}

            {profileTab === 'reservations' && !tabLoading && (
              tabData.reservations && tabData.reservations.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-xs text-gray-500 dark:border-gray-800">
                        <th className="pb-2 pr-3 font-medium">Reservation</th>
                        <th className="pb-2 pr-3 font-medium">Book</th>
                        <th className="pb-2 pr-3 font-medium">Date</th>
                        <th className="pb-2 pr-3 font-medium">Queue</th>
                        <th className="pb-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tabData.reservations.map((r) => (
                        <tr key={r.id} className="border-b border-gray-50 dark:border-gray-800/50">
                          <td className="py-2.5 pr-3 font-medium text-gray-800 dark:text-gray-200">{r.reservationNumber}</td>
                          <td className="py-2.5 pr-3 text-gray-600 dark:text-gray-300">{r.book?.title || r.bookTitle}</td>
                          <td className="py-2.5 pr-3 text-gray-600 dark:text-gray-300">{fmtDate(r.reservationDate)}</td>
                          <td className="py-2.5 pr-3 text-gray-600 dark:text-gray-300">#{r.queuePosition ?? '—'}</td>
                          <td className="py-2.5"><ReservationStatusBadge status={r.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="py-6 text-center text-sm text-gray-500">No reservations yet.</p>
              )
            )}

            {profileTab === 'payments' && !tabLoading && (
              tabData.payments && tabData.payments.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-xs text-gray-500 dark:border-gray-800">
                        <th className="pb-2 pr-3 font-medium">Date</th>
                        <th className="pb-2 pr-3 font-medium">Type</th>
                        <th className="pb-2 pr-3 font-medium">Amount</th>
                        <th className="pb-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tabData.payments.map((p) => (
                        <tr key={p.id} className="border-b border-gray-50 dark:border-gray-800/50">
                          <td className="py-2.5 pr-3 text-gray-600 dark:text-gray-300">{fmtDateTime(p.completedAt || p.createdAt)}</td>
                          <td className="py-2.5 pr-3 font-medium text-gray-800 dark:text-gray-200">{PAYMENT_TYPE_LABEL[p.paymentType] || 'Payment'}</td>
                          <td className="py-2.5 pr-3 text-gray-800 dark:text-gray-200">{formatCurrency(p.amount)}</td>
                          <td className="py-2.5">
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              p.status === 'SUCCESS'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                            }`}>{PAYMENT_STATUS_LABEL[p.status] || 'Unpaid'}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="py-6 text-center text-sm text-gray-500">No payments yet.</p>
              )
            )}

            {profileTab === 'reading' && !tabLoading && (
              <div className="space-y-4">
                {tabData.reading?.stats && (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <ProfileStat label="Books Read" value={tabData.reading.stats.totalBooksRead ?? 0} />
                    <ProfileStat label="Reading Days" value={tabData.reading.stats.totalReadingDays ?? 0} />
                    <ProfileStat label="Currently Borrowed" value={tabData.reading.stats.currentlyBorrowed ?? 0} />
                    <ProfileStat label="Returned" value={tabData.reading.stats.returnedBooks ?? 0} />
                    <ProfileStat label="Overdue Returns" value={tabData.reading.stats.overdueReturns ?? 0} />
                    <ProfileStat label="Average Rating" value={tabData.reading.stats.averageRating ?? '—'} />
                    <ProfileStat label="Favorite Genre" value={tabData.reading.stats.favoriteGenre ?? '—'} />
                    <ProfileStat label="Fine Paid" value={formatCurrency(tabData.reading.stats.totalFinePaid)} />
                  </div>
                )}
                {tabData.reading?.history && tabData.reading.history.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 text-xs text-gray-500 dark:border-gray-800">
                          <th className="pb-2 pr-3 font-medium">Book</th>
                          <th className="pb-2 pr-3 font-medium">Borrowed</th>
                          <th className="pb-2 pr-3 font-medium">Returned</th>
                          <th className="pb-2 pr-3 font-medium">Rating</th>
                          <th className="pb-2 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tabData.reading.history.map((h) => (
                          <tr key={h.id} className="border-b border-gray-50 dark:border-gray-800/50">
                            <td className="py-2.5 pr-3 font-medium text-gray-800 dark:text-gray-200">{h.book?.title}</td>
                            <td className="py-2.5 pr-3 text-gray-600 dark:text-gray-300">{fmtDate(h.borrowDate)}</td>
                            <td className="py-2.5 pr-3 text-gray-600 dark:text-gray-300">{fmtDate(h.returnDate)}</td>
                            <td className="py-2.5 pr-3 text-gray-600 dark:text-gray-300">{h.rating ? `${h.rating}/5` : '—'}</td>
                            <td className="py-2.5"><LoanStatusBadge status={h.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="py-4 text-center text-sm text-gray-500">No reading history yet.</p>
                )}
              </div>
            )}

            {profileTab === 'notifications' && !tabLoading && (
              tabData.notifications && tabData.notifications.length ? (
                <ul className="space-y-3">
                  {tabData.notifications.map((n) => (
                    <li key={n.id} className="flex items-start gap-3 rounded-xl border border-gray-100 p-3 dark:border-gray-800">
                      <div className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${n.isRead ? 'bg-gray-300' : 'bg-primary-500'}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{n.title}</p>
                        <p className="text-xs text-gray-500">{n.message}</p>
                        <p className="mt-1 text-xs text-gray-400">{fmtDateTime(n.createdAt)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-6 text-center text-sm text-gray-500">No notifications yet.</p>
              )
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={upgradeOpen}
        title={`Upgrade Membership · ${upgradeTarget?.name || ''}`}
        onClose={() => setUpgradeOpen(false)}
      >
        <p className="mb-4 text-sm text-gray-500">Choose a plan to grant this member. The plan is activated immediately by an administrator.</p>
        <div className="space-y-3">
          {plans.map((plan) => (
            <div key={plan.id} className="flex items-center justify-between rounded-xl border border-gray-100 p-4 dark:border-gray-800">
              <div>
                <p className="font-semibold text-gray-900 dark:text-gray-50">{plan.name}</p>
                <p className="text-xs text-gray-500">{plan.maxBooks} books · {plan.maxLoanDays} days · {plan.validityDays} days</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-gray-900 dark:text-gray-50">{formatCurrency(plan.price)}</span>
                <Button size="xs" loading={upgradingId === plan.id} onClick={() => upgradeTo(plan)}>Grant</Button>
              </div>
            </div>
          ))}
          {plans.length === 0 && <p className="py-4 text-center text-sm text-gray-500">No active plans available.</p>}
        </div>
      </Modal>

      <Modal
        open={!!deleteTarget}
        title="Delete Member"
        size="sm"
        onClose={() => setDeleteTarget(null)}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="danger" onClick={confirmDelete}>Delete</Button>
          </div>
        }
      >
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Are you sure you want to delete <span className="font-semibold">{deleteTarget?.name}</span>? Their profile will be hidden and they will no longer be able to sign in. Active loans may prevent deletion.
        </p>
      </Modal>
    </div>
  )
}
