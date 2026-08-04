import { useState, useRef, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { LogOut, Menu, LogIn, UserPlus, Bell, Search, User, Settings, ChevronDown, Shield, CheckCheck } from 'lucide-react'
import { logout, selectUser, selectUserRole } from '../store/authSlice.js'
import { toggleSidebar, setTheme, selectUi } from '../store/uiSlice.js'
import { KODNEST_LOGO_URL } from '../constants/branding.js'
import { notificationService } from '../services/api.js'

const ROLE_BADGE = {
  ADMIN: 'bg-purple-500/20 text-purple-100',
  MEMBER: 'bg-emerald-500/20 text-emerald-100',
}

const NOTIFICATION_TYPE_META = {
  RESERVATION_CREATED: { label: 'R', icon: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40' },
  RESERVATION_READY: { label: 'R', icon: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40' },
  RESERVATION_CANCELLED: { label: 'R', icon: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40' },
  RESERVATION_EXPIRED: { label: 'R', icon: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40' },
  RESERVATION_COMPLETED: { label: 'R', icon: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40' },
  PICKUP_REMINDER: { label: 'R', icon: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40' },
  FINE: { label: '$', icon: 'bg-red-100 text-red-700 dark:bg-red-900/40' },
  BOOK_DUE: { label: '!', icon: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40' },
  MEMBERSHIP: { label: 'M', icon: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40' },
}

function timeAgo(iso) {
  if (!iso) return ''
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return new Date(iso).toLocaleDateString()
}

export default function Navbar() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const user = useSelector(selectUser)
  const role = useSelector(selectUserRole)
  const { theme } = useSelector(selectUi)
  const isDark = theme === 'dark'
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const notifRef = useRef(null)
  const profileRef = useRef(null)

  useEffect(() => {
    const handleClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifications(false)
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfileMenu(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (!user) {
      setNotifications([])
      setUnreadCount(0)
      return
    }
    let cancelled = false
    const load = () => {
      notificationService.getMy()
        .then((list) => { if (!cancelled) setNotifications(list) })
        .catch(() => {})
      notificationService.getUnreadCount()
        .then(({ count }) => { if (!cancelled) setUnreadCount(count ?? 0) })
        .catch(() => {})
    }
    load()
    const timer = setInterval(load, 60000)
    return () => { cancelled = true; clearInterval(timer) }
  }, [user])

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } catch { /* ignore */ }
  }

  const toggleTheme = () => {
    const next = isDark ? 'light' : 'dark'
    dispatch(setTheme(next))
    if (next === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  const handleLogout = () => {
    dispatch(logout())
    navigate('/login')
  }

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/books?search=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery('')
      setSearchOpen(false)
    }
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-gradient-to-r from-primary-600 to-primary-800 shadow-lg shadow-primary-900/20 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 px-4 py-2.5 lg:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
          <a
            href="https://kodnest.com"
            target="_blank"
            rel="noopener noreferrer"
            className="group shrink-0 transition duration-200 hover:opacity-90"
            aria-label="KodNest - Leading Tech Training Institute"
          >
            <img
              src={KODNEST_LOGO_URL}
              alt="KodNest - Leading Tech Training Institute"
              height={40}
              width={160}
              className="h-10 w-auto max-w-[140px] object-contain transition duration-200 group-hover:scale-[1.03] sm:max-w-[180px]"
              loading="eager"
            />
          </a>
          <div className="min-w-0 border-l border-white/25 pl-3 sm:pl-4">
            <p className="truncate text-sm font-bold tracking-tight text-white sm:text-base">Library Management System</p>
          </div>
          {searchOpen && (
            <form onSubmit={handleSearch} className="hidden sm:flex flex-1 max-w-xs">
              <div className="relative w-full">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/60" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search books..."
                  className="w-full rounded-full border border-white/20 bg-white/10 py-1.5 pl-8 pr-3 text-xs text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
                  autoFocus
                  onBlur={() => { if (!searchQuery) setSearchOpen(false) }}
                />
              </div>
            </form>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {!user && (
            <div className="hidden items-center gap-2 sm:flex">
              <Link to="/login" className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white ring-1 ring-white/25 transition hover:bg-white/25">
                <LogIn className="h-3.5 w-3.5" />
                Sign In
              </Link>
              <Link to="/register" className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-xs font-semibold text-white ring-1 ring-white/25 transition hover:bg-white/30">
                <UserPlus className="h-3.5 w-3.5" />
                Register
              </Link>
            </div>
          )}

          <button
            type="button"
            onClick={() => setSearchOpen(!searchOpen)}
            className="rounded-full bg-white/10 p-2 text-white ring-1 ring-white/20 transition hover:bg-white/20 sm:hidden"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </button>

          {user && (
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative rounded-full bg-white/10 p-2 text-white ring-1 ring-white/20 transition hover:bg-white/20"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white ring-2 ring-primary-700">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {showNotifications && (
                <div className="absolute right-0 z-50 mt-2 w-80 origin-top-right rounded-2xl border border-gray-100 bg-white py-2 shadow-xl dark:border-gray-700 dark:bg-gray-800">
                  <div className="flex items-center justify-between px-4 py-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Notifications</p>
                    {unreadCount > 0 && (
                      <button type="button" onClick={handleMarkAllRead} className="flex items-center gap-1 text-[10px] font-semibold text-primary-600 hover:underline dark:text-primary-300">
                        <CheckCheck className="h-3 w-3" /> Mark all read
                      </button>
                    )}
                  </div>
                  <div className="mt-1 max-h-72 overflow-y-auto">
                    {notifications.length === 0 && (
                      <p className="px-4 py-6 text-center text-xs text-gray-400">No notifications yet</p>
                    )}
                    {notifications.map((n) => {
                      const meta = NOTIFICATION_TYPE_META[n.type] || { label: 'N', icon: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' }
                      return (
                        <button
                          key={n.id}
                          type="button"
                          onClick={async () => {
                            if (!n.isRead) {
                              try {
                                await notificationService.markRead(n.id)
                                setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, isRead: true } : x))
                                setUnreadCount((c) => Math.max(0, c - 1))
                              } catch { /* ignore */ }
                            }
                            if (n.link) navigate(n.link)
                            setShowNotifications(false)
                          }}
                          className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-gray-50 dark:hover:bg-gray-700/50 ${n.isRead ? 'opacity-60' : ''}`}
                        >
                          <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${meta.icon}`}>
                            {meta.label}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{n.title}</p>
                            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{n.message}</p>
                            <p className="mt-0.5 text-[10px] text-gray-400">{timeAgo(n.createdAt)}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          <label
            className="swap swap-rotate rounded-full bg-white/10 p-2 text-white ring-1 ring-white/20 transition hover:bg-white/20"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <input type="checkbox" className="theme-controller" value="synthwave" checked={isDark} onChange={toggleTheme} />
            <svg className="swap-off h-5 w-5 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path d="M5.64,17l-.71.71a1,1,0,0,0,0,1.41,1,1,0,0,0,1.41,0l.71-.71A1,1,0,0,0,5.64,17ZM5,12a1,1,0,0,0-1-1H3a1,1,0,0,0,0,2H4A1,1,0,0,0,5,12Zm7-7a1,1,0,0,0,1-1V3a1,1,0,0,0-2,0V4A1,1,0,0,0,12,5ZM5.64,7.05a1,1,0,0,0,.7.29,1,1,0,0,0,.71-.29,1,1,0,0,0,0-1.41l-.71-.71A1,1,0,0,0,4.93,6.34Zm12,.29a1,1,0,0,0,.7-.29l.71-.71a1,1,0,1,0-1.41-1.41L17,5.64a1,1,0,0,0,0,1.41A1,1,0,0,0,17.66,7.34ZM21,11H20a1,1,0,0,0,0,2h1a1,1,0,0,0,0-2Zm-9,8a1,1,0,0,0-1,1v1a1,1,0,0,0,2,0V20A1,1,0,0,0,12,19ZM18.36,17A1,1,0,0,0,17,18.36l.71.71a1,1,0,0,0,1.41,0,1,1,0,0,0,0-1.41ZM12,6.5A5.5,5.5,0,1,0,17.5,12,5.51,5.51,0,0,0,12,6.5Zm0,9A3.5,3.5,0,1,1,15.5,12,3.5,3.5,0,0,1,12,15.5Z" />
            </svg>
            <svg className="swap-on h-5 w-5 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path d="M21.64,13a1,1,0,0,0-1.05-.14,8.05,8.05,0,0,1-3.37.73A8.15,8.15,0,0,1,9.08,5.49a8.59,8.59,0,0,1,.25-2A1,1,0,0,0,8,2.36,10.14,10.14,0,1,0,22,14.05,1,1,0,0,0,21.64,13Zm-9.5,6.69A8.14,8.14,0,0,1,7.08,5.22v.27A10.15,10.15,0,0,0,17.22,15.63a9.79,9.79,0,0,0,2.1-.22A8.11,8.11,0,0,1,12.14,19.73Z" />
            </svg>
          </label>

          {user && (
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-white ring-1 ring-white/20 transition hover:bg-white/20"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-[10px] font-bold text-white">
                  {user.name?.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <span className="hidden text-xs font-medium sm:inline">{user.name}</span>
                {role && (
                  <span className={`hidden rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide sm:inline ${ROLE_BADGE[role] || 'bg-white/10 text-white'}`}>
                    {role}
                  </span>
                )}
                <ChevronDown className="h-3 w-3 text-white/70" />
              </button>
              {showProfileMenu && (
                <div className="absolute right-0 z-50 mt-2 w-48 origin-top-right rounded-xl border border-gray-100 bg-white py-1 shadow-xl dark:border-gray-700 dark:bg-gray-800">
                  <div className="border-b border-gray-100 px-4 py-2 dark:border-gray-700">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                  <button type="button" onClick={() => { navigate('/profile'); setShowProfileMenu(false) }} className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700">
                    <User className="h-4 w-4" /> Profile
                  </button>
                  <button type="button" onClick={() => { navigate('/settings'); setShowProfileMenu(false) }} className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700">
                    <Settings className="h-4 w-4" /> Settings
                  </button>
                  <hr className="my-1 border-gray-100 dark:border-gray-700" />
                  <button type="button" onClick={handleLogout} className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20">
                    <LogOut className="h-4 w-4" /> Logout
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            className="rounded-lg bg-white/10 p-2 text-white ring-1 ring-white/20 lg:hidden"
            aria-label="Open menu"
            onClick={() => dispatch(toggleSidebar())}
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
