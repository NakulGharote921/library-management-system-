import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate, Link, useParams, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  BookOpen, BookCopy, CalendarClock, CalendarDays, Clock, Eye, Grid3x3, Heart, ImagePlus, Info, Library,
  List, Pencil, Plus, ShieldAlert, ShieldCheck, Timer, Trash2, Users, CheckCircle, RotateCcw, XCircle,
} from 'lucide-react'
import Button from '../components/Button.jsx'
import BookCover from '../components/BookCover.jsx'
import CategorySearchBar from '../components/CategorySearchBar.jsx'
import DataTable from '../components/DataTable.jsx'
import FormInput from '../components/FormInput.jsx'
import Modal from '../components/Modal.jsx'
import { CardSkeleton } from '../components/PageSkeleton.jsx'
import Pagination from '../components/Pagination.jsx'
import {
  bookService, borrowBook, reserveBook, getBookById, wishlistService, reservationService,
  readingHistoryService, userSubscriptionService, issuedBookService, getApiErrorMessage, borrowRequestService,
} from '../services/api.js'
import { selectUserRole, selectUser } from '../store/authSlice.js'
import { useCategories } from '../store/CategoryContext.js'
import { preferCover, preloadCovers, preloadCover, DEFAULT_COVER } from '../utils/bookCovers.js'

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '')

const todayISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const addDaysISO = (iso, days) => {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const LOAN_DAYS_BY_PLAN = {
  Basic: 7,
  Silver: 14,
  Gold: 21,
  Premium: 30,
}

const NEW_ARRIVALS_CUTOFF = Date.now() - 45 * 24 * 60 * 60 * 1000

const emptyBook = {
  title: '',
  author: '',
  category: '',
  isbn: '',
  totalCopies: 1,
  availableCopies: null,
}

const BADGE_PALETTE = [
  'bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-300',
  'bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300',
  'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
  'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
  'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300',
  'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300',
  'bg-teal-100 text-teal-800 dark:bg-teal-950/50 dark:text-teal-300',
  'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-950/50 dark:text-fuchsia-300',
]

const badgeColor = (cat) => {
  const name = (cat || '').toLowerCase()
  if (!name) return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
  let hash = 0
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  }
  return BADGE_PALETTE[hash % BADGE_PALETTE.length]
}

function GoldAura({ enabled, className = '', children }) {
  if (!enabled) return children
  return <span className={`aura-gold ${className}`}>{children}</span>
}

export default function Books() {
   const role = useSelector(selectUserRole)
   const currentUser = useSelector(selectUser)
   const navigate = useNavigate()
   const { id: paramId } = useParams()
  const isMember = role === 'MEMBER'
  const isAdmin = role === 'ADMIN'
  const canManage = isAdmin

  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [debounced, setDebounced] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()
  const { categories: dbCategories, loading: categoriesLoading, error: categoriesError, refresh: refreshCategories } = useCategories()
  const [categoryId, setCategoryId] = useState(() => searchParams.get('cat') || '')
  const [view, setView] = useState('grid')
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 8
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyBook)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [coverFile, setCoverFile] = useState(null)
  const [coverPreview, setCoverPreview] = useState(null)
  const [borrowingId, setBorrowingId] = useState(null)
   const [reservingId, setReservingId] = useState(null)
   const [detailBook, setDetailBook] = useState(null)
   const [wishlistedIds, setWishlistedIds] = useState(new Set())
   const [wishlistLoadingId, setWishlistLoadingId] = useState(null)
   const [reservationsMap, setReservationsMap] = useState({})
   const [queueInfoMap, setQueueInfoMap] = useState({})
   const [reserveConfirmBook, setReserveConfirmBook] = useState(null)
   const [reserveSuccess, setReserveSuccess] = useState(null)
   const [activeSub, setActiveSub] = useState(null)
   const [borrowedMap, setBorrowedMap] = useState({})
   const borrowedIds = useMemo(() => new Set(Object.keys(borrowedMap)), [borrowedMap])
   const hasPaidPlan = !!activeSub && !!activeSub.plan && Number(activeSub.plan.price || 0) > 0
   const [favoriteGenre, setFavoriteGenre] = useState(null)
   const [quick, setQuick] = useState('all')
   const [authorFilter, setAuthorFilter] = useState('')
   const [languageFilter, setLanguageFilter] = useState('')
   const [availabilityFilter, setAvailabilityFilter] = useState('all')
   const [sortBy, setSortBy] = useState('popular')
   const [detailQueue, setDetailQueue] = useState(null)
   const [cancelReserveBook, setCancelReserveBook] = useState(null)
   const [cancellingId, setCancellingId] = useState(null)
   const [borrowConfirmBook, setBorrowConfirmBook] = useState(null)
   const [borrowRequestsMap, setBorrowRequestsMap] = useState({})
   const [borrowStartDate, setBorrowStartDate] = useState(todayISO)
   const queueInfoRef = useRef({})

   const handleBorrow = async (bookId) => {
    setBorrowingId(bookId)
    try {
      await borrowBook(bookId)
      toast.success('Book borrowed successfully!')
      load()
      refreshMemberProfile()
      window.dispatchEvent(new CustomEvent('dashboard:refresh'))
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    } finally {
      setBorrowingId(null)
    }
  }

  const handleBorrowRequest = async (bookId, startDate, dueDate) => {
    if (!startDate || !dueDate) {
      toast.error('Please choose a borrow start date first.')
      return
    }
    setBorrowingId(bookId)
    try {
      await borrowRequestService.create(bookId, startDate, dueDate)
      toast.success('Your borrow request has been submitted successfully and is awaiting administrator approval.')
      load()
      loadBorrowRequests()
      navigate('/borrow-requests')
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    } finally {
      setBorrowingId(null)
    }
  }

   const handleToggleWishlist = async (bookId) => {
    setWishlistLoadingId(bookId)
    try {
      if (wishlistedIds.has(bookId)) {
        await wishlistService.remove(bookId)
        setWishlistedIds((prev) => { const next = new Set(prev); next.delete(bookId); return next })
        toast.success('Removed from wishlist')
      } else {
        await wishlistService.add(bookId)
        setWishlistedIds((prev) => new Set(prev).add(bookId))
        toast.success('Added to wishlist')
      }
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    } finally {
      setWishlistLoadingId(null)
    }
  }

  const handleCancelReservation = async (book) => {
    const r = reservationsMap[book.id]
    if (!r) return
    setCancellingId(book.id)
    try {
      await reservationService.cancel(r.id)
      toast.success('Reservation cancelled')
      await loadReservationData()
      load()
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    } finally {
      setCancellingId(null)
      setCancelReserveBook(null)
    }
  }

   const handleOpenDetails = async (book) => {     preloadCover(preferCover(book))
     try {
       const full = await getBookById(book.id)
       setDetailBook(full)
     } catch {
       setDetailBook(book)
     }
     try {
       const queue = await reservationService.getWaitingQueue(book.id)
       setDetailQueue(queue)
     } catch {
       setDetailQueue([])
     }
   }

   useEffect(() => {
     if (!paramId) return
     getBookById(paramId)
       .then((full) => { preloadCover(preferCover(full)); setDetailBook(full) })
       .catch(() => {
         toast.error(getApiErrorMessage({ message: 'Book not found' }))
         navigate('/books')
       })
     reservationService.getWaitingQueue(paramId).then(setDetailQueue).catch(() => setDetailQueue([]))
   }, [paramId, navigate])

   const refreshMemberProfile = useCallback(async () => {
     if (!isMember) return
     try {
       const [sub, loans] = await Promise.all([
         userSubscriptionService.getActive().catch(() => null),
         issuedBookService.getMyBooks().catch(() => []),
       ])
       if (sub) setActiveSub(sub)
       const borrowed = {}
       ;(loans || []).filter((l) => l.issueStatus === 'ISSUED').forEach((l) => {
         borrowed[l.bookId] = { dueDate: l.dueDate, title: l.bookTitle }
       })
       try {
         const myHistory = await readingHistoryService.getMy()
         myHistory
           .filter((h) => h.status === 'BORROWED' || (h.status === 'OVERDUE' && !h.returnDate))
           .forEach((h) => {
             if (!borrowed[h.bookId]) borrowed[h.bookId] = { dueDate: h.dueDate, title: h.bookTitle }
           })
       } catch { /* ignore */ }
       setBorrowedMap(borrowed)
     } catch { /* ignore */ }
   }, [isMember])

   const loadReservationData = useCallback(async () => {
     try {
       const myReservations = await reservationService.getMy()
       const map = {}
       const queueMap = {}
       for (const r of myReservations) {
         map[r.bookId] = r
         if (r.status === 'WAITING') {
           const queue = await reservationService.getQueue(r.bookId)
           queueInfoRef.current[r.bookId] = {
             queueLength: queue.queueLength ?? 0,
             estimatedWaitDays: Math.max(1, (queue.queueLength ?? 0) * 3),
           }
           queueMap[r.bookId] = queueInfoRef.current[r.bookId]
         }
       }
       setReservationsMap(map)
       setQueueInfoMap((prev) => ({ ...prev, ...queueMap }))
     } catch { /* ignore */ }
   }, [])

   const loadBorrowRequests = useCallback(async () => {
     if (!isMember) return
     try {
       const reqs = await borrowRequestService.getMy()
       const map = {}
       for (const req of reqs) map[req.bookId] = req
       setBorrowRequestsMap(map)
     } catch { /* ignore */ }
   }, [isMember])

   useEffect(() => {
     if (!isMember) return
     ;(async () => {
       try {
         const items = await wishlistService.getMy()
         setWishlistedIds(new Set(items.map((i) => i.book.id)))
       } catch { /* ignore */ }
       try {
         const [sub, loans, statsData] = await Promise.all([
           userSubscriptionService.getActive().catch(() => null),
           issuedBookService.getMyBooks().catch(() => []),
           readingHistoryService.getStats().catch(() => null),
         ])
          if (sub) setActiveSub(sub)
          const borrowed = {}
          ;(loans || [])
            .filter((l) => l.issueStatus === 'ISSUED')
            .forEach((l) => { borrowed[l.bookId] = { dueDate: l.dueDate, title: l.bookTitle } })
          try {
            const myHistory = await readingHistoryService.getMy()
            myHistory
              .filter((h) => h.status === 'BORROWED' || (h.status === 'OVERDUE' && !h.returnDate))
              .forEach((h) => {
                if (!borrowed[h.bookId]) borrowed[h.bookId] = { dueDate: h.dueDate, title: h.bookTitle }
              })
          } catch { /* ignore */ }
          setBorrowedMap(borrowed)
         if (statsData?.favoriteGenre && statsData.favoriteGenre !== 'N/A') setFavoriteGenre(statsData.favoriteGenre)
       } catch { /* ignore */ }
       try {
          await loadReservationData()
        } catch { /* ignore */ }
        try {
          await loadBorrowRequests()
        } catch { /* ignore */ }
      })()
   }, [isMember, loadReservationData, loadBorrowRequests])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = debounced.trim()
        ? await bookService.search(debounced.trim())
        : await bookService.getAll()
      setBooks(data)
      preloadCovers((data || []).map(preferCover))
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [debounced])

  useEffect(() => {
    const t = setTimeout(() => setDebounced(keyword), 350)
    return () => clearTimeout(t)
  }, [keyword])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!books.length) return
    let cancelled = false
    const targets = books.filter((b) => (b.availableCopies ?? 0) === 0)
    ;(async () => {
      for (const b of targets) {
        if (cancelled) return
        if (queueInfoRef.current[b.id]) continue
        try {
          const queue = await reservationService.getQueue(b.id)
          if (cancelled) return
          queueInfoRef.current[b.id] = {
            queueLength: queue.queueLength ?? 0,
            estimatedWaitDays: Math.max(1, (queue.queueLength ?? 0) * 3),
          }
          setQueueInfoMap((prev) => ({ ...prev, [b.id]: queueInfoRef.current[b.id] }))
        } catch { /* ignore */ }
      }
    })()
    return () => { cancelled = true }
  }, [books])

  const borrowedCount = (b) => Math.max(0, (b.totalCopies ?? 0) - (b.availableCopies ?? 0))

  const allAuthors = useMemo(
    () => [...new Set(books.map((b) => b.author).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [books],
  )

  const allLanguages = useMemo(
    () => [...new Set(books.map((b) => b.language).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [books],
  )

  const catalogStats = useMemo(() => {
    const totalCopies = books.reduce((s, b) => s + (b.totalCopies ?? 0), 0)
    const availableCopies = books.reduce((s, b) => s + (b.availableCopies ?? 0), 0)
    const reservedCount = isMember
      ? Object.values(reservationsMap).filter((r) => r.status === 'WAITING' || r.status === 'READY_FOR_PICKUP').length
      : books.filter((b) => (b.availableCopies ?? 0) === 0).length
    return {
      totalBooks: books.length,
      availableCopies,
      borrowedCopies: Math.max(0, totalCopies - availableCopies),
      reservedCount,
    }
  }, [books, isMember, reservationsMap])

  const filtered = useMemo(() => {
    let rows = [...books]
    const keywordLower = debounced.trim().toLowerCase()
    if (keywordLower) {
      rows = rows.filter(
        (b) => (b.title || '').toLowerCase().includes(keywordLower) || (b.author || '').toLowerCase().includes(keywordLower),
      )
    }
    const selectedCategoryName = categoryId
      ? dbCategories.find((c) => String(c.id) === String(categoryId))?.name
      : ''
    if (selectedCategoryName) {
      rows = rows.filter((b) => (b.category || '').toLowerCase() === selectedCategoryName.toLowerCase())
    }
    if (authorFilter) {
      rows = rows.filter((b) => (b.author || '').toLowerCase() === authorFilter.toLowerCase())
    }
    if (languageFilter) {
      rows = rows.filter((b) => (b.language || '').toLowerCase() === languageFilter.toLowerCase())
    }
    if (availabilityFilter === 'available') rows = rows.filter((b) => (b.availableCopies ?? 0) > 0)
    if (availabilityFilter === 'out') rows = rows.filter((b) => (b.availableCopies ?? 0) === 0)

    if (quick === 'available') rows = rows.filter((b) => (b.availableCopies ?? 0) > 0)
    if (quick === 'new') {
      rows = rows.filter((b) => b.createdAt && new Date(b.createdAt).getTime() >= NEW_ARRIVALS_CUTOFF)
    }
    if (quick === 'popular') {
      rows = [...rows].sort((a, b) => borrowedCount(b) - borrowedCount(a)).slice(0, 8)
    }
    if (quick === 'recommended') {
      const fav = (favoriteGenre || '').toLowerCase()
      rows = fav
        ? rows.filter((b) => (b.category || '').toLowerCase() === fav)
        : rows.filter((b) => (b.averageRating ?? 0) >= 4.5)
    }

    const row = [...rows]
    switch (sortBy) {
      case 'newest':
        row.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        break
      case 'rating':
        row.sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0))
        break
      case 'popular':
        row.sort(
          (a, b) =>
            borrowedCount(b) - borrowedCount(a) ||
            (b.averageRating ?? 0) - (a.averageRating ?? 0) ||
            (a.title || '').localeCompare(b.title || ''),
        )
        break
      case 'title-asc':
        row.sort((a, b) => (a.title || '').localeCompare(b.title || ''))
        break
      case 'title-desc':
        row.sort((a, b) => (b.title || '').localeCompare(a.title || ''))
        break
      default:
        break
    }
    return row
  }, [books, debounced, categoryId, dbCategories, authorFilter, languageFilter, availabilityFilter, quick, favoriteGenre, sortBy])

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pages - 1)
  const paginated = filtered.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE)

  const openCreate = () => {
    setEditing(null)
    setForm(emptyBook)
    setErrors({})
    setCoverFile(null)
    setCoverPreview(null)
    setModalOpen(true)
  }

  const openEdit = (book) => {
    setEditing(book)
    setForm({
      title: book.title,
      author: book.author,
      category: book.category || '',
      isbn: book.isbn || '',
      totalCopies: book.totalCopies,
      availableCopies: book.availableCopies,
    })
    setErrors({})
    setCoverFile(null)
    setCoverPreview(preferCover(book))
    setModalOpen(true)
  }

  const validate = () => {
    const next = {}
    if (!form.title.trim()) next.title = 'Title is required'
    if (!form.author.trim()) next.author = 'Author is required'
    if (form.totalCopies < 0) next.totalCopies = 'Must be zero or more'
    if (form.availableCopies != null && form.availableCopies > form.totalCopies) {
      next.availableCopies = 'Cannot exceed total copies'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const saveBook = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      let saved
      if (editing) {
        const updated = await bookService.update(editing.id, {
          ...editing,
          title: form.title.trim(),
          author: form.author.trim(),
          category: form.category,
          isbn: form.isbn.trim() || null,
          totalCopies: Number(form.totalCopies),
        })
        saved = updated
        toast.success('Book updated')
      } else {
        const created = await bookService.create({
          title: form.title.trim(),
          author: form.author.trim(),
          category: form.category,
          isbn: form.isbn.trim() || null,
          totalCopies: Number(form.totalCopies),
          availableCopies: Number(form.availableCopies ?? form.totalCopies),
        })
        saved = created
        toast.success('Book added')
      }
      if (coverFile) {
        try {
          saved = await bookService.uploadCover(saved.id, coverFile)
          toast.success('Cover uploaded')
        } catch (e) {
          toast.error(`Book saved but cover failed: ${getApiErrorMessage(e)}`)
        }
      }
      setBooks((prev) => {
        const exists = prev.some((b) => b.id === saved.id)
        return exists ? prev.map((b) => (b.id === saved.id ? saved : b)) : [saved, ...prev]
      })
      setCoverFile(null)
      setCoverPreview(null)
      setModalOpen(false)
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  const handleCoverChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are allowed (JPEG, PNG, etc).')
      e.target.value = ''
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Cover image must be 5MB or smaller.')
      e.target.value = ''
      return
    }
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    const id = deleteTarget.id
    setBooks((prev) => prev.filter((b) => b.id !== id))
    setDeleteTarget(null)
    try {
      await bookService.remove(id)
      toast.success('Book removed')
    } catch (e) {
      toast.error(getApiErrorMessage(e))
      load()
    }
  }

  const columns = [
    { key: 'title', header: 'Title' },
    { key: 'author', header: 'Author' },
    {
      key: 'category',
      header: 'Category',
      render: (row) => (
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badgeColor(row.category)}`}>{row.category}</span>
      ),
    },
    { key: 'isbn', header: 'ISBN' },
    {
      key: 'availableCopies',
      header: 'Availability',
      render: (row) => (
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            row.availableCopies > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
          }`}
        >
          {row.availableCopies}/{row.totalCopies}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Books</h1>
          <p className="text-sm text-gray-500">{isMember ? 'Browse and borrow from the catalog' : 'Manage catalog, availability, and metadata.'}</p>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            <Button icon={Plus} onClick={openCreate}>
              Add book
            </Button>
            <Link to="/categories" className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800">
              Categories
            </Link>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-950 dark:text-primary-300">
            <Library className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold text-gray-900 dark:text-gray-50">{catalogStats.totalBooks}</p>
            <p className="truncate text-xs text-gray-500">Total Books</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300">
            <BookCopy className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold text-gray-900 dark:text-gray-50">{catalogStats.availableCopies}</p>
            <p className="truncate text-xs text-gray-500">Available Copies</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300">
            <BookOpen className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold text-gray-900 dark:text-gray-50">{catalogStats.borrowedCopies}</p>
            <p className="truncate text-xs text-gray-500">Borrowed Copies</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-300">
            <Timer className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold text-gray-900 dark:text-gray-50">{catalogStats.reservedCount}</p>
            <p className="truncate text-xs text-gray-500">{isMember ? 'My Reservations' : 'Out of Stock Books'}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 lg:flex-row lg:items-center lg:justify-between">
        <CategorySearchBar
          className="max-w-2xl flex-1 min-w-0"
          categories={dbCategories.map((c) => ({ value: String(c.id), label: c.name }))}
          selectedCategory={categoryId}
          onCategoryChange={(v) => {
            setCategoryId(v || '')
            setPage(0)
            if (v) setSearchParams((prev) => ({ ...Object.fromEntries(prev), cat: v }), { replace: true })
            else {
              const next = new URLSearchParams(searchParams)
              next.delete('cat')
              setSearchParams(next, { replace: true })
            }
          }}
          value={keyword}
          onValueChange={(v) => { setKeyword(v); setPage(0) }}
          placeholder="Search by title or author..."
          ariaLabel="Search books"
          loading={categoriesLoading}
          error={categoriesError}
          onRetry={refreshCategories}
        />
        {canManage && (
          <div className="flex items-center gap-2">
            <Button variant={view === 'grid' ? 'primary' : 'secondary'} size="sm" type="button" onClick={() => setView('grid')} icon={Grid3x3}>
              Grid
            </Button>
            <Button variant={view === 'table' ? 'primary' : 'secondary'} size="sm" type="button" onClick={() => setView('table')} icon={List}>
              Table
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { key: 'all', label: 'All' },
          { key: 'available', label: 'Available' },
          { key: 'new', label: 'New Arrivals' },
          { key: 'popular', label: 'Most Popular' },
          { key: 'recommended', label: 'Recommended' },
        ].map((q) => (
          <button
            key={q.key}
            type="button"
            onClick={() => { setQuick(q.key); setPage(0) }}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              quick === q.key
                ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200'
            }`}
          >
            {q.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">Author</span>
          <select
            value={authorFilter}
            onChange={(e) => { setAuthorFilter(e.target.value); setPage(0) }}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-900"
          >
            <option value="">All Authors</option>
            {allAuthors.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">Language</span>
          <select
            value={languageFilter}
            onChange={(e) => { setLanguageFilter(e.target.value); setPage(0) }}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-900"
          >
            <option value="">All Languages</option>
            {allLanguages.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">Availability</span>
          <select
            value={availabilityFilter}
            onChange={(e) => { setAvailabilityFilter(e.target.value); setPage(0) }}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-900"
          >
            <option value="all">All Availability</option>
            <option value="available">Available</option>
            <option value="out">Out of Stock</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">Sort By</span>
          <select
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value); setPage(0) }}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-900"
          >
            <option value="popular">Most Popular</option>
            <option value="newest">Newest</option>
            <option value="rating">Top Rated</option>
            <option value="title-asc">Title A–Z</option>
            <option value="title-desc">Title Z–A</option>
          </select>
        </label>
      </div>

      {(authorFilter || languageFilter || availabilityFilter !== 'all' || sortBy !== 'popular' || quick !== 'all' || categoryId) && (
        <div className="flex justify-end">
          <Button
            variant="secondary" size="xs" type="button" icon={RotateCcw}
            onClick={() => {
              setAuthorFilter('')
              setLanguageFilter('')
              setAvailabilityFilter('all')
              setSortBy('popular')
              setQuick('all')
              setCategoryId('')
              const next = new URLSearchParams(searchParams)
              next.delete('cat')
              setSearchParams(next, { replace: true })
              setPage(0)
            }}
          >
            Reset Filters
          </Button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setCategoryId('')
            const next = new URLSearchParams(searchParams)
            next.delete('cat')
            setSearchParams(next, { replace: true })
            setPage(0)
          }}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
            !categoryId
              ? 'bg-primary-600 text-white shadow-md shadow-primary-500/30'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200'
          }`}
        >
          All
        </button>
        {dbCategories.map((c) => {
          const active = String(categoryId) === String(c.id)
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setCategoryId(String(c.id))
                setSearchParams((prev) => ({ ...Object.fromEntries(prev), cat: String(c.id) }), { replace: true })
                setPage(0)
              }}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                active
                  ? 'bg-primary-600 text-white shadow-md shadow-primary-500/30'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200'
              }`}
            >
              {c.name}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="flex flex-col items-center gap-4">
          <img src="/books.gif" alt="Loading books" className="h-24 w-24 object-contain" />
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        </div>
      ) : view === 'table' && canManage ? (
        <DataTable
          columns={columns}
          data={filtered}
          searchKeys={['title', 'author', 'isbn']}
          actions={(row) => (
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              {isAdmin && (
                <>
                  <Button variant="secondary" size="sm" type="button" icon={Pencil} onClick={() => openEdit(row)}>
                    Edit
                  </Button>
                  <Button variant="danger" size="sm" type="button" icon={Trash2} onClick={() => setDeleteTarget(row)}>
                    Delete
                  </Button>
                </>
              )}
            </div>
          )}
        />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center dark:border-gray-800 dark:bg-gray-900">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-50 text-3xl dark:bg-gray-800">🔍</div>
          <p className="mt-4 text-lg font-semibold text-gray-800 dark:text-gray-100">No Books Found</p>
          <p className="mt-1 text-sm text-gray-500 max-w-sm">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <>
        <div className="grid gap-4 md:grid-cols-2">
          {paginated.map((book) => {
            const borrowed = Math.max(0, (book.totalCopies ?? 0) - (book.availableCopies ?? 0))
            return (
            <article
              key={book.id}
              onClick={() => handleOpenDetails(book)}
              className="group flex h-full cursor-pointer overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900"
            >
              <figure className="relative w-[150px] shrink-0 self-stretch bg-gradient-to-br from-primary-500 via-sky-500 to-indigo-600">
                <BookCover
                  src={preferCover(book)}
                  alt={book.title}
                  className="h-full w-full"
                  imgClassName="h-full w-full rounded-l-xl object-cover"
                />
                <span className="absolute left-3 top-3 rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold text-white ring-1 ring-white/30 backdrop-blur">
                  {book.category}
                </span>
              </figure>
              <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
                <div>
                  <h2 className="text-lg font-semibold leading-snug text-gray-900 dark:text-gray-50">{book.title}</h2>
                  <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{book.author}</p>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                  {book.isbn && <span><span className="font-semibold text-gray-700 dark:text-gray-300">ISBN:</span> {book.isbn}</span>}
                  {book.publisher && <span><span className="font-semibold text-gray-700 dark:text-gray-300">Publisher:</span> {book.publisher}</span>}
                  {book.shelfLocation && <span><span className="font-semibold text-gray-700 dark:text-gray-300">Shelf:</span> {book.shelfLocation}</span>}
                </div>
                <div className="mt-1 grid grid-cols-3 gap-2 rounded-xl bg-gray-50 p-2.5 text-center text-xs dark:bg-gray-800/50">
                  <div>
                    <p className="text-[10px] text-gray-400">Total</p>
                    <p className="font-semibold text-gray-800 dark:text-gray-200">{book.totalCopies}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400">Available</p>
                    <p className="font-semibold text-emerald-600">{book.availableCopies}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400">Borrowed</p>
                    <p className="font-semibold text-amber-600">{borrowed}</p>
                  </div>
                </div>
                {queueInfoMap[book.id]?.queueLength > 0 && (
                  <div className="mt-1 rounded-xl bg-amber-50 p-2 text-center dark:bg-amber-950/50">
                    <p className="flex items-center justify-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
                      <Users className="h-3 w-3" /> {queueInfoMap[book.id].queueLength} People Waiting
                    </p>
                    <p className="flex items-center justify-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
                      <Timer className="h-3 w-3" /> Estimated Wait: ~{queueInfoMap[book.id].estimatedWaitDays} days
                    </p>
                  </div>
                )}
                <div className="mt-auto flex flex-wrap gap-2 pt-2 sm:justify-end" onClick={(e) => e.stopPropagation()}>
                  {isMember && (
                    <>
                      {!borrowedIds.has(book.id) && (
                        <Button
                          variant="secondary" size="sm" className="flex-1" type="button"
                          icon={Heart}
                          loading={wishlistLoadingId === book.id}
                          onClick={() => handleToggleWishlist(book.id)}
                        >
                          {wishlistedIds.has(book.id) ? 'Remove Wishlist' : 'Wishlist'}
                        </Button>
                      )}
                      {(() => {
                        const r = reservationsMap[book.id]
                        const isReserved = r && (r.status === 'WAITING' || r.status === 'READY_FOR_PICKUP')
                        if (isReserved && r.status === 'READY_FOR_PICKUP') {
                          return (
                            <div className="flex-1 space-y-1.5">
                              <div className="rounded-xl bg-emerald-50 px-3 py-1.5 text-center text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                                <span className="flex items-center justify-center gap-1"><CheckCircle className="h-3 w-3" /> Ready for Pickup</span>
                                {r.pickupExpiryDate && (
                                  <span className="block text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                                    Collect Before: {fmtDate(r.pickupExpiryDate)}
                                  </span>
                                )}
                              </div>
                              <GoldAura enabled={hasPaidPlan} className="block">
                                <Button
                                  variant="primary" size="sm" className="w-full" type="button"
                                  icon={BookOpen}
                                  loading={borrowingId === book.id}
                                  disabled={borrowingId === book.id}
                                  onClick={() => setBorrowConfirmBook(book)}
                                >
                                  Borrow Now
                                </Button>
                              </GoldAura>
                            </div>
                          )
                        }
                        if (isReserved) {
                          return (
                            <div className="flex-1 space-y-1.5">
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                                <Clock className="h-3 w-3" /> Reserved · #{r.queuePosition}
                              </span>
                              <div className="flex gap-1.5">
                                <Button
                                  variant="secondary" size="xs" type="button" icon={Eye}
                                  onClick={() => navigate('/reservations')}
                                >
                                  View
                                </Button>
                                <Button
                                  variant="danger" size="xs" type="button" icon={XCircle}
                                  loading={cancellingId === book.id}
                                  disabled={cancellingId === book.id}
                                  onClick={() => setCancelReserveBook(book)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          )
                        }
                        if (borrowedIds.has(book.id)) {
                          const loan = borrowedMap[book.id]
                          return (
                            <div className="flex-1 rounded-xl bg-gray-100 px-3 py-2 text-center dark:bg-gray-800">
                              <p className="flex items-center justify-center gap-1 text-xs font-semibold text-gray-600 dark:text-gray-400">
                                <BookOpen className="h-3 w-3" /> Borrowed
                              </p>
                              {loan?.dueDate && (
                                <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                                  Due Date: {fmtDate(loan.dueDate)}
                                </p>
                              )}
                            </div>
                          )
                        }
                        if (borrowRequestsMap[book.id]?.status === 'PENDING') {
                          return (
                            <div className="flex-1 rounded-xl bg-amber-50 px-3 py-2 text-center dark:bg-amber-900/20">
                              <p className="flex items-center justify-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
                                <Clock className="h-3 w-3" /> Request Pending
                              </p>
                              <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                                Awaiting admin approval
                              </p>
                            </div>
                          )
                        }
                        if (!activeSub) {
                          return (
                            <Button
                              variant="secondary" size="sm" className="flex-1" type="button"
                              icon={ShieldCheck}
                              onClick={() => navigate('/membership')}
                            >
                              Membership Required
                            </Button>
                          )
                        }
                        if (book.availableCopies > 0) {
                          return (
                            <GoldAura enabled={hasPaidPlan} className="flex-1">
                              <Button
                                variant="primary" size="sm" className="w-full" type="button"
                                icon={BookOpen}
                                loading={borrowingId === book.id}
                                disabled={borrowingId === book.id}
                                onClick={() => { setBorrowStartDate(todayISO()); setBorrowConfirmBook(book) }}
                              >
                                Borrow
                              </Button>
                            </GoldAura>
                          )
                        }
                        return (
                          <Button
                            variant="secondary" size="sm" className="flex-1" type="button"
                            icon={CalendarClock}
                            loading={reservingId === book.id}
                            disabled={reservingId === book.id}
                            onClick={() => setReserveConfirmBook(book)}
                          >
                            Reserve
                          </Button>
                        )
                      })()}
                    </>
                  )}
                  {isAdmin && (
                    <div className="flex w-full gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button variant="secondary" size="sm" className="flex-1" type="button" icon={Pencil} onClick={() => openEdit(book)}>
                        Edit
                      </Button>
                      <Button variant="secondary" size="sm" className="flex-1" type="button" icon={BookOpen} onClick={() => handleOpenDetails(book)}>
                        Details
                      </Button>
                      <Button variant="danger" size="sm" className="flex-1" type="button" icon={Trash2} onClick={() => setDeleteTarget(book)}>
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </article>
            )
          })}
        </div>

        {pages > 1 && (
          <Pagination currentPage={currentPage} totalPages={pages} onChange={setPage} />
        )}
        </>
      )}

      {canManage && (
        <>
          <Modal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            title={editing ? 'Edit book' : 'Add book'}
            footer={
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" loading={saving} onClick={saveBook}>
                  Save
                </Button>
              </div>
            }
          >
            <div className="grid gap-4 md:grid-cols-2">
              <FormInput
                label="Title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                error={errors.title}
              />
              <FormInput
                label="Author"
                value={form.author}
                onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))}
                error={errors.author}
              />
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-900"
                >
                  <option value="">Select category</option>
                  {dbCategories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <FormInput label="ISBN" value={form.isbn} onChange={(e) => setForm((f) => ({ ...f, isbn: e.target.value }))} />
              <FormInput
                label="Total copies"
                type="number"
                min="0"
                value={form.totalCopies}
                onChange={(e) => setForm((f) => ({ ...f, totalCopies: Number(e.target.value) }))}
                error={errors.totalCopies}
              />
              {!editing ? (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                  <CheckCircle className="h-4 w-4" /> All copies start available (synchronized with total)
                </div>
              ) : null}
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">Upload Cover</label>
                <div className="flex items-center gap-4">
                  <BookCover
                    src={coverPreview || DEFAULT_COVER}
                    alt="Cover preview"
                    eager
                    className="h-28 w-20 shrink-0"
                    imgClassName="h-full w-full rounded-lg object-cover shadow ring-1 ring-gray-200 dark:ring-gray-800"
                  />
                  <div className="flex-1">
                    <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/60 px-4 py-4 text-center hover:border-primary-400 hover:bg-primary-50/40 dark:border-gray-800 dark:bg-gray-800/40 dark:hover:border-primary-500 dark:hover:bg-primary-950/40">
                      <ImagePlus className="mb-1 h-5 w-5 text-gray-400" />
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                        {coverFile ? coverFile.name : editing ? 'Choose a new cover image (optional)' : 'Choose a cover image (optional)'}
                      </span>
                      <span className="mt-0.5 text-[11px] text-gray-400">JPEG, PNG or WebP · max 5MB</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
                    </label>
                    {coverFile && (
                      <button
                        type="button"
                        onClick={() => { setCoverFile(null); setCoverPreview(editing ? preferCover(editing) : null) }}
                        className="mt-2 text-xs font-medium text-rose-600 hover:underline dark:text-rose-400"
                      >
                        Remove selected cover
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Modal>

          <Modal
            open={!!deleteTarget}
            onClose={() => setDeleteTarget(null)}
            title="Delete book?"
            size="sm"
            footer={
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="secondary" type="button" onClick={() => setDeleteTarget(null)}>
                  Cancel
                </Button>
                <Button variant="danger" type="button" onClick={confirmDelete}>
                  Delete
                </Button>
              </div>
            }
          >
            <p className="text-sm text-gray-600 dark:text-gray-300">
              This will remove <span className="font-semibold">{deleteTarget?.title}</span> from the catalog. Active loans may block deletion.
            </p>
          </Modal>
        </>
      )}

      <>
        <Modal
          open={!!detailBook}
          onClose={() => { setDetailBook(null); if (paramId) navigate('/books') }}
            title={detailBook?.title || 'Book details'}
            size="lg"
            className="max-h-[90vh] overflow-y-auto"
          >
            {detailBook && (
              <div className="space-y-5">
                <BookCover
                  src={preferCover(detailBook)}
                  alt={detailBook.title}
                  priority
                  className="mx-auto h-48 w-36"
                  imgClassName="h-full w-full rounded-xl object-cover shadow-lg"
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Author</p>
                    <p className="mt-0.5 text-sm font-medium text-gray-900 dark:text-gray-50">{detailBook.author}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Category</p>
                    <p className="mt-0.5 text-sm font-medium text-gray-900 dark:text-gray-50">{detailBook.category || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">ISBN</p>
                    <p className="mt-0.5 text-sm font-medium text-gray-900 dark:text-gray-50">{detailBook.isbn || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Publisher</p>
                    <p className="mt-0.5 text-sm font-medium text-gray-900 dark:text-gray-50">{detailBook.publisher || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Publication Year</p>
                    <p className="mt-0.5 text-sm font-medium text-gray-900 dark:text-gray-50">{detailBook.publicationYear || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Language</p>
                    <p className="mt-0.5 text-sm font-medium text-gray-900 dark:text-gray-50">{detailBook.language || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Shelf Location</p>
                    <p className="mt-0.5 text-sm font-medium text-gray-900 dark:text-gray-50">{detailBook.shelfLocation || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Average Rating</p>
                    <p className="mt-0.5 text-sm font-medium text-gray-900 dark:text-gray-50">
                      {detailBook.averageRating != null && detailBook.averageRating > 0
                        ? '⭐ '.repeat(Math.round(detailBook.averageRating)) + ` (${detailBook.averageRating.toFixed(1)})`
                        : 'No ratings yet'}
                    </p>
                  </div>
                </div>
                {detailBook.description && (
                  <>
                    <hr className="border-gray-100 dark:border-gray-800" />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Description</p>
                      <p className="mt-1 text-sm leading-relaxed text-gray-700 dark:text-gray-300">{detailBook.description}</p>
                    </div>
                  </>
                )}
                <hr className="border-gray-100 dark:border-gray-800" />
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl bg-gray-50 p-3 text-center dark:bg-gray-800/50">
                    <p className="text-xs text-gray-400">Total Copies</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-50">{detailBook.totalCopies}</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-3 text-center dark:bg-gray-800/50">
                    <p className="text-xs text-gray-400">Available</p>
                    <p className="text-lg font-bold text-emerald-600">{detailBook.availableCopies}</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-3 text-center dark:bg-gray-800/50">
                    <p className="text-xs text-gray-400">Borrowed</p>
                    <p className="text-lg font-bold text-amber-600">{Math.max(0, (detailBook.totalCopies ?? 0) - (detailBook.availableCopies ?? 0))}</p>
                  </div>
                </div>
                {detailQueue != null && (
                  <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800/50">
                    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      <Users className="h-3.5 w-3.5" /> Waiting Queue
                    </p>
                    {detailQueue.length > 0 ? (
                      <ol className="mt-2 space-y-1.5">
                        {detailQueue.map((q, i) => (
                          <li key={q.id} className="flex items-center gap-2 text-sm">
                            <span className={`flex h-5 w-6 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                              i === 0
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                            }`}>
                              #{q.queuePosition ?? i + 1}
                            </span>
                            <span className="truncate text-gray-700 dark:text-gray-300">{q.userName || 'Member'}</span>
                            {i === 0 && <span className="ml-auto text-xs font-semibold text-emerald-600">Next up</span>}
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="mt-1 text-sm text-gray-500">No one is waiting. Grab it when it becomes available.</p>
                    )}
                  </div>
                )}
                {(isMember) && (
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end pt-2">
                    <Button
                      variant="secondary" type="button"
                      icon={Heart}
                      loading={wishlistLoadingId === detailBook.id}
                      onClick={() => { handleToggleWishlist(detailBook.id) }}
                    >
                      {wishlistedIds.has(detailBook.id) ? 'Wishlisted' : 'Wishlist'}
                    </Button>
                    {(() => {
                      const r = reservationsMap[detailBook.id]
                      const isReserved = r && (r.status === 'WAITING' || r.status === 'READY_FOR_PICKUP')
                      if (isReserved && r.status === 'READY_FOR_PICKUP') {
                        return (
                          <GoldAura enabled={hasPaidPlan}>
                            <Button
                              type="button"
                              variant="primary"
                              icon={BookOpen}
                              onClick={() => { setDetailBook(null); setBorrowConfirmBook(detailBook) }}
                            >
                              Borrow Now
                            </Button>
                          </GoldAura>
                        )
                      }
                      if (isReserved && r.status === 'WAITING') {
                        return (
                          <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
                            <Clock className="h-4 w-4" />
                            Reserved · #{r.queuePosition}
                          </div>
                        )
                      }
                      if (borrowedIds.has(detailBook.id)) {
                        const loan = borrowedMap[detailBook.id]
                        return (
                          <div className="flex items-center gap-2 text-right">
                            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                              <BookOpen className="h-3.5 w-3.5" /> Borrowed
                            </span>
                            {loan?.dueDate && (
                              <span className="text-xs text-gray-400">Due: {fmtDate(loan.dueDate)}</span>
                            )}
                          </div>
                        )
                      }
                      if (borrowRequestsMap[detailBook.id]?.status === 'PENDING') {
                        return (
                          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                            <Clock className="h-4 w-4" />
                            Request Pending · Awaiting admin approval
                          </div>
                        )
                      }
                      if (!activeSub) {
                        return (
                          <Button variant="secondary" type="button" icon={ShieldCheck} onClick={() => { setDetailBook(null); navigate('/membership') }}>
                            Membership Required
                          </Button>
                        )
                      }
                      if (detailBook.availableCopies > 0) {
                        return (
                          <GoldAura enabled={hasPaidPlan}>
                            <Button
                              type="button"
                              icon={BookOpen}
                              loading={borrowingId === detailBook.id}
                              disabled={borrowingId === detailBook.id}
                              onClick={() => { setDetailBook(null); setBorrowStartDate(todayISO()); setBorrowConfirmBook(detailBook) }}
                            >
                              Borrow
                            </Button>
                          </GoldAura>
                        )
                      }
                      return (
                        <Button
                          type="button"
                          variant="secondary"
                          icon={CalendarClock}
                          loading={reservingId === detailBook.id}
                          disabled={reservingId === detailBook.id}
                          onClick={() => { setReserveConfirmBook(detailBook); setDetailBook(null) }}
                        >
                          Reserve
                        </Button>
                      )
                    })()}
                  </div>
                )}
              </div>
            )}
          </Modal>
          {reserveConfirmBook && (
            <Modal
              open={!!reserveConfirmBook}
              title="Confirm Reservation"
              size="md"
              onClose={() => setReserveConfirmBook(null)}
              footer={
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button variant="secondary" type="button" onClick={() => setReserveConfirmBook(null)}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    loading={reservingId === reserveConfirmBook.id}
                    onClick={async () => {
                      setReservingId(reserveConfirmBook.id)
                      try {
                        const res = await reserveBook(reserveConfirmBook.id)
                        setReserveSuccess(res)
                        setReserveConfirmBook(null)
                        loadReservationData()
                        load()
                      } catch (e) {
                        toast.error(getApiErrorMessage(e))
                      } finally {
                        setReservingId(null)
                      }
                    }}
                  >
                    Confirm Reservation
                  </Button>
                </div>
              }
            >
              {reserveConfirmBook && (
                <div className="space-y-4">
                  <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800/50">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-50">{reserveConfirmBook.title}</h3>
                    <p className="text-sm text-gray-500">{reserveConfirmBook.author}</p>
                    {reserveConfirmBook.isbn && (
                      <p className="text-xs text-gray-400 font-mono mt-1">ISBN: {reserveConfirmBook.isbn}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800/50">
                      <p className="text-xs text-gray-400">Estimated Queue Position</p>
                      <p className="font-semibold text-gray-900 dark:text-gray-50">
                        #{(queueInfoMap[reserveConfirmBook.id]?.queueLength ?? 0) + 1}
                      </p>
                    </div>
                    <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800/50">
                      <p className="text-xs text-gray-400">Est. Wait Time</p>
                      <p className="font-semibold text-amber-600">
                        ~{Math.max(1, ((queueInfoMap[reserveConfirmBook.id]?.queueLength ?? 0) + 1) * 3)} days
                      </p>
                    </div>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-3 text-xs text-gray-500 dark:bg-gray-800/50 space-y-1">
                    <p><strong>Membership:</strong> {currentUser?.name || 'Member'}</p>
                    <p><strong>Policy:</strong> FIFO queue. You will be notified when the book is ready for pickup. Hold time is 48 hours.</p>
                  </div>
                </div>
              )}
            </Modal>
          )}
          {cancelReserveBook && (
            <Modal
              open={!!cancelReserveBook}
              title="Cancel Reservation?"
              size="sm"
              onClose={() => setCancelReserveBook(null)}
              footer={
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button variant="secondary" type="button" onClick={() => setCancelReserveBook(null)}>
                    Keep Reservation
                  </Button>
                  <Button
                    variant="danger"
                    type="button"
                    loading={cancellingId === cancelReserveBook.id}
                    onClick={() => handleCancelReservation(cancelReserveBook)}
                  >
                    Yes, Cancel
                  </Button>
                </div>
              }
            >
              <div className="space-y-3">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Remove your reservation for <span className="font-semibold text-gray-900 dark:text-gray-50">{cancelReserveBook.title}</span>?
                </p>
                <div className="rounded-xl bg-gray-50 p-3 text-xs text-gray-500 dark:bg-gray-800/50">
                  <p>Queue Position: <strong className="text-gray-900 dark:text-gray-50">#{reservationsMap[cancelReserveBook.id]?.queuePosition ?? '—'}</strong></p>
                  <p className="mt-1">Your spot will be released to the next person in line. This cannot be undone.</p>
                </div>
              </div>
            </Modal>
          )}
          {borrowConfirmBook && (() => {
            const isPickup = reservationsMap[borrowConfirmBook.id]?.status === 'READY_FOR_PICKUP'
            const plan = activeSub?.plan
            const maxLoanDays = plan?.maxLoanDays || LOAN_DAYS_BY_PLAN[plan?.name] || 14
            const dueDateISO = !isPickup && borrowStartDate ? addDaysISO(borrowStartDate, maxLoanDays) : ''
            const borrowedCount = borrowedIds.size
            const maxBooks = plan?.maxBooks ?? 0
            const remaining = Math.max(0, maxBooks - borrowedCount)
            const available = borrowConfirmBook.availableCopies ?? 0
            const total = borrowConfirmBook.totalCopies ?? 0
            const sectionTitle = 'text-xs font-semibold uppercase tracking-wide text-gray-400'
            return (
            <Modal
              open={!!borrowConfirmBook}
              title={isPickup ? 'Confirm Borrow' : 'Borrow Request'}
              size="md"
              onClose={() => setBorrowConfirmBook(null)}
              footer={
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button variant="secondary" type="button" onClick={() => setBorrowConfirmBook(null)}>
                    Cancel
                  </Button>
                  <GoldAura enabled={hasPaidPlan}>
                    <Button
                      variant="primary"
                      type="button"
                      loading={borrowingId === borrowConfirmBook.id}
                      onClick={() => { const b = borrowConfirmBook; setBorrowConfirmBook(null); if (isPickup) handleBorrow(b.id); else handleBorrowRequest(b.id, borrowStartDate, dueDateISO) }}
                    >
                      {isPickup ? 'Confirm Borrow' : 'Send Borrow Request'}
                    </Button>
                  </GoldAura>
                </div>
              }
            >
              <div className="space-y-5">
                <section className="space-y-2">
                  <h4 className={`flex items-center gap-1.5 ${sectionTitle}`}>
                    <BookCopy className="h-3.5 w-3.5" /> Book Information
                  </h4>
                  <div className="flex items-start gap-3 rounded-xl bg-gray-50 p-4 dark:bg-gray-800/50">
                    <BookCover
                      src={preferCover(borrowConfirmBook)}
                      alt=""
                      className="h-20 w-14 shrink-0"
                      imgClassName="h-full w-full rounded-md object-cover shadow-sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 dark:text-gray-50">{borrowConfirmBook.title}</p>
                      <p className="text-sm text-gray-500">{borrowConfirmBook.author}</p>
                      {borrowConfirmBook.isbn && (
                        <p className="mt-0.5 text-xs font-mono text-gray-400">ISBN: {borrowConfirmBook.isbn}</p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-semibold text-primary-700 dark:bg-primary-950/40 dark:text-primary-300">
                          {borrowConfirmBook.category || 'General'}
                        </span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          available > 0
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                        }`}>
                          {available > 0 ? 'Available' : 'Out of stock'} · {available}/{total} copies
                        </span>
                      </div>
                    </div>
                  </div>
                </section>

                {!isPickup && (
                  <section className="space-y-2">
                    <h4 className={`flex items-center gap-1.5 ${sectionTitle}`}>
                      <CalendarDays className="h-3.5 w-3.5" /> Borrow Details
                    </h4>
                    <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-center">
                      <div className="relative w-full flex-1">
                        <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3">
                          <CalendarDays className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                          id="borrow-date-start"
                          name="start"
                          type="date"
                          min={todayISO()}
                          value={borrowStartDate}
                          onChange={(e) => setBorrowStartDate(e.target.value)}
                          placeholder="Select date start"
                          className="block w-full rounded-lg border border-gray-200 bg-white py-2.5 ps-9 pe-3 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
                        />
                      </div>
                      <span className="text-sm text-gray-500">to</span>
                      <div className="relative w-full flex-1">
                        <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3">
                          <CalendarClock className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                          id="borrow-date-end"
                          name="end"
                          type="text"
                          value={dueDateISO ? fmtDate(dueDateISO) : '—'}
                          readOnly
                          disabled
                          className="block w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-50 py-2.5 ps-9 pe-3 text-sm font-semibold text-gray-800 shadow-sm placeholder:text-gray-400 focus:outline-none dark:border-gray-800 dark:bg-gray-800/60 dark:text-gray-100"
                        />
                      </div>
                    </div>
                    <p className="rounded-lg bg-primary-50 px-2 py-1.5 text-[11px] font-medium text-primary-700 dark:bg-primary-950/40 dark:text-primary-300">
                      Due date is auto-calculated based on your {plan?.name || 'Member'} membership ({maxLoanDays}-day loan
                      period) and cannot be changed.
                    </p>
                  </section>
                )}

                <section className="space-y-2">
                  <h4 className={`flex items-center gap-1.5 ${sectionTitle}`}>
                    <ShieldCheck className="h-3.5 w-3.5" /> Membership Information
                  </h4>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl bg-gray-50 p-4 text-sm dark:bg-gray-800/50">
                    <div>
                      <dt className="text-xs font-semibold text-gray-500">Plan</dt>
                      <dd className="mt-0.5 font-semibold text-gray-900 dark:text-gray-50">{plan?.name || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold text-gray-500">Borrow Limit</dt>
                      <dd className="mt-0.5 font-semibold text-gray-900 dark:text-gray-50">{maxBooks || '—'} books</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold text-gray-500">Books Currently Borrowed</dt>
                      <dd className="mt-0.5 font-semibold text-gray-900 dark:text-gray-50">{borrowedCount}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold text-gray-500">Remaining Limit</dt>
                      <dd className="mt-0.5 font-semibold text-gray-900 dark:text-gray-50">{remaining}</dd>
                    </div>
                  </dl>
                </section>

                <section className="space-y-2">
                  <h4 className={`flex items-center gap-1.5 ${sectionTitle}`}>
                    <Info className="h-3.5 w-3.5" /> Library Policy
                  </h4>
                  <ul className="space-y-1.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                    <li className="flex items-start gap-2"><ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" /> This request requires administrator approval.</li>
                    <li className="flex items-start gap-2"><ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" /> The book will not be issued immediately.</li>
                    <li className="flex items-start gap-2"><ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" /> The due date starts after approval.</li>
                    <li className="flex items-start gap-2"><ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Late returns automatically generate fines.</li>
                  </ul>
                </section>
              </div>
            </Modal>
            )
          })()}
          {reserveSuccess && (
            <Modal
              open={!!reserveSuccess}
              title="Reservation Created"
              size="sm"
              onClose={() => setReserveSuccess(null)}
              footer={
                <div className="flex justify-end">
                  <Button type="button" onClick={() => setReserveSuccess(null)}>
                    OK
                  </Button>
                </div>
              }
            >
              <div className="text-center space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50">Reservation Created Successfully</h3>
                <p className="text-sm text-gray-500">You have been added to the waiting list.</p>
                <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                  <p>Queue Position: <strong>#{reserveSuccess.queuePosition}</strong></p>
                </div>
                <p className="text-xs text-gray-400">You will receive a notification when the book becomes available.</p>
              </div>
            </Modal>
          )}
        </>
    </div>
  )
}
