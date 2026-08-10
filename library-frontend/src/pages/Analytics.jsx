import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import Chart from 'chart.js/auto'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import {
  BookOpen, RefreshCw, ArrowRight, ChevronDown, Download, Info, TrendingDown, TrendingUp,
} from 'lucide-react'
import Button from '../components/Button.jsx'
import { adminDashboardService, getApiErrorMessage, paymentService } from '../services/api.js'

function formatCurrency(amount) {
  if (amount == null) return '₹0'
  const num = typeof amount === 'number' ? amount : Number(amount)
  return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const RANGE_DAYS = { Yesterday: 1, Today: 1, 'Last 7 days': 7, 'Last 30 days': 30, 'Last 90 days': 90 }

function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function ymd(date) {
  const d = new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function RevenueReportCard() {
  const cardRef = useRef(null)
  const canvasRef = useRef(null)
  const [payments, setPayments] = useState([])
  const [paymentsLoading, setPaymentsLoading] = useState(true)
  const [range, setRange] = useState('Last 30 days')
  const [rangeOpen, setRangeOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    paymentService
      .getHistory({ status: 'SUCCESS' })
      .then((list) => {
        if (cancelled) return
        setPayments(list || [])
        setPaymentsLoading(false)
      })
      .catch((e) => {
        if (cancelled) return
        setPaymentsLoading(false)
        toast.error(getApiErrorMessage(e))
      })
    return () => {
      cancelled = true
    }
  }, [])

  const derived = useMemo(() => {
    const now = new Date()
    const today = startOfDay(now)
    const days = RANGE_DAYS[range] ?? 30
    const start = range === 'Yesterday' ? addDays(today, -1) : range === 'Today' ? today : addDays(today, -(days - 1))
    const endDate = range === 'Yesterday' || range === 'Today' ? start : today
    const windowEnd = addDays(endDate, 1)

    const inWindow = payments.filter((p) => {
      if (!p.completedAt) return false
      const t = new Date(p.completedAt)
      return t >= start && t < windowEnd
    })

    let subscriptions = 0
    let fines = 0
    for (const p of inWindow) {
      const amount = Number(p.amount || 0)
      if (p.paymentType === 'SUBSCRIPTION') subscriptions += amount
      else fines += amount
    }
    const total = subscriptions + fines

    const prevStart = addDays(start, -days)
    const prevEnd = addDays(start, -1)
    const prevTotal = payments
      .filter((p) => {
        if (!p.completedAt) return false
        const t = new Date(p.completedAt)
        return t >= prevStart && t < addDays(prevEnd, 1)
      })
      .reduce((sum, p) => sum + Number(p.amount || 0), 0)
    const growth = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : null

    const buckets = []
    for (let d = new Date(start); d <= endDate; d = addDays(d, 1)) {
      const key = ymd(d)
      buckets.push({ key, label: d.getDate(), value: 0 })
    }
    const bucketMap = new Map(buckets.map((b) => [b.key, b]))
    for (const p of inWindow) {
      const key = ymd(new Date(p.completedAt))
      if (bucketMap.has(key)) bucketMap.get(key).value += Number(p.amount || 0)
    }

    return { total, subscriptions, fines, growth, buckets }
  }, [payments, range])

  useEffect(() => {
    const handle = (e) => {
      if (cardRef.current && !cardRef.current.contains(e.target)) setRangeOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || paymentsLoading) return
    const chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: derived.buckets.map((b) => b.label),
        datasets: [
          {
            data: derived.buckets.map((b) => b.value),
            backgroundColor: '#6366f1',
            borderRadius: 4,
            maxBarThickness: 28,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (item) => ` Revenue: ₹${Number(item.parsed.y).toLocaleString('en-IN')}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#9ca3af', maxRotation: 0 },
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(100, 116, 139, 0.12)' },
            ticks: {
              color: '#9ca3af',
              callback: (tickValue) => `₹${Math.round(Number(tickValue) / 1000)}k`,
            },
          },
        },
      },
    })
    return () => {
      chart.destroy()
    }
  }, [derived, paymentsLoading])

  const growthPositive = derived.growth != null && derived.growth >= 0

  return (
    <section ref={cardRef} className="relative rounded-2xl border border-gray-100 bg-white p-4 shadow-sm md:p-6 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-700">
        <dl>
          <dt className="text-sm text-gray-500 dark:text-gray-400">Revenue</dt>
          <dd className="text-2xl font-semibold text-gray-900 dark:text-gray-50">{formatCurrency(derived.total)}</dd>
        </dl>
        {derived.growth != null && (
          <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium ${
            growthPositive
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
          }`}>
            {growthPositive ? <TrendingUp className="me-1 h-4 w-4" /> : <TrendingDown className="me-1 h-4 w-4" />}
            Growth {Math.abs(derived.growth).toFixed(1)}%
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 py-3">
        <dl>
          <dt className="text-sm text-gray-500 dark:text-gray-400">Subscriptions</dt>
          <dd className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">+{formatCurrency(derived.subscriptions)}</dd>
        </dl>
        <dl>
          <dt className="text-sm text-gray-500 dark:text-gray-400">Fines</dt>
          <dd className="text-lg font-semibold text-rose-600 dark:text-rose-400">{formatCurrency(derived.fines)}</dd>
        </dl>
      </div>

      <div className="h-48">
        {paymentsLoading ? (
          <div className="h-full animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
        ) : (
          <canvas ref={canvasRef} role="img" aria-label="Revenue by day, bar chart" />
        )}
      </div>

      <div className="grid grid-cols-1 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between pt-4 md:pt-6">
          <div className="relative">
            <button
              type="button"
              onClick={() => setRangeOpen(!rangeOpen)}
              className="inline-flex items-center text-center text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
            >
              {range}
              <ChevronDown className="ms-1.5 h-4 w-4" />
            </button>
            {rangeOpen && (
              <div className="absolute end-0 top-full z-10 mt-2 w-44 rounded-xl border border-gray-100 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                <ul className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  {RANGE_OPTIONS.map((r) => (
                    <li key={r}>
                      <button
                        type="button"
                        onClick={() => { setRange(r); setRangeOpen(false) }}
                        className="inline-flex w-full items-center rounded-lg p-2 text-left transition hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-gray-50"
                      >
                        {r}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <Link to="/report" className="inline-flex items-center rounded-lg border border-transparent px-3 py-2 text-sm font-medium text-primary-600 transition hover:bg-gray-100 focus:outline-none focus:ring-4 focus:ring-gray-100 dark:text-primary-400 dark:hover:bg-gray-800">
            Revenue Report
            <ArrowRight className="-me-0.5 ms-1.5 h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}

function MostBorrowedSection({ data }) {
  const books = data?.mostBorrowed ?? []
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-primary-600" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Most Borrowed Books</h2>
      </div>
      <div className="mt-4 space-y-3">
        {books.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-500">No borrowing data yet.</p>
        ) : (
          books.map((book, i) => (
            <div key={book.title} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/40">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">{book.title}</p>
                  <p className="text-xs text-gray-500">{book.author}</p>
                </div>
              </div>
              <div className="text-right text-xs">
                <p className="font-semibold text-gray-800 dark:text-gray-200">{book.borrowed} borrowed</p>
                <p className="text-gray-500">{book.available} available</p>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  )
}

const CIRCULATION_SEGMENTS = [
  { key: 'available', label: 'Available', color: '#10b981' },
  { key: 'onLoan', label: 'On Loan', color: '#f59e0b' },
  { key: 'overdue', label: 'Overdue', color: '#f43f5e' },
]

const RANGE_OPTIONS = ['Yesterday', 'Today', 'Last 7 days', 'Last 30 days', 'Last 90 days']

function CirculationCard({ data }) {
  const cardRef = useRef(null)
  const canvasRef = useRef(null)
  const [visible, setVisible] = useState({ available: true, onLoan: true, overdue: true })
  const [range, setRange] = useState('Last 7 days')
  const [rangeOpen, setRangeOpen] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const [downloadTip, setDownloadTip] = useState(false)

  const { segments, total } = useMemo(() => {
    const borrowed = Math.max(0, Number(data?.borrowedCopies ?? 0))
    const overdue = Math.max(0, Number(data?.overdueBooks ?? 0))
    const available = Math.max(0, Number(data?.availableCopies ?? 0))
    const onLoan = Math.max(0, borrowed - overdue)
    const values = { available, onLoan, overdue }
    return {
      total: available + borrowed,
      segments: CIRCULATION_SEGMENTS.map((s) => ({ ...s, value: values[s.key] })).filter(
        (s) => visible[s.key] && s.value > 0
      ),
    }
  }, [data, visible])

  useEffect(() => {
    const handle = (e) => {
      if (cardRef.current && !cardRef.current.contains(e.target)) {
        setRangeOpen(false)
        setInfoOpen(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const chart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: segments.map((s) => s.label),
        datasets: [
          {
            data: segments.map((s) => s.value),
            backgroundColor: segments.map((s) => s.color),
            borderColor: '#ffffff',
            borderWidth: 2,
            hoverOffset: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (item) => ` ${item.label}: ${item.parsed} copies`,
            },
          },
        },
      },
    })
    return () => {
      chart.destroy()
    }
  }, [segments])

  return (
    <section ref={cardRef} className="relative rounded-2xl border border-gray-100 bg-white p-4 shadow-sm md:p-6 dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center">
          <h5 className="me-1 text-xl font-semibold text-gray-900 dark:text-gray-50">Book Circulation</h5>
          <button
            type="button"
            onClick={() => setInfoOpen(!infoOpen)}
            aria-expanded={infoOpen}
            aria-label="About this chart"
            className="ms-1 cursor-pointer text-gray-400 transition hover:text-gray-900 dark:hover:text-gray-50"
          >
            <Info className="h-4 w-4" />
          </button>
        </div>
        <div className="relative">
          <button
            type="button"
            onMouseEnter={() => setDownloadTip(true)}
            onMouseLeave={() => setDownloadTip(false)}
            className="hidden h-9 w-9 items-center justify-center rounded-lg border border-transparent text-sm font-medium text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-4 focus:ring-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-50 sm:inline-flex"
            aria-label="Download data"
          >
            <Download className="h-5 w-5" />
          </button>
          {downloadTip && (
            <div className="absolute end-0 top-full z-10 mt-2 whitespace-nowrap rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white shadow-sm dark:bg-gray-100 dark:text-gray-900">
              Download CSV
            </div>
          )}
        </div>
      </div>

      {infoOpen && (
        <div className="absolute start-4 top-16 z-10 w-72 rounded-xl border border-gray-100 bg-white p-3 text-sm text-gray-600 shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
          <h3 className="mb-2 font-semibold text-gray-900 dark:text-gray-50">About this chart</h3>
          <p className="mb-4">Breakdown of the library catalog: copies available on shelves, currently on loan, and overdue. Toggle the filters to show or hide each segment.</p>
          <h3 className="mb-2 font-semibold text-gray-900 dark:text-gray-50">Definition</h3>
          <p className="mb-4">Available copies are on the shelves, on-loan copies are borrowed by members, and overdue copies are borrowed copies past their return date.</p>
          <Link to="/report" onClick={() => setInfoOpen(false)} className="inline-flex items-center font-medium text-primary-600 hover:underline dark:text-primary-400">
            Read more
            <ArrowRight className="ms-1 h-4 w-4" />
          </Link>
        </div>
      )}

      <div className="flex flex-wrap">
        {CIRCULATION_SEGMENTS.map((s) => (
          <div key={s.key} className="me-4 flex items-center">
            <input
              id={`circ-${s.key}`}
              type="checkbox"
              checked={visible[s.key]}
              onChange={() => setVisible((prev) => ({ ...prev, [s.key]: !prev[s.key] }))}
              className="h-4 w-4 rounded border border-gray-300 bg-white accent-primary-600 focus:ring-2 focus:ring-primary-300 dark:border-gray-600 dark:bg-gray-800"
            />
            <label htmlFor={`circ-${s.key}`} className="ms-2 select-none text-sm font-medium text-gray-900 dark:text-gray-50">
              {s.label}
            </label>
          </div>
        ))}
      </div>

      <div className="py-4">
        <div className="relative mx-auto h-48">
          {segments.length === 0 ? (
            <p className="flex h-full items-center justify-center text-sm text-gray-400">Select a category to view</p>
          ) : (
            <canvas ref={canvasRef} role="img" aria-label="Circulation breakdown, donut chart" />
          )}
          {segments.length > 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{total}</p>
                <p className="text-xs text-gray-500">copies</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between pt-4 md:pt-6">
          <div className="relative">
            <button
              type="button"
              onClick={() => setRangeOpen(!rangeOpen)}
              className="inline-flex items-center text-center text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
            >
              {range}
              <ChevronDown className="ms-1.5 h-4 w-4" />
            </button>
            {rangeOpen && (
              <div className="absolute end-0 top-full z-10 mt-2 w-44 rounded-xl border border-gray-100 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                <ul className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  {RANGE_OPTIONS.map((r) => (
                    <li key={r}>
                      <button
                        type="button"
                        onClick={() => { setRange(r); setRangeOpen(false) }}
                        className="inline-flex w-full items-center rounded-lg p-2 text-left transition hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-gray-50"
                      >
                        {r}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <Link to="/report" className="inline-flex items-center rounded-lg border border-transparent px-3 py-2 text-sm font-medium text-primary-600 transition hover:bg-gray-100 focus:outline-none focus:ring-4 focus:ring-gray-100 dark:text-primary-400 dark:hover:bg-gray-800">
            Full analysis
            <ArrowRight className="-me-0.5 ms-1.5 h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}

export default function Analytics() {
  const [data, setData] = useState(null)

  const load = useCallback(async () => {
    try {
      const res = await adminDashboardService.getDashboard()
      setData(res)
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    }
  }, [])

  useEffect(() => {
    ;(async () => {
      load()
    })()
    const onRefresh = () => {
      load()
    }
    window.addEventListener('dashboard:refresh', onRefresh)
    window.addEventListener('focus', onRefresh)
    return () => {
      window.removeEventListener('dashboard:refresh', onRefresh)
      window.removeEventListener('focus', onRefresh)
    }
  }, [load])

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Admin Analytics</h1>
          <p className="text-sm text-gray-500">Library performance dashboard</p>
        </div>
        <Button variant="secondary" type="button" icon={RefreshCw} onClick={load}>
          Refresh
        </Button>
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        <RevenueReportCard />
        <CirculationCard data={data} />
      </section>

      <MostBorrowedSection data={data} />
    </div>
  )
}
