import { useCallback, useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { NavLink } from 'react-router-dom'
import {
  BarChart3,
  BookOpen,
  LayoutDashboard,
  Library,
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
  X,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'
import { Crown } from 'lucide-react'
import { selectUserRole, selectUser } from '../store/authSlice.js'
import { selectUi, setSidebarOpen, setSidebarCollapsed } from '../store/uiSlice.js'

const GUEST_ITEMS = [
  { to: '/home', label: 'Home', icon: LayoutDashboard },
  { to: '/books', label: 'Browse Books', icon: Library },
  { to: '/categories', label: 'Categories', icon: FolderTree },
  { to: '/about', label: 'About Library', icon: BookOpen },
  { to: '/login', label: 'Login', icon: User },
  { to: '/register', label: 'Create Account', icon: UserCog },
]

const MEMBER_ITEMS = [
  { to: '/', label: 'Home', icon: '/dashboard.png' },
  { to: '/books', label: 'Browse Books', icon: Library },
  { to: '/history', label: 'My Books', icon: '/book.png' },
  { to: '/borrow-requests', label: 'Borrow Requests', icon: ClipboardList },
  { to: '/reservations', label: 'Reservations', icon: CalendarRange },
  { to: '/reading-history', label: 'Reading History', icon: BookmarkCheck },
  { to: '/wishlist', label: 'Wishlist', icon: Heart },
  { to: '/membership', label: 'Membership', icon: Crown },
  { to: '/payments', label: 'Payments', icon: CreditCard },
  { to: '/profile', label: 'Profile', icon: User },
]

const ADMIN_ITEMS_TOP = [
  { to: '/', label: 'Dashboard', icon: '/dashboard.png' },
  { to: '/books', label: 'Books', icon: Library },
  { to: '/categories', label: 'Categories', icon: FolderTree },
]

const ADMIN_PEOPLE = [
  { to: '/members', label: 'Members', icon: '/card.png' },
]

const ADMIN_MID = [
  { to: '/issue', label: 'Borrow Book', icon: BookOpen },
  { to: '/borrow-requests', label: 'Borrow Requests', icon: ClipboardList },
  { to: '/reservations', label: 'Reservations', icon: CalendarRange },
  { to: '/history', label: 'Borrowed Books', icon: '/book.png' },
  { to: '/subscriptions', label: 'Membership Plans', icon: Award },
  { to: '/payments', label: 'Payments', icon: CreditCard },
  { to: '/report', label: 'Reports', icon: BarChart3 },
  { to: '/analytics', label: 'Analytics', icon: TrendingUp },
  { to: '/audit-logs', label: 'Activity Log', icon: ShieldAlert },
]

const ADMIN_ITEMS_BOTTOM = [
  { to: '/settings', label: 'Settings', icon: Settings },
]

function renderNavItems(items, collapsed, onNavigate) {
  return items.map(({ to, label, icon: IconComponent }) => (
    <NavLink
      key={to}
      to={to}
      end={to === '/'}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
      aria-label={collapsed ? label : undefined}
      className={({ isActive }) =>
        `group relative flex min-h-12 items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200 lg:min-h-[52px] lg:text-base ${
          collapsed ? 'justify-center' : 'px-3 py-2.5'
        } ${
          isActive
            ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-md shadow-primary-500/25'
            : 'text-gray-600 hover:bg-primary-50 hover:text-primary-800 dark:text-gray-300 dark:hover:bg-gray-800'
        }`
      }
    >
      {typeof IconComponent === 'string' ? (
        <img src={IconComponent} alt="" aria-hidden className="h-5 w-5 shrink-0 rounded transition group-hover:scale-105 lg:h-[22px] lg:w-[22px]" />
      ) : (
        <IconComponent className="h-5 w-5 shrink-0 transition group-hover:scale-105 lg:h-[22px] lg:w-[22px]" aria-hidden />
      )}
      {!collapsed && <span className="truncate">{label}</span>}
    </NavLink>
  ))
}

function SidebarBody({ collapsed, showClose, onClose, onNavigate }) {
  const user = useSelector(selectUser)
  const role = useSelector(selectUserRole)

  let nav
  if (!user) {
    nav = (
      <nav className="flex flex-1 flex-col gap-1 px-3 py-4" aria-label="Guest navigation">
        {renderNavItems(GUEST_ITEMS, collapsed, onNavigate)}
      </nav>
    )
  } else if (role === 'ADMIN') {
    nav = (
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4" aria-label="Admin sidebar">
        {renderNavItems(ADMIN_ITEMS_TOP, collapsed, onNavigate)}
        {!collapsed && <p className="mt-4 mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">People</p>}
        {renderNavItems(ADMIN_PEOPLE, collapsed, onNavigate)}
        {!collapsed && <p className="mt-4 mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Operations</p>}
        {renderNavItems(ADMIN_MID, collapsed, onNavigate)}
        <div className="mt-auto pt-4">
          {!collapsed && <hr className="mb-2 border-gray-200 dark:border-gray-700" />}
          {renderNavItems(ADMIN_ITEMS_BOTTOM, collapsed, onNavigate)}
        </div>
      </nav>
    )
  } else {
    nav = (
      <nav className="flex flex-1 flex-col gap-1 px-3 py-4" aria-label="Sidebar">
        {renderNavItems(MEMBER_ITEMS, collapsed, onNavigate)}
      </nav>
    )
  }

  return (
    <>
      <div className={`flex items-center border-b border-gray-100 px-3 py-4 dark:border-gray-800 ${collapsed ? 'justify-center' : 'gap-2.5'}`}>
        {collapsed ? (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-md shadow-primary-500/25">
            <Library className="h-5 w-5" aria-hidden />
          </span>
        ) : (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold tracking-tight text-gray-900 dark:text-gray-50">Library</p>
            <p className="truncate text-[10px] font-medium text-gray-400">Management System</p>
          </div>
        )}
        {showClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="ml-auto rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {nav}
    </>
  )
}

export default function Sidebar() {
  const dispatch = useDispatch()
  const { sidebarOpen, sidebarCollapsed } = useSelector(selectUi)
  const touchX = useRef(null)

  const closeDrawer = useCallback(() => dispatch(setSidebarOpen(false)), [dispatch])
  const toggleCollapsed = () => dispatch(setSidebarCollapsed(!sidebarCollapsed))

  useEffect(() => {
    if (!sidebarOpen) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => {
      if (e.key === 'Escape') closeDrawer()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [sidebarOpen, closeDrawer])

  const onTouchStart = (e) => {
    touchX.current = e.touches[0].clientX
  }

  const onTouchEnd = (e) => {
    if (touchX.current == null) return
    const delta = e.changedTouches[0].clientX - touchX.current
    if (delta < -50) closeDrawer()
    touchX.current = null
  }

  return (
    <>
      <aside
        className={`fixed bottom-0 left-0 top-16 z-30 hidden flex-col border-r border-gray-100 bg-white/95 shadow-sm backdrop-blur-lg transition-[width] duration-300 dark:border-gray-800 dark:bg-gray-950/95 md:flex ${
          sidebarCollapsed ? 'md:w-20 lg:w-20' : 'md:w-20 lg:w-[280px]'
        }`}
      >
        <SidebarBody collapsed={sidebarCollapsed} />
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="hidden items-center justify-center gap-1 border-t border-gray-100 py-2.5 text-xs font-medium text-gray-400 transition hover:bg-gray-50 hover:text-primary-600 dark:border-gray-800 dark:hover:bg-gray-900 dark:hover:text-primary-300 lg:flex"
        >
          {sidebarCollapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          {!sidebarCollapsed && <span>Collapse</span>}
        </button>
      </aside>

      <div
        className={`fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          sidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={closeDrawer}
        aria-hidden="true"
      />

      <aside
        className={`fixed inset-y-0 left-0 z-[60] flex w-[85vw] max-w-[300px] flex-col bg-white shadow-2xl transition-transform duration-300 ease-out dark:bg-gray-950 md:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-hidden={!sidebarOpen}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <SidebarBody collapsed={false} showClose onClose={closeDrawer} onNavigate={closeDrawer} />
      </aside>
    </>
  )
}
