import { useEffect, useState } from 'react'

export default function StatsCard({ title, value, icon: Icon, trend }) {
  const [display, setDisplay] = useState(0)
  const target = Number(value) || 0

  useEffect(() => {
    let frame
    const duration = 650
    const start = performance.now()
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(Math.round(target * eased))
      if (p < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target])

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900">
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary-500/10 blur-2xl transition group-hover:bg-primary-500/20" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50">{display}</p>
          {trend ? <p className="mt-2 text-xs text-emerald-600">{trend}</p> : null}
        </div>
        {Icon ? <Icon className="h-6 w-6 text-primary-600" aria-hidden /> : null}
      </div>
    </div>
  )
}
