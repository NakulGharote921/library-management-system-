import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen, Heart, Trash2, Star, Bell, BellOff, Eye, ArrowUpDown,
  Search, AlertTriangle, CheckCircle, Clock, RefreshCw,
  BarChart3, TrendingUp, BookMarked, X,
  ChevronDown, Edit3
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useSelector } from 'react-redux'
import Button from '../components/Button.jsx'
import { CardSkeleton } from '../components/PageSkeleton.jsx'
import { borrowBook, getApiErrorMessage, reserveBook, wishlistService } from '../services/api.js'

const STATUS_BADGE = {
  available: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 ring-emerald-600/20',
  reserved: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 ring-amber-600/20',
  out_of_stock: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 ring-rose-600/20',
  coming_soon: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 ring-blue-600/20',
}

const PRIORITY_LABEL = { HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' }
const PRIORITY_STARS = { HIGH: 3, MEDIUM: 2, LOW: 1 }

export default function Wishlist() {
  const navigate = useNavigate()
  const role = useSelector((s) => s.auth?.user?.role)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [recommended, setRecommended] = useState([])
  const [analytics, setAnalytics] = useState(null)

  const [search, setSearch] = useState('')
  const [genreFilter, setGenreFilter] = useState('')
  const [authorFilter, setAuthorFilter] = useState('')
  const [sort, setSort] = useState('newest')
  const [actionId, setActionId] = useState(null)
  const [editingNotes, setEditingNotes] = useState(null)
  const [noteText, setNoteText] = useState('')
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [showRecommendations, setShowRecommendations] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [data, statsData, recData] = await Promise.all([
        wishlistService.getFiltered({ category: genreFilter || undefined, author: authorFilter || undefined, sort, search: search || undefined }),
        wishlistService.getStats(),
        wishlistService.getRecommended(),
      ])
      setItems(data)
      setStats(statsData)
      setRecommended(recData)
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [genreFilter, authorFilter, sort, search])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (role === 'ADMIN' && showAnalytics) {
      wishlistService.getAnalytics()
        .then(setAnalytics)
        .catch(() => {})
    }
  }, [role, showAnalytics])

  const genres = useMemo(() => {
    const g = new Set()
    items.forEach((i) => { if (i.book?.category) g.add(i.book.category) })
    return [...g].sort()
  }, [items])

  const authors = useMemo(() => {
    const a = new Set()
    items.forEach((i) => { if (i.book?.author) a.add(i.book.author) })
    return [...a].sort()
  }, [items])

  const getStatus = (book) => {
    if (!book) return 'out_of_stock'
    if (book.availableCopies > 0) return 'available'
    return 'out_of_stock'
  }

  const statusLabel = (s) => s === 'available' ? 'Available' : s === 'reserved' ? 'Reserved' : s === 'out_of_stock' ? 'Out of Stock' : 'Coming Soon'

  const handleBorrow = async (bookId) => {
    setActionId(`borrow-${bookId}`)
    try {
      await borrowBook(bookId)
      toast.success('Book borrowed successfully!')
      load()
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    } finally {
      setActionId(null)
    }
  }

  const handleReserve = async (bookId) => {
    setActionId(`reserve-${bookId}`)
    try {
      await reserveBook(bookId)
      toast.success('Book reserved!')
      load()
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    } finally {
      setActionId(null)
    }
  }

  const handleRemove = async (bookId) => {
    setActionId(`remove-${bookId}`)
    try {
      await wishlistService.remove(bookId)
      setItems((prev) => prev.filter((i) => i.book.id !== bookId))
      toast.success('Removed from wishlist')
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    } finally {
      setActionId(null)
    }
  }

  const handlePriority = async (bookId, priority) => {
    try {
      await wishlistService.updatePriority(bookId, priority)
      toast.success(`Priority set to ${PRIORITY_LABEL[priority]}`)
      load()
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    }
  }

  const handleToggleNotify = async (bookId, current) => {
    setActionId(`notify-${bookId}`)
    try {
      await wishlistService.toggleNotify(bookId, !current)
      toast.success(current ? 'Notifications disabled' : 'Notifications enabled')
      load()
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    } finally {
      setActionId(null)
    }
  }

  const handleSaveNotes = async (bookId) => {
    try {
      await wishlistService.updateNotes(bookId, noteText)
      toast.success('Notes saved')
      setEditingNotes(null)
      load()
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    }
  }

  const renderStars = (rating) => {
    if (rating == null) return null
    const full = Math.floor(rating)
    const half = rating - full >= 0.5
    return (
      <span className="inline-flex items-center gap-0.5 text-amber-400">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className={`h-3 w-3 ${i < full ? 'fill-current' : half && i === full ? 'fill-current opacity-50' : 'opacity-25'}`} />
        ))}
        <span className="ml-1 text-xs text-gray-500">{rating.toFixed(1)}</span>
      </span>
    )
  }

  const renderPriorityDropdown = (item) => (
    <div className="relative group">
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
      >
        {'⭐'.repeat(PRIORITY_STARS[item.priority] || 2)} <ChevronDown className="h-3 w-3" />
      </button>
      <div className="absolute right-0 top-full z-20 mt-1 hidden w-32 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800 group-hover:block">
        {['HIGH', 'MEDIUM', 'LOW'].map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => handlePriority(item.book.id, p)}
            className={`flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 ${item.priority === p ? 'font-semibold text-primary-600' : 'text-gray-700 dark:text-gray-300'}`}
          >
            {'⭐'.repeat(PRIORITY_STARS[p])} {PRIORITY_LABEL[p]}
          </button>
        ))}
      </div>
    </div>
  )

  if (loading && items.length === 0) {
    return (
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
      </div>
    )
  }

  if (!loading && items.length === 0) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">My Wishlist</h1>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center dark:border-gray-800 dark:bg-gray-900">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 text-3xl dark:bg-primary-950/40">
            <Heart className="h-7 w-7 text-primary-600" />
          </div>
          <p className="mt-6 text-xl font-bold text-gray-800 dark:text-gray-100">Start Building Your Reading List</p>
          <p className="mt-2 max-w-md text-sm text-gray-500">
            Save books to your wishlist so you can easily borrow or reserve them later.
          </p>

          {recommended.length > 0 && (
            <div className="mt-8 w-full max-w-lg">
              <p className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Popular Books</p>
              <div className="flex flex-wrap justify-center gap-2">
                {recommended.slice(0, 4).map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => navigate(`/books/${b.id}`)}
                    className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    {b.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6">
            <p className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Browse Categories</p>
            <div className="flex flex-wrap justify-center gap-2">
              {['Programming', 'Databases', 'AI', 'History', 'Business', 'Science', 'Literature'].map((cat) => (
                <span key={cat} className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                  {cat}
                </span>
              ))}
            </div>
          </div>

          <Button type="button" icon={BookOpen} className="mt-8" onClick={() => navigate('/books')}>
            Browse Books
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">My Wishlist</h1>
          <p className="text-sm text-gray-500">{items.length} {items.length === 1 ? 'book' : 'books'} saved</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {role === 'ADMIN' && (
            <Button variant="secondary" size="sm" type="button" icon={BarChart3} onClick={() => setShowAnalytics(!showAnalytics)}>
              Analytics
            </Button>
          )}
          <Button variant="secondary" size="sm" type="button" icon={RefreshCw} onClick={load} loading={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Total Books', value: stats.total, icon: BookMarked, color: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300' },
            { label: 'Available Now', value: stats.availableNow, icon: CheckCircle, color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300' },
            { label: 'Reserved', value: stats.reserved, icon: Clock, color: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300' },
            { label: 'Out of Stock', value: stats.outOfStock, icon: AlertTriangle, color: 'bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-300' },
          ].map((s) => (
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

      {/* Admin Analytics */}
      {showAnalytics && analytics && (
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-gray-50">
            <BarChart3 className="h-4 w-4" /> Wishlist Analytics
          </h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800/50">
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{analytics.totalWishlisted}</p>
              <p className="text-xs text-gray-500">Total Wishlisted</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800/50">
              <p className="text-2xl font-bold text-emerald-600">{analytics.availableNow}</p>
              <p className="text-xs text-gray-500">Available Now</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800/50">
              <p className="text-2xl font-bold text-primary-600">{analytics.conversionRate}%</p>
              <p className="text-xs text-gray-500">Conversion Rate (Wishlist → Borrow)</p>
            </div>
          </div>
          {analytics.mostWishlisted?.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Most Wishlisted Books</p>
              <div className="flex flex-wrap gap-2">
                {analytics.mostWishlisted.map((b) => (
                  <span key={b.id} className="rounded-full bg-primary-50 px-3 py-1 text-xs text-primary-700 dark:bg-primary-950 dark:text-primary-300">
                    {b.title} ({b.count})
                  </span>
                ))}
              </div>
            </div>
          )}
          {analytics.demandByGenre?.length > 0 && (
            <div className="mt-3">
              <p className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Demand by Genre</p>
              <div className="flex flex-wrap gap-2">
                {analytics.demandByGenre.map((g) => (
                  <span key={g.category} className="rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                    {g.category} ({g.count})
                  </span>
                ))}
              </div>
            </div>
          )}
          {analytics.neverBorrowed?.length > 0 && (
            <div className="mt-3">
              <p className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Books Frequently Added but Never Borrowed</p>
              <div className="flex flex-wrap gap-2">
                {analytics.neverBorrowed.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => navigate(`/books/${b.id}`)}
                    className="rounded-full bg-rose-50 px-3 py-1 text-xs text-rose-700 hover:bg-rose-100 dark:bg-rose-950 dark:text-rose-300 dark:hover:bg-rose-900"
                  >
                    {b.title}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search + Filters + Sort */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search wishlist..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-8 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
          {search && (
            <button type="button" onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <select
          value={genreFilter}
          onChange={(e) => setGenreFilter(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        >
          <option value="">All Genres</option>
          {genres.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>

        <select
          value={authorFilter}
          onChange={(e) => setAuthorFilter(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        >
          <option value="">All Authors</option>
          {authors.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>

        <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-2 dark:border-gray-700 dark:bg-gray-900">
          <ArrowUpDown className="h-4 w-4 text-gray-400" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="border-0 bg-transparent py-2 pr-6 text-sm outline-none dark:text-gray-100"
          >
            <option value="newest">Newest Added</option>
            <option value="oldest">Oldest Added</option>
            <option value="priority">Priority</option>
            <option value="available">Available First</option>
            <option value="rating">Highest Rated</option>
            <option value="title_asc">Title A-Z</option>
            <option value="author_asc">Author A-Z</option>
          </select>
        </div>
      </div>

      {/* Wishlist Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const status = getStatus(item.book)
          const isAvailable = status === 'available'
          const isAction = (prefix) => actionId === `${prefix}-${item.book.id}`

          return (
            <div
              key={item.id}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
            >
              {/* Cover Image / Placeholder */}
              <div className="relative flex h-40 items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
                {item.book.coverImageUrl ? (
                  <img
                    src={item.book.coverImageUrl}
                    alt={item.book.title}
                    className="h-full w-full object-contain p-4"
                  />
                ) : (
                  <div className="flex flex-col items-center text-gray-300 dark:text-gray-600">
                    <BookOpen className="h-12 w-12" />
                    <span className="mt-1 text-xs font-medium">{item.book.category || 'Book'}</span>
                  </div>
                )}
                {/* Status Badge */}
                <span className={`absolute right-3 top-3 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${STATUS_BADGE[status]}`}>
                  {statusLabel(status)}
                </span>
              </div>

              <div className="flex flex-1 flex-col p-4">
                {/* Priority + Actions Row */}
                <div className="mb-2 flex items-center justify-between">
                  {renderPriorityDropdown(item)}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleToggleNotify(item.book.id, item.notifyWhenAvailable)}
                      title={item.notifyWhenAvailable ? 'Notifications enabled' : 'Notify me when available'}
                      className={`rounded-md p-1.5 transition ${item.notifyWhenAvailable ? 'text-primary-600 bg-primary-50 dark:bg-primary-950' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                    >
                      {isAction('notify') ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : item.notifyWhenAvailable ? (
                        <Bell className="h-4 w-4" />
                      ) : (
                        <BellOff className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(item.book.id)}
                      className="rounded-md p-1.5 text-gray-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950"
                      title="Remove"
                    >
                      {isAction('remove') ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Title + Author */}
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-50 line-clamp-1">{item.book.title}</h3>
                <p className="text-sm text-gray-500">{item.book.author}</p>

                {/* Meta Info */}
                <div className="mt-2 space-y-1">
                  {item.book.isbn && (
                    <p className="text-xs text-gray-400">ISBN: {item.book.isbn}</p>
                  )}
                  {item.book.category && (
                    <p className="text-xs text-gray-400">Genre: {item.book.category}</p>
                  )}
                  {renderStars(item.book.averageRating)}
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>Available: <strong className={item.book.availableCopies > 0 ? 'text-emerald-600' : 'text-rose-600'}>{item.book.availableCopies || 0}</strong></span>
                    {item.book.shelfLocation && (
                      <span>📍 {item.book.shelfLocation}</span>
                    )}
                  </div>
                </div>

                {/* Notes */}
                {editingNotes === item.book.id ? (
                  <div className="mt-3">
                    <textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="Why did I save this?"
                      rows={2}
                      className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 p-2 text-xs outline-none focus:border-primary-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                    />
                    <div className="mt-1 flex gap-1">
                      <button
                        type="button"
                        onClick={() => handleSaveNotes(item.book.id)}
                        className="rounded-md bg-primary-600 px-2 py-1 text-xs text-white hover:bg-primary-700"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingNotes(null)}
                        className="rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setEditingNotes(item.book.id); setNoteText(item.notes || '') }}
                    className={`mt-3 flex items-center gap-1 rounded-md px-2 py-1 text-xs transition ${item.notes ? 'bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                  >
                    <Edit3 className="h-3 w-3" />
                    {item.notes ? item.notes.substring(0, 40) + (item.notes.length > 40 ? '...' : '') : 'Add note...'}
                  </button>
                )}

                {/* History */}
                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-400">
                  <span>Added: {new Date(item.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  {item.borrowedAt && (
                    <span className="text-emerald-600">Borrowed: {new Date(item.borrowedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                  )}
                  {item.returnedAt && (
                    <span className="text-blue-600">Returned: {new Date(item.returnedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-auto flex flex-wrap gap-2 pt-4">
                  {isAvailable ? (
                    <Button
                      variant="primary" size="sm" type="button" icon={BookOpen}
                      loading={isAction('borrow')}
                      onClick={() => handleBorrow(item.book.id)}
                      className="flex-1"
                    >
                      Borrow Now
                    </Button>
                  ) : (
                    <Button
                      variant="secondary" size="sm" type="button" icon={Clock}
                      loading={isAction('reserve')}
                      onClick={() => handleReserve(item.book.id)}
                      className="flex-1"
                    >
                      Reserve
                    </Button>
                  )}
                  <Button
                    variant="secondary" size="sm" type="button" icon={Eye}
                    onClick={() => navigate(`/books/${item.book.id}`)}
                  >
                    Details
                  </Button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Recommendations */}
      {showRecommendations && recommended.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-gray-50">
              <TrendingUp className="h-4 w-4" /> Recommended For You
            </h3>
            <button
              type="button"
              onClick={() => setShowRecommendations(false)}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Hide
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {recommended.map((book) => (
              <button
                key={book.id}
                type="button"
                onClick={() => navigate(`/books/${book.id}`)}
                className="group/card flex items-start gap-3 rounded-xl p-3 transition hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <div className="flex h-12 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400 dark:bg-gray-800">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-50 line-clamp-1">{book.title}</p>
                  <p className="text-xs text-gray-500">{book.author}</p>
                  {book.averageRating > 0 && (
                    <p className="mt-0.5 text-xs text-amber-500">★ {book.averageRating.toFixed(1)}</p>
                  )}
                  {book.availableCopies > 0 && (
                    <p className="mt-0.5 text-xs text-emerald-600">Available</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}