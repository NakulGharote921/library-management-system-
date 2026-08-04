import { useCallback } from 'react'
import { useEffect, useState } from 'react'
import { BarChart3, BookMarked, Download, Library, TrendingUp, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import StatsCard from '../components/StatsCard.jsx'
import { CardSkeleton } from '../components/PageSkeleton.jsx'
import { bookService, dashboardService, getApiErrorMessage, issuedBookService, userService } from '../services/api.js'

export default function Report() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await dashboardService.getStats()
        if (!cancelled) setStats(data)
      } catch (e) {
        toast.error(getApiErrorMessage(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const exportCsv = useCallback(async (type, fetchFn, headers, rowMapper, filename) => {
    try {
      const data = await fetchFn()
      const lines = [headers.join(',')]
      data.forEach((row) => lines.push(rowMapper(row).join(',')))
      const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${filename}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      toast.success(`${type} exported`)
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    }
  }, [])

  const exportBooks = () => exportCsv(
    'Books',
    () => bookService.getAll(),
    ['id', 'title', 'author', 'category', 'isbn', 'totalCopies', 'availableCopies'],
    (b) => [b.id, `"${(b.title || '').replace(/"/g, '""')}"`, `"${(b.author || '').replace(/"/g, '""')}"`, b.category || '', b.isbn || '', b.totalCopies, b.availableCopies],
    'books-catalog',
  )

  const exportUsers = () => exportCsv(
    'Users',
    () => userService.getAll(),
    ['id', 'name', 'email', 'phone', 'enrollmentDate'],
    (s) => [s.id, `"${(s.name || '').replace(/"/g, '""')}"`, s.email, s.phone || '', s.enrollmentDate || ''],
    'user-activity',
  )

  const exportCirculation = () => exportCsv(
    'Circulation',
    () => issuedBookService.getAll(),
    ['id', 'user', 'email', 'book', 'author', 'issueDate', 'dueDate', 'returnDate', 'status'],
    (r) => [
      r.id,
      `"${(r.user?.name || '').replace(/"/g, '""')}"`,
      r.user?.email || '',
      `"${(r.book?.title || '').replace(/"/g, '""')}"`,
      `"${(r.book?.author || '').replace(/"/g, '""')}"`,
      r.issueDate,
      r.dueDate,
      r.returnDate || '',
      r.status,
    ],
    'circulation-history',
  )

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-40 w-full rounded-3xl" />
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </section>
        <section className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => <CardSkeleton key={`c-${i}`} />)}
        </section>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-700 via-primary-600 to-sky-500 p-8 text-white shadow-xl">
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/15 blur-3xl" />
        <div className="relative">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ring-white/30">
            <BarChart3 className="h-3.5 w-3.5" />
            Reports
          </p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight lg:text-4xl">Library Reports</h1>
          <p className="mt-2 max-w-xl text-sm text-white/85">
            Key metrics and statistics about library operations, circulation, and student engagement.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatsCard title="Total books" value={stats?.totalBooks ?? 0} icon={Library} color="blue" trend="+ catalog growth" />
        <StatsCard title="Students" value={stats?.totalStudents ?? 0} icon={Users} color="violet" trend="Active profiles" />
        <StatsCard title="Books issued" value={stats?.activeIssues ?? 0} icon={BookMarked} color="amber" trend="Currently on loan" />
        <StatsCard title="Available copies" value={stats?.availableBooks ?? 0} icon={TrendingUp} color="green" trend="On shelves" />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Export Options</h2>
          <p className="text-sm text-gray-500">Download reports for offline analysis</p>
          <div className="mt-6 space-y-3">
            <button
              type="button"
              onClick={exportBooks}
              className="flex w-full items-center justify-between rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-800 transition hover:border-primary-200 hover:bg-white hover:shadow-md dark:border-gray-800 dark:bg-gray-800/60 dark:text-gray-100 dark:hover:bg-gray-800"
            >
              <span className="inline-flex items-center gap-2">
                <Download className="h-4 w-4 text-primary-600" />
                Books Catalog Report
              </span>
            </button>
            <button
              type="button"
              onClick={exportUsers}
              className="flex w-full items-center justify-between rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-800 transition hover:border-primary-200 hover:bg-white hover:shadow-md dark:border-gray-800 dark:bg-gray-800/60 dark:text-gray-100 dark:hover:bg-gray-800"
            >
              <span className="inline-flex items-center gap-2">
                <Download className="h-4 w-4 text-primary-600" />
                User Activity Report
              </span>
            </button>
            <button
              type="button"
              onClick={exportCirculation}
              className="flex w-full items-center justify-between rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-800 transition hover:border-primary-200 hover:bg-white hover:shadow-md dark:border-gray-800 dark:bg-gray-800/60 dark:text-gray-100 dark:hover:bg-gray-800"
            >
              <span className="inline-flex items-center gap-2">
                <Download className="h-4 w-4 text-primary-600" />
                Circulation History Report
              </span>
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
