import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import Chart from 'chart.js/auto'
import toast from 'react-hot-toast'
import {
  Library, Users, BookOpen, BookMarked, BarChart3,
  AlertTriangle, Clock, RefreshCw, CalendarClock, CreditCard, Percent, Copy,
} from 'lucide-react'
import Button from '../components/Button.jsx'
import { CardSkeleton } from '../components/PageSkeleton.jsx'
import { adminDashboardService, getApiErrorMessage } from '../services/api.js'

const CARD_COLORS = {
  blue: 'from-blue-400 to-blue-600',
  violet: 'from-violet-400 to-violet-600',
  emerald: 'from-emerald-400 to-emerald-600',
  amber: 'from-amber-400 to-amber-600',
  rose: 'from-rose-400 to-rose-600',
  sky: 'from-sky-400 to-sky-600',
  indigo: 'from-indigo-400 to-indigo-600',
}

const METRICS = [
  { key: 'totalBooks', label: 'Total Books', subtitle: 'In catalog', icon: Library, color: CARD_COLORS.blue },
  { key: 'totalMembers', label: 'Total Members', subtitle: 'Registered members', icon: Users, color: CARD_COLORS.violet },
  { key: 'totalCopies', label: 'Total Copies', subtitle: 'Copies owned', icon: Copy, color: CARD_COLORS.indigo },
  { key: 'availableCopies', label: 'Available Copies', subtitle: 'On shelves', icon: BookMarked, color: CARD_COLORS.emerald },
  { key: 'borrowedCopies', label: 'Borrowed Copies', subtitle: 'On loan', icon: BookOpen, color: CARD_COLORS.amber },
  { key: 'activeLoans', label: 'Active Loans', subtitle: 'Currently issued', icon: BarChart3, color: CARD_COLORS.blue },
  { key: 'overdueBooks', label: 'Overdue Books', subtitle: 'Past due date', icon: AlertTriangle, color: CARD_COLORS.rose },
  { key: 'activeReservations', label: 'Active Reservations', subtitle: 'Ready for pickup', icon: CalendarClock, color: CARD_COLORS.amber },
  { key: 'waitingReservations', label: 'Waiting Reservations', subtitle: 'In queue', icon: Clock, color: CARD_COLORS.sky },
  { key: 'activeSubscriptions', label: 'Active Subscriptions', subtitle: 'Paid memberships', icon: CreditCard, color: CARD_COLORS.violet },
  { key: 'overdueRate', label: 'Overdue Rate', subtitle: '% of active loans', icon: Percent, color: CARD_COLORS.rose, format: (v) => `${String(Number(v ?? 0).toFixed(1)).replace(/\.0$/, '')}%` },
]

function formatCurrency(amount) {
  if (amount == null) return '₹0'
  const num = typeof amount === 'number' ? amount : Number(amount)
  return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function MetricCard({ metric, value, loading }) {
  const displayValue = loading
    ? '—'
    : metric.format
      ? metric.format(value)
      : metric.prefix
        ? formatCurrency(value)
        : (value ?? 0) + (metric.suffix ?? '')

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${metric.color} opacity-10 blur-2xl`} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{metric.label}</p>
          <p className={`mt-2 text-3xl font-bold text-gray-900 dark:text-gray-50 ${loading ? 'animate-pulse' : ''}`}>
            {displayValue}
          </p>
          <p className="mt-1 text-xs text-gray-500">{metric.subtitle}</p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${metric.color} text-white shadow-inner`}>
          <metric.icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  )
}

function RevenueChart() {
  const canvasRef = useRef(null)
  const [range, setRange] = useState('6m')
  const [series, setSeries] = useState(null)
  const [chartLoading, setChartLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    adminDashboardService
      .getMonthlyRevenue(12)
      .then((points) => {
        if (cancelled) return
        setSeries(points)
        setChartLoading(false)
      })
      .catch((e) => {
        if (cancelled) return
        setChartLoading(false)
        toast.error(getApiErrorMessage(e))
      })
    return () => {
      cancelled = true
    }
  }, [])

  const chartData = useMemo(() => {
    if (!series) return { labels: [], values: [] }
    const count = range === '6m' ? 6 : 12
    const slice = series.slice(-count)
    return {
      labels: slice.map((p) => p.month),
      values: slice.map((p) => Number(p.revenue) || 0),
    }
  }, [series, range])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || chartLoading) return
    const ctx = canvas.getContext('2d')
    const gradient = ctx.createLinearGradient(0, 0, 0, 256)
    gradient.addColorStop(0, 'rgba(129, 140, 248, 0.3)')
    gradient.addColorStop(1, 'rgba(129, 140, 248, 0)')
    const chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: chartData.labels,
        datasets: [
          {
            label: 'Revenue',
            data: chartData.values,
            borderColor: '#818cf8',
            backgroundColor: gradient,
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: '#818cf8',
            pointHoverBorderColor: '#111827',
            pointHoverBorderWidth: 2,
            tension: 0.35,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (item) => `₹${Number(item.parsed.y).toLocaleString('en-IN')}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#9ca3af' },
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(255, 255, 255, 0.1)' },
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
  }, [chartData, chartLoading])

  return (
    <section className="rounded-lg border border-gray-800 bg-gray-900 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-white">Monthly revenue</h2>

        <div className="inline-flex rounded-md border border-gray-700 p-0.5 text-xs font-medium">
          {['6m', '12m'].map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={range === r}
              onClick={() => setRange(r)}
              className={`rounded-sm px-2 py-1 transition ${
                range === r ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {r === '6m' ? '6M' : '12M'}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 h-64">
        {chartLoading ? (
          <div className="h-full animate-pulse rounded bg-gray-800" />
        ) : (
          <canvas ref={canvasRef} role="img" aria-label="Monthly revenue, line chart" />
        )}
      </div>

      <table className="sr-only" aria-live="polite">
        <caption>Monthly revenue by month</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Revenue</th>
          </tr>
        </thead>
        <tbody>
          {chartData.labels.map((label, i) => (
            <tr key={label}>
              <th scope="row">{label}</th>
              <td>{formatCurrency(chartData.values[i])}</td>
            </tr>
          ))}
        </tbody>
      </table>
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

export default function Analytics() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await adminDashboardService.getDashboard()
      setData(res)
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    ;(async () => {
      load()
    })()
    const onRefresh = () => {
      setLoading(true)
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
        <Button variant="secondary" type="button" icon={RefreshCw} onClick={load} loading={loading}>
          Refresh
        </Button>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {loading
          ? METRICS.map((_, i) => <CardSkeleton key={i} />)
          : METRICS.map((m) => (
              <MetricCard key={m.key} metric={m} value={data?.[m.key]} loading={false} />
            ))
        }
      </section>

      <RevenueChart />

      <MostBorrowedSection data={data} />
    </div>
  )
}
