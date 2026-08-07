import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import {
  ArrowRight,
  BookMarked,
  BookOpen,
  Library,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users,
  CalendarClock,
  DollarSign,
  AlertTriangle,
  BarChart3,
  Clock,
  LogIn,
  UserPlus as UserPlusIcon,
} from 'lucide-react'
import StatsCard from '../components/StatsCard.jsx'
import Button from '../components/Button.jsx'
import { CardSkeleton } from '../components/PageSkeleton.jsx'
import { dashboardService, adminDashboardService, getApiErrorMessage, userSubscriptionService } from '../services/api.js'
import { selectUser, selectUserRole } from '../store/authSlice.js'

function GuestHome() {
  return (
    <div className="space-y-8 animate-fadeIn">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-700 via-primary-600 to-sky-500 p-8 text-white shadow-xl">
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/15 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ring-white/30">
              <Sparkles className="h-3.5 w-3.5" />
              Welcome
            </p>
            <h1 className="mt-4 text-3xl font-bold tracking-tight lg:text-4xl">Welcome to the Library</h1>
            <p className="mt-2 max-w-xl text-sm text-white/85">
              Explore our catalog, discover new books, and manage your reading journey.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/login" className="inline-flex items-center gap-2 rounded-xl bg-white/90 px-4 py-2.5 text-sm font-semibold text-primary-800 transition hover:bg-white">
              <LogIn className="h-4 w-4" />
              Sign In
            </Link>
            <Link to="/register" className="inline-flex items-center gap-2 rounded-xl border border-white/40 bg-transparent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10">
              <UserPlusIcon className="h-4 w-4" />
              Create Account
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <Library className="h-8 w-8 text-primary-600" />
          <h3 className="mt-3 text-lg font-semibold text-gray-900 dark:text-gray-50">Browse Catalog</h3>
          <p className="mt-1 text-sm text-gray-500">Explore our collection of books</p>
          <Link to="/books" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700">
            View books <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <TrendingUp className="h-8 w-8 text-primary-600" />
          <h3 className="mt-3 text-lg font-semibold text-gray-900 dark:text-gray-50">Categories</h3>
          <p className="mt-1 text-sm text-gray-500">Find books by category</p>
          <Link to="/categories" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700">
            Browse categories <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <BookOpen className="h-8 w-8 text-primary-600" />
          <h3 className="mt-3 text-lg font-semibold text-gray-900 dark:text-gray-50">New Arrivals</h3>
          <p className="mt-1 text-sm text-gray-500">Check out the latest additions</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <Users className="h-8 w-8 text-primary-600" />
          <h3 className="mt-3 text-lg font-semibold text-gray-900 dark:text-gray-50">Library Info</h3>
          <p className="mt-1 text-sm text-gray-500">Hours, policies, and more</p>
          <Link to="/about" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700">
            Learn more <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>
    </div>
  )
}

function RoleGreeting({ role, name }) {
  if (role === 'ADMIN') return `Welcome back, ${name || 'Admin'}`
  return `Welcome back, ${name || 'Member'}`
}

function RoleDescription({ role }) {
  if (role === 'ADMIN') return 'Oversee operations, manage members, and configure system settings.'
  return 'Track your loans, reservations, and manage your library profile.'
}

function AdminDashboard({ stats }) {
  return (
    <>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatsCard title="Total books" value={stats?.totalBooks ?? 0} icon={Library} color="blue" trend="Catalog size" />
        <StatsCard title="Total Members" value={stats?.totalMembers ?? 0} icon={Users} color="violet" trend="Registered users" />
        <StatsCard title="Available Copies" value={stats?.availableCopies ?? 0} icon={TrendingUp} color="green" trend="On shelves" />
        <StatsCard title="Borrowed Copies" value={stats?.borrowedCopies ?? 0} icon={BookMarked} color="amber" trend="On loan" />
      </section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatsCard title="Active Loans" value={stats?.activeLoans ?? 0} icon={BarChart3} color="amber" trend="Currently on loan" />
        <StatsCard title="Overdue Books" value={stats?.overdueBooks ?? 0} icon={AlertTriangle} color="rose" trend="Past due date" />
      </section>
    </>
  )
}

function MemberDashboard({ stats, navigate, summary }) {
  const planName = summary?.membershipName
  const allowed = summary?.allowedBooks ?? 0
  const borrowed = summary?.borrowedBooks ?? 0
  const progress = allowed > 0 ? Math.min(100, (borrowed / allowed) * 100) : 0
  return (
    <>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-start justify-between">
            <div >
              <p className="text-sm font-medium text-gray-500">Membership</p>
              <p className="mt-2 flex items-center text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50 uppercase">
                {planName || 'No Plan'}
                {planName === 'Student' && <i className="fi fi-rs-badge ml-2 text-amber-500" aria-hidden="true" />}
              </p>
              {summary ? (
                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Borrow Limit</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">{borrowed} / {allowed} Books</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                    <div className="h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-500" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Expires</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                      {summary.expiryDate ? new Date(`${summary.expiryDate}T00:00:00`).toLocaleDateString() : '—'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    {summary.daysRemaining > 0 ? `${summary.daysRemaining} days remaining` : 'Expired — Renew now'}
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-xs text-gray-400">No active plan</p>
              )}
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-inner">
              <i className="fi fi-rs-badge text-2xl leading-none" aria-hidden="true" />
            </div>
          </div>
        </div>
        <StatsCard title="Active Loans" value={stats?.activeIssues ?? 0} icon={() => <i className="fi fi-sr-book-bookmark text-2xl leading-none" aria-hidden />} color="blue" trend="Currently borrowed" />
        <StatsCard title="Due Soon" value={stats?.dueSoon ?? 0} icon={Clock} color="amber" trend="Return within 3 days" />
        <StatsCard title="Reservations" value={stats?.reservations ?? 0} icon={CalendarClock} color="violet" trend="Pending pickups" />
        <StatsCard title="Outstanding Fines" value={stats?.outstandingFines ?? 0} icon={DollarSign} color="rose" trend="Overdue charges" />
      </section>
      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-50">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <button
            type="button"
            onClick={() => navigate('/books')}
            className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-800 transition hover:border-primary-200 hover:bg-white hover:shadow-md dark:border-gray-800 dark:bg-gray-800/60 dark:text-gray-100 dark:hover:bg-gray-800"
          >
            <span className="inline-flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary-600" />
              Borrow Book
            </span>
            <ArrowRight className="h-4 w-4 text-gray-400" />
          </button>
          <button
            type="button"
            onClick={() => navigate('/history')}
            className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-800 transition hover:border-primary-200 hover:bg-white hover:shadow-md dark:border-gray-800 dark:bg-gray-800/60 dark:text-gray-100 dark:hover:bg-gray-800"
          >
            <span className="inline-flex items-center gap-2">
              <BookMarked className="h-4 w-4 text-primary-600" />
              Renew Loan
            </span>
            <ArrowRight className="h-4 w-4 text-gray-400" />
          </button>
          <button
            type="button"
            onClick={() => navigate('/reservations')}
            className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-800 transition hover:border-primary-200 hover:bg-white hover:shadow-md dark:border-gray-800 dark:bg-gray-800/60 dark:text-gray-100 dark:hover:bg-gray-800"
          >
            <span className="inline-flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-primary-600" />
              Reserve Book
            </span>
            <ArrowRight className="h-4 w-4 text-gray-400" />
          </button>
          <button
            type="button"
            onClick={() => navigate('/payments')}
            className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-800 transition hover:border-primary-200 hover:bg-white hover:shadow-md dark:border-gray-800 dark:bg-gray-800/60 dark:text-gray-100 dark:hover:bg-gray-800"
          >
            <span className="inline-flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary-600" />
              Pay Fine
            </span>
            <ArrowRight className="h-4 w-4 text-gray-400" />
          </button>
        </div>
      </section>
    </>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const user = useSelector(selectUser)
  const role = useSelector(selectUserRole)
  const [stats, setStats] = useState(null)
  const [adminStats, setAdminStats] = useState(null)
  const [membershipSummary, setMembershipSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const loadData = async () => {
      try {
        const promises = [dashboardService.getStats(), userSubscriptionService.getSummary()]
        if (role === 'ADMIN') promises.push(adminDashboardService.getDashboard())
        const results = await Promise.allSettled(promises)
        if (!cancelled) {
          const [statsResult, summaryResult] = results
          if (statsResult.status === 'fulfilled') setStats(statsResult.value)
          else toast.error(getApiErrorMessage(statsResult.reason))
          if (summaryResult.status === 'fulfilled' && summaryResult.value) setMembershipSummary(summaryResult.value)
          if (results.length > 2 && results[2].status === 'fulfilled') setAdminStats(results[2].value)
        }
      } catch (e) {
        toast.error(getApiErrorMessage(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadData()
    const onRefresh = () => { if (!cancelled) loadData() }
    window.addEventListener('dashboard:refresh', onRefresh)
    window.addEventListener('focus', onRefresh)
    return () => {
      cancelled = true
      window.removeEventListener('dashboard:refresh', onRefresh)
      window.removeEventListener('focus', onRefresh)
    }
  }, [role])

  if (!user) {
    return <GuestHome />
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </section>
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={`b-${i}`} />)}
        </section>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-700 via-primary-600 to-sky-500 p-8 text-white shadow-xl">
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ring-white/30">
              <Sparkles className="h-3.5 w-3.5" />
              {role === 'MEMBER' ? 'My Dashboard' : 'Overview'}
            </p>
            <h1 className="mt-4 text-3xl font-bold tracking-tight lg:text-4xl">
              <RoleGreeting role={role} name={user?.name} />
            </h1>
            <p className="mt-2 max-w-xl text-sm text-white/85">
              <RoleDescription role={role} />
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {role === 'ADMIN' && (
              <>
                <Button variant="secondary" className="!bg-white/90 !text-primary-800 hover:!bg-white" icon={BarChart3} type="button" onClick={() => navigate('/report')}>
                  View Analytics
                </Button>
                <Button variant="secondary" className="!border-white/40 !bg-transparent !text-white hover:!bg-white/10" icon={UserPlus} type="button" onClick={() => navigate('/users')}>
                  Add User
                </Button>
              </>
            )}
            {role === 'MEMBER' && (
              <Button variant="secondary" className="!bg-white/90 !text-primary-800 hover:!bg-white" icon={BookOpen} type="button" onClick={() => navigate('/books')}>
                Browse catalog
              </Button>
            )}
          </div>
        </div>
      </section>

      {role === 'ADMIN' && <AdminDashboard stats={adminStats || stats} />}
      {role === 'MEMBER' && <MemberDashboard stats={stats} navigate={navigate} summary={membershipSummary} />}

      {role === 'ADMIN' && (
        <section>
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Quick actions</h2>
            <p className="text-sm text-gray-500">Shortcuts to frequent workflows</p>
            <div className="mt-4 space-y-3">
              {role === 'ADMIN' ? (
                <>
                  <button type="button" onClick={() => navigate('/books')} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-800 transition hover:border-primary-200 hover:bg-white hover:shadow-md dark:border-gray-800 dark:bg-gray-800/60 dark:text-gray-100 dark:hover:bg-gray-800">
                    <span className="inline-flex items-center gap-2"><Library className="h-4 w-4 text-primary-600" /> Add Book</span><ArrowRight className="h-4 w-4 text-gray-400" />
                  </button>
                  <button type="button" onClick={() => navigate('/users')} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-800 transition hover:border-primary-200 hover:bg-white hover:shadow-md dark:border-gray-800 dark:bg-gray-800/60 dark:text-gray-100 dark:hover:bg-gray-800">
                    <span className="inline-flex items-center gap-2"><UserPlus className="h-4 w-4 text-primary-600" /> Add User</span><ArrowRight className="h-4 w-4 text-gray-400" />
                  </button>
                  <button type="button" onClick={() => navigate('/categories')} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-800 transition hover:border-primary-200 hover:bg-white hover:shadow-md dark:border-gray-800 dark:bg-gray-800/60 dark:text-gray-100 dark:hover:bg-gray-800">
                    <span className="inline-flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary-600" /> Create Category</span><ArrowRight className="h-4 w-4 text-gray-400" />
                  </button>
                  <button type="button" onClick={() => navigate('/report')} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-800 transition hover:border-primary-200 hover:bg-white hover:shadow-md dark:border-gray-800 dark:bg-gray-800/60 dark:text-gray-100 dark:hover:bg-gray-800">
                    <span className="inline-flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary-600" /> View Analytics</span><ArrowRight className="h-4 w-4 text-gray-400" />
                  </button>
                </>
              ) : (
                <>
                  <button type="button" onClick={() => navigate('/issue')} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-800 transition hover:border-primary-200 hover:bg-white hover:shadow-md dark:border-gray-800 dark:bg-gray-800/60 dark:text-gray-100 dark:hover:bg-gray-800">
                    <span className="inline-flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary-600" /> Issue book</span><ArrowRight className="h-4 w-4 text-gray-400" />
                  </button>
                  <button type="button" onClick={() => navigate('/books')} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-800 transition hover:border-primary-200 hover:bg-white hover:shadow-md dark:border-gray-800 dark:bg-gray-800/60 dark:text-gray-100 dark:hover:bg-gray-800">
                    <span className="inline-flex items-center gap-2"><Library className="h-4 w-4 text-primary-600" /> Add book</span><ArrowRight className="h-4 w-4 text-gray-400" />
                  </button>
                  <button type="button" onClick={() => navigate('/users')} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-800 transition hover:border-primary-200 hover:bg-white hover:shadow-md dark:border-gray-800 dark:bg-gray-800/60 dark:text-gray-100 dark:hover:bg-gray-800">
                    <span className="inline-flex items-center gap-2"><UserPlus className="h-4 w-4 text-primary-600" /> Add user</span><ArrowRight className="h-4 w-4 text-gray-400" />
                  </button>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Recent activity</h2>
            <p className="text-sm text-gray-500">Latest five circulation events</p>
          </div>
        </div>
        <ol className="mt-6 space-y-4">
          {(stats?.recentIssues || []).map((issue, idx) => (
            <li key={issue.id} className="relative flex gap-4">
              <div className="flex flex-col items-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-50 text-sm font-semibold text-primary-700 ring-2 ring-primary-100 dark:bg-primary-950 dark:text-primary-100 dark:ring-primary-900">
                  {idx + 1}
                </div>
                {idx < (stats?.recentIssues?.length || 0) - 1 ? (
                  <div className="mt-1 h-full w-px flex-1 bg-gradient-to-b from-primary-200 to-transparent dark:from-primary-800" />
                ) : null}
              </div>
              <div className="flex-1 rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/40">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                  {issue.bookTitle}{' '}
                  <span className="font-normal text-gray-500 dark:text-gray-400">→ {issue.userName}</span>
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Issued {issue.issueDate} · Due {issue.dueDate}
                  {issue.returnDate ? ` · Returned ${issue.returnDate}` : ''}
                </p>
                <span
                  className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    issue.status === 'RETURNED'
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200'
                      : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-100'
                  }`}
                >
                  {issue.status}
                </span>
              </div>
            </li>
          ))}
          {(!stats?.recentIssues || stats.recentIssues.length === 0) && (
            <p className="text-sm text-gray-500">No recent issues to display.</p>
          )}
        </ol>
      </section>
    </div>
  )
}
