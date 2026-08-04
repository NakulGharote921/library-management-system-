import { useSelector } from 'react-redux'
import { NavLink } from 'react-router-dom'
import {
  BarChart3,
  BookOpen,
  BookMarked,
  History,
  LayoutDashboard,
  Library,
  Users,
  CreditCard,
  CalendarRange,
  User,
  Settings,
  ShieldAlert,
  FolderTree,
  Award,
  TrendingUp,
  UserCog,
  Heart,
  BookmarkCheck,
  ClipboardList,
} from 'lucide-react'
import { Crown } from 'lucide-react'
import { selectUserRole, selectUser } from '../store/authSlice.js'

const GUEST_ITEMS = [
  { to: '/', label: 'Home', icon: LayoutDashboard },
  { to: '/books', label: 'Books', icon: Library },
  { to: '/categories', label: 'Categories', icon: FolderTree },
  { to: '/about', label: 'About Library', icon: BookOpen },
  { to: '/login', label: 'Login', icon: User },
  { to: '/register', label: 'Register', icon: UserCog },
]

const MEMBER_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/books', label: 'Books', icon: Library },
  { to: '/history', label: 'Issued Books', icon: BookMarked },
  { to: '/borrow-requests', label: 'Borrow Requests', icon: ClipboardList },
  { to: '/reservations', label: 'Reservations', icon: CalendarRange },
  { to: '/reading-history', label: 'Reading History', icon: BookmarkCheck },
  { to: '/wishlist', label: 'Wishlist', icon: Heart },
  { to: '/membership', label: 'Membership Plans', icon: Crown },
  { to: '/payments', label: 'Payments', icon: CreditCard },
  { to: '/profile', label: 'Profile', icon: User },
]

const ADMIN_ITEMS_TOP = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/books', label: 'Books', icon: Library },
  { to: '/categories', label: 'Categories', icon: FolderTree },
]

const ADMIN_PEOPLE = [
  { to: '/members', label: 'Members', icon: Users },
]

const ADMIN_MID = [
  { to: '/issue', label: 'Issue Book', icon: BookOpen },
  { to: '/borrow-requests', label: 'Borrow Requests', icon: ClipboardList },
  { to: '/reservations', label: 'Reservations', icon: CalendarRange },
  { to: '/history', label: 'History', icon: History },
  { to: '/subscriptions', label: 'Subscriptions', icon: Award },
  { to: '/payments', label: 'Payments', icon: CreditCard },
  { to: '/report', label: 'Reports', icon: BarChart3 },
  { to: '/analytics', label: 'Analytics', icon: TrendingUp },
  { to: '/audit-logs', label: 'Audit Logs', icon: ShieldAlert },
]

const ADMIN_ITEMS_BOTTOM = [
  { to: '/settings', label: 'Settings', icon: Settings },
]

const ROLE_ITEMS = {
  ADMIN: { top: ADMIN_ITEMS_TOP, people: ADMIN_PEOPLE, mid: ADMIN_MID, bottom: ADMIN_ITEMS_BOTTOM },
}

function renderNavItems(items) {
  return items.map(({ to, label, icon: Icon }) => (
    <NavLink
      key={to}
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
          isActive
            ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-md shadow-primary-500/25'
            : 'text-gray-600 hover:bg-primary-50 hover:text-primary-800 dark:text-gray-300 dark:hover:bg-gray-800'
        }`
      }
    >
      <Icon className="h-5 w-5 shrink-0 transition group-hover:scale-105" aria-hidden />
      <span>{label}</span>
    </NavLink>
  ))
}

export default function Sidebar() {
  const user = useSelector(selectUser)
  const role = useSelector(selectUserRole)

  if (!user) {
    return (
      <aside className="fixed left-0 top-16 z-30 hidden h-[calc(100vh-4rem)] w-64 flex-col border-r border-gray-100 bg-white/90 px-3 py-6 shadow-sm backdrop-blur-lg dark:border-gray-800 dark:bg-gray-950/90 lg:flex">
        <div className="mb-6 px-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Welcome</p>
          <p className="text-sm text-gray-600 dark:text-gray-300">Library catalog</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1" aria-label="Guest navigation">
          {renderNavItems(GUEST_ITEMS)}
        </nav>
      </aside>
    )
  }

  if (role === 'ADMIN') {
    return (
      <aside className="fixed left-0 top-16 z-30 hidden h-[calc(100vh-4rem)] w-64 flex-col border-r border-gray-100 bg-white/90 px-3 py-6 shadow-sm backdrop-blur-lg dark:border-gray-800 dark:bg-gray-950/90 lg:flex">
        <div className="mb-6 px-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Navigate</p>
          <p className="text-sm text-gray-600 dark:text-gray-300">Administration</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto" aria-label="Admin sidebar">
          {renderNavItems(ROLE_ITEMS.ADMIN.top)}
          <p className="mt-4 mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">People</p>
          {renderNavItems(ROLE_ITEMS.ADMIN.people)}
          <p className="mt-4 mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Operations</p>
          {renderNavItems(ROLE_ITEMS.ADMIN.mid)}
          <div className="mt-auto pt-4">
            <hr className="mb-2 border-gray-200 dark:border-gray-700" />
            {renderNavItems(ROLE_ITEMS.ADMIN.bottom)}
          </div>
        </nav>
        <div className="mt-4 rounded-xl border border-dashed border-primary-100 bg-primary-50/60 p-3 text-xs text-primary-800 dark:border-primary-900/40 dark:bg-primary-950/40 dark:text-primary-100">
          Manage system settings and users from here.
        </div>
      </aside>
    )
  }

  const items = MEMBER_ITEMS
  const subtitle = 'Member area'

  return (
    <aside className="fixed left-0 top-16 z-30 hidden h-[calc(100vh-4rem)] w-64 flex-col border-r border-gray-100 bg-white/90 px-3 py-6 shadow-sm backdrop-blur-lg dark:border-gray-800 dark:bg-gray-950/90 lg:flex">
      <div className="mb-6 px-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Navigate</p>
        <p className="text-sm text-gray-600 dark:text-gray-300">{subtitle}</p>
      </div>
      <nav className="flex flex-1 flex-col gap-1" aria-label="Sidebar">
        {renderNavItems(items)}
      </nav>
      <div className="mt-auto rounded-xl border border-dashed border-primary-100 bg-primary-50/60 p-3 text-xs text-primary-800 dark:border-primary-900/40 dark:bg-primary-950/40 dark:text-primary-100">
        Track your loans and reservations.
      </div>
    </aside>
  )
}
