import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Datepicker } from 'flowbite-react'
import { BookMarked, Calendar, CheckCircle2, Search, User } from 'lucide-react'
import Button from '../components/Button.jsx'
import PageSkeleton from '../components/PageSkeleton.jsx'
import Stepper, { Step } from '../components/Reactbites/src/component/Reactbites/Stepper.jsx'
import { bookService, getApiErrorMessage, issuedBookService, userService } from '../services/api.js'

function initials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

function toDateInputValue(date) {
  return date.toISOString().split('T')[0]
}

export default function IssueBook() {
  const [step, setStep] = useState(1)
  const [stepperKey, setStepperKey] = useState(0)
  const [initialStep, setInitialStep] = useState(1)
  const [users, setUsers] = useState([])
  const [books, setBooks] = useState([])
  const [userQuery, setUserQuery] = useState('')
  const [bookQuery, setBookQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [selectedBook, setSelectedBook] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [recent, setRecent] = useState([])

  const defaultDue = new Date()
  defaultDue.setDate(defaultDue.getDate() + 14)
  const [issueDate, setIssueDate] = useState(new Date())
  const [returnDate, setReturnDate] = useState(defaultDue)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [u, b, allIssues] = await Promise.all([
          userService.getAll(),
          bookService.getAvailable(),
          issuedBookService.getAll(),
        ])
        if (!cancelled) {
          setUsers(u)
          setBooks(b)
          setRecent([...allIssues].sort((a, b) => new Date(b.issueDate) - new Date(a.issueDate)).slice(0, 5))
        }
      } catch (e) {
        if (!cancelled) toast.error(getApiErrorMessage(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const filteredUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
  }, [users, userQuery])

  const filteredBooks = useMemo(() => {
    const q = bookQuery.trim().toLowerCase()
    if (!q) return books
    return books.filter((b) => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q))
  }, [books, bookQuery])

  const submit = async () => {
    if (!selectedUser || !selectedBook) {
      toast.error('Select both a user and a book')
      return
    }
    setSubmitting(true)
    try {
      await issuedBookService.issue(selectedBook.id, selectedUser.id, toDateInputValue(issueDate), toDateInputValue(returnDate))
      toast.success('Book issued successfully')
      window.dispatchEvent(new CustomEvent('dashboard:refresh'))
      setDone(true)
      const [b, allIssues] = await Promise.all([bookService.getAvailable(), issuedBookService.getAll()])
      setBooks(b)
      setRecent(allIssues.slice(0, 5))
      setTimeout(() => {
        setDone(false)
        setStep(1)
        setInitialStep(1)
        setStepperKey((k) => k + 1)
        setSelectedUser(null)
        setSelectedBook(null)
        setIssueDate(new Date())
        setReturnDate(defaultDue)
      }, 1600)
    } catch (e) {
      toast.error(getApiErrorMessage(e))
      setInitialStep(3)
      setStepperKey((k) => k + 1)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <PageSkeleton />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Issue a book</h1>
        <p className="text-sm text-gray-500">Select user, pick a book, then set dates.</p>
      </div>

      <div className="rounded-[22px] bg-white shadow-xl dark:bg-gray-950">
        {done ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center animate-scaleIn">
              <CheckCircle2 className="h-14 w-14 text-emerald-500" />
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-50">Issue recorded</p>
              <p className="text-sm text-gray-500">The catalog availability has been updated automatically.</p>
            </div>
          ) : (
            <Stepper
              key={stepperKey}
              className="w-full p-4"
              initialStep={initialStep}
              onStepChange={setStep}
              onFinalStepCompleted={submit}
              stepCircleContainerClassName="!max-w-full bg-white !rounded-[22px] shadow-xl dark:bg-gray-950"
              completeButtonText="Issue book"
              nextButtonText="Continue"
              backButtonText="Back"
              nextButtonProps={{
                disabled: step === 1 ? !selectedUser : step === 2 ? !selectedBook : submitting || !issueDate || !returnDate,
              }}
            >
              <Step>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-100">
                    <User className="h-4 w-4 text-primary-600" />
                    Select user
                  </div>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      value={userQuery}
                      onChange={(e) => setUserQuery(e.target.value)}
                      placeholder="Search users..."
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-3 text-sm focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-100 dark:border-gray-800 dark:bg-gray-900"
                    />
                  </div>
                  <div className="grid max-h-72 gap-2 overflow-y-auto md:grid-cols-2">
                    {filteredUsers.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => setSelectedUser(u)}
                        className={`flex items-center gap-3 rounded-xl border px-3 py-3 text-left text-sm transition ${
                          selectedUser?.id === u.id
                            ? 'border-primary-500 bg-primary-50 text-primary-900 dark:bg-primary-950/40'
                            : 'border-gray-100 hover:border-primary-200 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900'
                        }`}
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-indigo-600 text-xs font-bold text-white">
                          {initials(u.name)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-gray-50">{u.name}</p>
                          <p className="text-xs text-gray-500">{u.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </Step>

              <Step>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-100">
                    <BookMarked className="h-4 w-4 text-primary-600" />
                    Select available book
                  </div>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      value={bookQuery}
                      onChange={(e) => setBookQuery(e.target.value)}
                      placeholder="Filter catalog..."
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-3 text-sm focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-100 dark:border-gray-800 dark:bg-gray-900"
                    />
                  </div>
                  <div className="grid max-h-80 gap-3 overflow-y-auto md:grid-cols-2">
                    {filteredBooks.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setSelectedBook(b)}
                        className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                          selectedBook?.id === b.id
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/40'
                            : 'border-gray-100 hover:border-primary-200 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900'
                        }`}
                      >
                        <p className="font-semibold text-gray-900 dark:text-gray-50">{b.title}</p>
                        <p className="text-xs text-gray-500">{b.author}</p>
                        <p className="mt-2 text-xs font-medium text-emerald-600">{b.availableCopies} copies left</p>
                      </button>
                    ))}
                  </div>
                </div>
              </Step>

              <Step>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-100">
                    <Calendar className="h-4 w-4 text-primary-600" />
                    Set dates
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-4">
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-gray-500">Issue date</label>
                        <Datepicker value={issueDate} onChange={setIssueDate} />
                      </div>
                      <div className="flex gap-2">
                        <Button size="xs" type="button" onClick={() => setIssueDate(new Date())}>
                          Set to Today
                        </Button>
                        <Button size="xs" variant="secondary" type="button" onClick={() => setIssueDate(null)}>
                          Clear
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-col gap-4">
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-gray-500">Return date</label>
                        <Datepicker value={returnDate} onChange={setReturnDate} />
                      </div>
                      <div className="flex gap-2">
                        <Button size="xs" type="button" onClick={() => setReturnDate(new Date())}>
                          Set to Today
                        </Button>
                        <Button size="xs" variant="secondary" type="button" onClick={() => setReturnDate(null)}>
                          Clear
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Step>
            </Stepper>
          )}
        </div>

      {(selectedUser || selectedBook) && !done ? (
        <div className="grid gap-4 md:grid-cols-2">
          {selectedUser ? (
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">User</p>
              <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-50">{selectedUser.name}</p>
              <p className="text-sm text-gray-500">{selectedUser.email}</p>
            </div>
          ) : null}
          {selectedBook ? (
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Book</p>
              <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-50">{selectedBook.title}</p>
              <p className="text-sm text-gray-500">{selectedBook.author}</p>
              <p className="mt-3 text-xs text-gray-500">
                Issue {issueDate ? toDateInputValue(issueDate) : '—'} · Due {returnDate ? toDateInputValue(returnDate) : '—'}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Recent issues</h2>
        <p className="text-sm text-gray-500">Latest circulation events across the library.</p>
        <ul className="mt-4 space-y-3">
          {recent.map((issue) => (
            <li key={issue.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-100 bg-gray-50/70 px-4 py-3 text-sm dark:border-gray-800 dark:bg-gray-800/40">
              <div>
                <p className="font-semibold text-gray-900 dark:text-gray-50">{issue.bookTitle || issue.book?.title}</p>
                <p className="text-xs text-gray-500">{issue.memberName || issue.user?.name}</p>
              </div>
              <span className="text-xs text-gray-500">{issue.issueDate}</span>
            </li>
          ))}
          {recent.length === 0 ? <p className="text-sm text-gray-500">No issues yet.</p> : null}
        </ul>
      </section>
    </div>
  )
}
