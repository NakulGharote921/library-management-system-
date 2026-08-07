import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import {
  AlertTriangle, BellRing, BookOpen, BookMarked, Coins, Download, FileText, Filter, Hash,
  Printer, RefreshCw, Undo2, User,
} from 'lucide-react'
import Button from '../components/Button.jsx'
import BookCover from '../components/BookCover.jsx'
import PageSkeleton from '../components/PageSkeleton.jsx'
import { getApiErrorMessage, issuedBookService } from '../services/api.js'
import { selectUserRole, selectUser } from '../store/authSlice.js'
import { coverOrSlug } from '../utils/bookCovers.js'

const ADMIN_TABS = [
  { id: 'active', label: 'Active' },
  { id: 'returned', label: 'Returned' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'all', label: 'All' },
]

const canReturnLoan = (tab) => tab === 'active' || tab === 'overdue'

function daysOverdue(due) {
  if (!due) return 0
  const dueDate = new Date(due)
  const today = new Date()
  const diff = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24))
  return diff > 0 ? diff : 0
}

function initials(name) {
  return (name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]))
}

export default function IssuedBooks() {
  const navigate = useNavigate()
  const role = useSelector(selectUserRole)
  const currentUser = useSelector(selectUser)
  const isMember = role === 'MEMBER'

  const [tab, setTab] = useState(isMember ? null : 'active')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [userFilter, setUserFilter] = useState('')
  const [bookFilter, setBookFilter] = useState('')
  const [returningId, setReturningId] = useState(null)
  const [requestingId, setRequestingId] = useState(null)
  const [selected, setSelected] = useState(() => new Set())
  const [bulkReturning, setBulkReturning] = useState(false)
  const [bulkReminding, setBulkReminding] = useState(false)
  const [bulkFining, setBulkFining] = useState(false)
  const [remindingId, setRemindingId] = useState(null)
  const [finingId, setFiningId] = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  const isSelectableTab = !isMember && canReturnLoan(tab)

  const load = useCallback(async () => {
    setLoading(true)
    setSelected(new Set())
    try {
      let data = []
      if (isMember) {
        data = await issuedBookService.getMyBooks()
      } else if (tab === 'active') data = await issuedBookService.getActive()
      else if (tab === 'returned') data = await issuedBookService.getReturned()
      else if (tab === 'overdue') data = await issuedBookService.getOverdue()
      else data = await issuedBookService.getAll()
      setRows(data)
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [tab, isMember])

  useEffect(() => {
    load()
  }, [load])

  const changeTab = (next) => {
    if (next === tab) return
    setSelected(new Set())
    setExpandedId(null)
    setTab(next)
  }

  const filtered = useMemo(() => {
    const s = userFilter.trim().toLowerCase()
    const b = bookFilter.trim().toLowerCase()
    return rows.filter((row) => {
      const okS = !s || (row.memberName || '').toLowerCase().includes(s) || (row.memberEmail || '').toLowerCase().includes(s)
      const okB = !b || (row.bookTitle || '').toLowerCase().includes(b) || (row.bookAuthor || '').toLowerCase().includes(b)
      return okS && okB
    })
  }, [rows, userFilter, bookFilter])

  const handleReturn = async (id) => {
    setReturningId(id)
    const previous = rows
    setRows((list) => list.filter((r) => r.id !== id))
    try {
      await issuedBookService.returnBook(id)
      toast.success('Return approved — inventory updated')
      load()
    } catch (e) {
      toast.error(getApiErrorMessage(e))
      setRows(previous)
    } finally {
      setReturningId(null)
    }
  }

  const handleRequestReturn = async (id) => {
    setRequestingId(id)
    try {
      await issuedBookService.requestReturn(id)
      toast.success('Return requested — awaiting administrator approval')
      load()
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    } finally {
      setRequestingId(null)
    }
  }

  const renderActions = (issue, canAct) => (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {canAct && issue.issueStatus === 'ISSUED' && (
        <>
          {tab === 'overdue' && (
            <>
              <Button
                size="sm"
                variant="secondary"
                type="button"
                icon={BellRing}
                loading={remindingId === issue.id}
                onClick={() => handleRemind(issue.id)}
              >
                Remind
              </Button>
              <Button
                size="sm"
                variant="danger"
                type="button"
                icon={Coins}
                loading={finingId === issue.id}
                onClick={() => handleGenerateFine(issue.id)}
              >
                Fine
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="success"
            type="button"
            loading={returningId === issue.id}
            onClick={() => handleReturn(issue.id)}
          >
            {issue.returnRequestedAt ? 'Approve Return' : 'Return book'}
          </Button>
        </>
      )}
      {issue.issueStatus === 'ISSUED' && isMember ? (
        issue.returnRequestedAt ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600">
            <Undo2 className="h-3.5 w-3.5" /> Pending approval
          </span>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            type="button"
            icon={Undo2}
            loading={requestingId === issue.id}
            onClick={() => handleRequestReturn(issue.id)}
          >
            Request Return
          </Button>
        )
      ) : null}
    </div>
  )

  const allSelected = filtered.length > 0 && filtered.every((r) => selected.has(r.id))

  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allSelected) filtered.forEach((r) => next.delete(r.id))
      else filtered.forEach((r) => next.add(r.id))
      return next
    })
  }

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleBulkReturn = async () => {
    if (!canReturnLoan(tab)) {
      toast.error('Bulk return is only available for active loans.')
      return
    }
    const chosen = filtered.filter((r) => selected.has(r.id))
    if (!chosen.length) {
      toast.error('Please select one or more active loans.')
      return
    }
    const alreadyReturned = chosen.filter((r) => r.issueStatus !== 'ISSUED')
    if (alreadyReturned.length) {
      toast.error('This loan has already been returned.')
      return
    }
    setBulkReturning(true)
    try {
      await Promise.all(chosen.map((r) => issuedBookService.returnBook(r.id)))
      toast.success(`${chosen.length} book${chosen.length > 1 ? 's' : ''} returned`)
      setSelected(new Set())
      load()
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    } finally {
      setBulkReturning(false)
    }
  }

  const handleBulkReminder = async () => {
    const chosen = filtered.filter((r) => selected.has(r.id))
    if (!chosen.length) {
      toast.error('Please select one or more active loans.')
      return
    }
    setBulkReminding(true)
    try {
      await Promise.all(chosen.map((r) => issuedBookService.sendReminder(r.id)))
      toast.success(`Reminder${chosen.length > 1 ? 's' : ''} sent to ${chosen.length} member${chosen.length > 1 ? 's' : ''}`)
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    } finally {
      setBulkReminding(false)
    }
  }

  const handleBulkGenerateFine = async () => {
    const chosen = filtered.filter((r) => selected.has(r.id))
    if (!chosen.length) {
      toast.error('Please select one or more active loans.')
      return
    }
    setBulkFining(true)
    try {
      await Promise.all(chosen.map((r) => issuedBookService.generateFine(r.id)))
      toast.success(`Overdue fine${chosen.length > 1 ? 's' : ''} generated for ${chosen.length} loan${chosen.length > 1 ? 's' : ''}`)
      load()
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    } finally {
      setBulkFining(false)
    }
  }

  const handleRemind = async (id) => {
    setRemindingId(id)
    try {
      await issuedBookService.sendReminder(id)
      toast.success('Reminder sent to the member')
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    } finally {
      setRemindingId(null)
    }
  }

  const handleGenerateFine = async (id) => {
    setFiningId(id)
    try {
      const fine = await issuedBookService.generateFine(id)
      toast.success(`Overdue fine of $${Number(fine?.amount || 0).toFixed(2)} generated`)
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    } finally {
      setFiningId(null)
    }
  }

  const exportCsv = () => {
    const header = ['id', 'member', 'email', 'book', 'author', 'isbn', 'issueDate', 'dueDate', 'returnDate', 'status']
    const lines = [header.join(',')]
    filtered.forEach((row) => {
      lines.push(
        [
          row.id,
          `"${(row.memberName || '').replace(/"/g, '""')}"`,
          `"${(row.memberEmail || '').replace(/"/g, '""')}"`,
          `"${(row.bookTitle || '').replace(/"/g, '""')}"`,
          `"${(row.bookAuthor || '').replace(/"/g, '""')}"`,
          `"${(row.bookIsbn || '').replace(/"/g, '""')}"`,
          row.issueDate,
          row.dueDate,
          row.returnDate || '',
          row.issueStatus,
        ].join(','),
      )
    })
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `issued-books${isMember ? '-my' : ''}-${tab || 'all'}.csv`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    toast.success('CSV exported')
  }

  const openPrintReport = (autoPrint) => {
    const label = (ADMIN_TABS.find((t) => t.id === tab)?.label || tab || '').toLowerCase()
    const title = `Circulation ${label} Report`
    const win = window.open('', '_blank', 'width=1100,height=700')
    if (!win) {
      toast.error('Popup blocked. Allow popups and try again.')
      return
    }
    const rowsHtml = filtered
      .map(
        (r) => `
      <tr>
        <td>${escapeHtml(r.bookTitle)}</td>
        <td>${escapeHtml(r.memberName)}</td>
        <td>${r.issueDate || '—'}</td>
        <td>${r.dueDate || '—'}</td>
        <td>${r.returnDate || '—'}</td>
        <td>${r.issueStatus}</td>
      </tr>`,
      )
      .join('')
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #1f2937; padding: 24px; }
    h1 { font-size: 22px; margin: 0 0 4px; }
    .meta { color: #6b7280; font-size: 12px; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { border: 1px solid #d1d5db; padding: 8px 10px; text-align: left; }
    th { background: #f3f4f6; }
    tr:nth-child(even) { background: #f9fafb; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p class="meta">Generated ${new Date().toLocaleString()} · ${filtered.length} record(s)</p>
  <table>
    <thead><tr><th>Book</th><th>Member</th><th>Issue Date</th><th>Due Date</th><th>Return Date</th><th>Status</th></tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>
</body>
</html>`)
    win.document.close()
    win.focus()
    if (autoPrint) {
      setTimeout(() => {
        try {
          win.print()
        } catch {
          // ignore
        }
      }, 400)
    }
  }

  const showCheckboxCol = isSelectableTab

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">
            {isMember ? 'Issued Books' : 'Circulation history'}
          </h1>
          <p className="text-sm text-gray-500">
            {isMember ? 'Your borrowed books and loan status.' : 'Track loans, returns, and exceptions in one ledger.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" type="button" icon={RefreshCw} onClick={load} loading={loading}>
            Refresh
          </Button>
          {!isMember && (
            <>
              <Button variant="secondary" type="button" icon={Download} onClick={exportCsv} disabled={!filtered.length}>
                Export CSV
              </Button>
              <Button variant="secondary" type="button" icon={FileText} onClick={() => openPrintReport(true)} disabled={!filtered.length}>
                Export PDF
              </Button>
              <Button variant="secondary" type="button" icon={Printer} onClick={() => openPrintReport(true)} disabled={!filtered.length}>
                Print Report
              </Button>
            </>
          )}
        </div>
      </div>

      {!isMember ? (
        <>
          <div className="flex flex-wrap gap-2 rounded-2xl border border-gray-100 bg-white p-2 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            {ADMIN_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => changeTab(t.id)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  tab === t.id ? 'bg-primary-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="grid gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 md:grid-cols-2">
            <div className="relative">
              <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                placeholder="Filter by member..."
                className="w-full rounded-xl border border-gray-200 py-2 pl-10 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:border-gray-800 dark:bg-gray-900"
              />
            </div>
            <div className="relative">
              <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={bookFilter}
                onChange={(e) => setBookFilter(e.target.value)}
                placeholder="Filter by book..."
                className="w-full rounded-xl border border-gray-200 py-2 pl-10 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:border-gray-800 dark:bg-gray-900"
              />
            </div>
          </div>

          {tab === 'returned' && (
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300">
                  <Undo2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500">Total Returned Books</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{rows.length}</p>
                </div>
              </div>
              <div className="flex-1 rounded-2xl border border-gray-100 bg-amber-50/60 p-4 text-xs text-amber-800 dark:border-gray-800 dark:bg-amber-950/30 dark:text-amber-300">
                This tab is read-only. Returned loans are shown for history and reporting only — use{' '}
                <strong>Export CSV</strong>, <strong>Export PDF</strong> or <strong>Print Report</strong> to download
                this record set.
              </div>
            </div>
          )}
        </>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <PageSkeleton />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center dark:border-gray-800 dark:bg-gray-900">
          <AlertTriangle className="h-10 w-10 text-amber-500" />
          <p className="mt-3 text-lg font-semibold text-gray-800 dark:text-gray-100">No records</p>
          <p className="mt-1 text-sm text-gray-500">
            {isMember ? "You haven't borrowed any books yet." : 'Switch tabs or relax filters to see more activity.'}
          </p>
          {isMember ? (
            <Button type="button" icon={BookOpen} className="mt-6" onClick={() => navigate('/books')}>
              Browse Books
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          {isSelectableTab && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 bg-primary-50/60 px-4 py-3 dark:border-gray-800 dark:bg-primary-950/30">
              <p className="text-sm font-medium text-primary-800 dark:text-primary-200">
                {selected.size} selected
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="success" type="button" icon={Undo2} loading={bulkReturning} onClick={handleBulkReturn}>
                  Return Selected
                </Button>
                <Button size="sm" variant="secondary" type="button" icon={BellRing} loading={bulkReminding} onClick={handleBulkReminder}>
                  Send Reminder
                </Button>
                {tab === 'overdue' && (
                  <Button size="sm" variant="danger" type="button" icon={Coins} loading={bulkFining} onClick={handleBulkGenerateFine}>
                    Generate Fine
                  </Button>
                )}
              </div>
            </div>
          )}
          <table className="hidden w-full text-sm md:table">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
                {showCheckboxCol && (
                  <th className="w-12 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleAll}
                        aria-label="Select all"
                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </div>
                  </th>
                )}
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400">Book</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400">Member</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400">Dates</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400">Status</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filtered.map((issue) => {
                const overdueDays = issue.issueStatus === 'ISSUED' ? daysOverdue(issue.dueDate) : 0
                const highlight = overdueDays > 0 && issue.issueStatus === 'ISSUED'
                const coverUrl = coverOrSlug(issue.bookCover, issue.bookTitle)
                const isExpanded = expandedId === issue.id
                const canAct = !isMember && !(tab === 'returned')
                return (
                  <Fragment key={issue.id}>
                    <tr
                      className={`transition hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                        highlight ? 'bg-red-50/50 dark:bg-red-950/20' : ''
                      }`}
                    >
                      {showCheckboxCol && (
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selected.has(issue.id)}
                            onChange={() => toggleSelect(issue.id)}
                            aria-label={`Select ${issue.bookTitle || 'record'}`}
                            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <BookCover
                            src={coverUrl}
                            alt={issue.bookTitle || 'Book cover'}
                            className="h-12 w-12 shrink-0 rounded-xl shadow-sm"
                            imgClassName="h-full w-full object-cover"
                          />
                          <div>
                            <div className="font-bold text-gray-900 dark:text-gray-50">{issue.bookTitle}</div>
                            <div className="text-xs opacity-50">{issue.bookAuthor}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {!isMember ? (
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-indigo-600 text-xs font-bold text-white">
                              {initials(issue.memberName)}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900 dark:text-gray-50">{issue.memberName}</div>
                              <div className="text-xs text-gray-500">{issue.memberEmail}</div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">You</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">
                        <p>Issued {issue.issueDate}</p>
                        <p>Due {issue.dueDate}</p>
                        {issue.returnDate ? <p className="text-emerald-600">Returned {issue.returnDate}</p> : null}
                        {issue.returnRequestedAt && !issue.returnDate ? (
                          <p className="font-semibold text-amber-600">Return requested {issue.returnRequestedAt}</p>
                        ) : null}
                        {highlight ? <p className="font-semibold text-red-600">{overdueDays} days overdue</p> : null}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            issue.issueStatus === 'RETURNED'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-100'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-100'
                          }`}
                        >
                          {issue.issueStatus}
                        </span>
                        {issue.returnRequestedAt && issue.issueStatus === 'ISSUED' ? (
                          <span className="ml-1.5 inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                            Return Requested
                          </span>
                        ) : null}
                        {issue.issuedByName ? (
                          <p className="mt-1 text-xs text-gray-400">
                            <User className="mr-1 inline h-3 w-3" />
                            {issue.issuedByName}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setExpandedId(isExpanded ? null : issue.id)}
                            className="rounded-md px-2 py-1 text-xs font-medium text-gray-500 transition hover:bg-gray-100 hover:text-primary-700 dark:hover:bg-gray-800 dark:hover:text-primary-300"
                          >
                            {isExpanded ? 'Hide' : 'details'}
                          </button>
                          {renderActions(issue, canAct)}
                        </div>
                      </td>
                    </tr>
                    {isExpanded ? (
                      <tr className="bg-gray-50/60 dark:bg-gray-800/40">
                        <td colSpan={showCheckboxCol ? 6 : 5} className="px-4 py-3">
                          <div className="grid gap-2 text-xs text-gray-500 sm:grid-cols-3">
                            {issue.bookIsbn ? (
                              <span className="inline-flex items-center gap-1">
                                <Hash className="h-3 w-3" /> ISBN: {issue.bookIsbn}
                              </span>
                            ) : null}
                            {issue.bookCategory ? (
                              <span className="inline-flex items-center gap-1">
                                <BookMarked className="h-3 w-3" /> {issue.bookCategory}
                              </span>
                            ) : null}
                            {issue.bookShelf ? (
                              <span className="inline-flex items-center gap-1">
                                <BookOpen className="h-3 w-3" /> Shelf: {issue.bookShelf}
                              </span>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
                {showCheckboxCol && <th className="px-4 py-3" />}
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400">Book</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400">Member</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400">Dates</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </tfoot>
          </table>

          <div className="space-y-3 p-4 md:hidden">
            {filtered.map((issue) => {
              const overdueDays = issue.issueStatus === 'ISSUED' ? daysOverdue(issue.dueDate) : 0
              const highlight = overdueDays > 0 && issue.issueStatus === 'ISSUED'
              const coverUrl = coverOrSlug(issue.bookCover, issue.bookTitle)
              const isExpanded = expandedId === issue.id
              const canAct = !isMember && !(tab === 'returned')
              return (
                <div
                  key={issue.id}
                  className={`rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 ${
                    highlight ? 'border-red-200 bg-red-50/40 dark:border-red-950 dark:bg-red-950/20' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {showCheckboxCol && (
                      <input
                        type="checkbox"
                        checked={selected.has(issue.id)}
                        onChange={() => toggleSelect(issue.id)}
                        aria-label={`Select ${issue.bookTitle || 'record'}`}
                        className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    )}
                    <BookCover
                      src={coverUrl}
                      alt={issue.bookTitle || 'Book cover'}
                      className="h-14 w-10 shrink-0 rounded-lg shadow-sm"
                      imgClassName="h-full w-full object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-gray-900 dark:text-gray-50">{issue.bookTitle}</p>
                      <p className="text-xs text-gray-500">{issue.bookAuthor}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            issue.issueStatus === 'RETURNED'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-100'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-100'
                          }`}
                        >
                          {issue.issueStatus}
                        </span>
                        {issue.returnRequestedAt && issue.issueStatus === 'ISSUED' ? (
                          <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                            Return Requested
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="font-semibold text-gray-400">Member</p>
                      {!isMember ? (
                        <>
                          <p className="font-medium text-gray-900 dark:text-gray-50">{issue.memberName}</p>
                          <p className="truncate text-gray-500">{issue.memberEmail}</p>
                        </>
                      ) : (
                        <p className="text-gray-500">You</p>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-400">Dates</p>
                      <p className="text-gray-600 dark:text-gray-300">Issued {issue.issueDate}</p>
                      <p className="text-gray-600 dark:text-gray-300">Due {issue.dueDate}</p>
                    </div>
                  </div>
                  {issue.returnDate ? (
                    <p className="mt-2 text-xs text-emerald-600">Returned {issue.returnDate}</p>
                  ) : null}
                  {issue.returnRequestedAt && !issue.returnDate ? (
                    <p className="mt-1 text-xs font-semibold text-amber-600">Return requested {issue.returnRequestedAt}</p>
                  ) : null}
                  {highlight ? (
                    <p className="mt-1 text-xs font-semibold text-red-600">{overdueDays} days overdue</p>
                  ) : null}
                  {issue.issuedByName ? (
                    <p className="mt-1 text-xs text-gray-400">
                      <User className="mr-1 inline h-3 w-3" />
                      {issue.issuedByName}
                    </p>
                  ) : null}

                  {isExpanded ? (
                    <div className="mt-3 grid gap-1.5 rounded-xl bg-gray-50 p-3 text-xs text-gray-500 dark:bg-gray-800/40 sm:grid-cols-3">
                      {issue.bookIsbn ? (
                        <span className="inline-flex items-center gap-1">
                          <Hash className="h-3 w-3" /> ISBN: {issue.bookIsbn}
                        </span>
                      ) : null}
                      {issue.bookCategory ? (
                        <span className="inline-flex items-center gap-1">
                          <BookMarked className="h-3 w-3" /> {issue.bookCategory}
                        </span>
                      ) : null}
                      {issue.bookShelf ? (
                        <span className="inline-flex items-center gap-1">
                          <BookOpen className="h-3 w-3" /> Shelf: {issue.bookShelf}
                        </span>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : issue.id)}
                      className="rounded-md px-2 py-1 text-xs font-medium text-gray-500 transition hover:bg-gray-100 hover:text-primary-700 dark:hover:bg-gray-800 dark:hover:text-primary-300"
                    >
                      {isExpanded ? 'Hide details' : 'Details'}
                    </button>
                    {renderActions(issue, canAct)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}