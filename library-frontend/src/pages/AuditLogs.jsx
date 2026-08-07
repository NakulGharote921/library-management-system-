import { useEffect, useState } from 'react'
import { ShieldAlert, RefreshCw, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import Button from '../components/Button.jsx'
import { auditLogService, getApiErrorMessage } from '../services/api.js'

function actionTone(action) {
  const a = (action || '').toUpperCase()
  if (a.includes('DELET')) return 'text-red-600 bg-red-50 dark:bg-red-900/20'
  if (a.includes('REJECT') || a.includes('CANCEL')) return 'text-rose-600 bg-rose-50 dark:bg-rose-900/20'
  if (a.includes('APPROVE') || a.includes('CREATE')) return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20'
  if (a.includes('PAY')) return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20'
  if (a.includes('SUBSCRI')) return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20'
  if (a.includes('RETURN')) return 'text-violet-600 bg-violet-50 dark:bg-violet-900/20'
  return 'text-primary-600 bg-primary-50 dark:bg-primary-900/20'
}

function formatDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function AuditLogs() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      setLogs(await auditLogService.getAll())
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = logs.filter((l) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return [l.action, l.actorName, l.actorEmail, l.details, l.entityType]
      .filter(Boolean).join(' ').toLowerCase().includes(q)
  })

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Audit Logs</h1>
          <p className="text-sm text-gray-500">Track all system actions and changes</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search logs..."
              className="w-56 rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:border-gray-800 dark:bg-gray-900"
              aria-label="Search audit logs"
            />
          </div>
          <Button variant="secondary" size="sm" type="button" icon={RefreshCw} onClick={load}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
          <ShieldAlert className="h-4 w-4 text-primary-600 dark:text-primary-400" />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {filtered.length} audit entr{filtered.length === 1 ? 'y' : 'ies'}
            {loading && <span className="ml-2 text-xs text-gray-400">refreshing...</span>}
          </p>
        </div>
        <div className="overflow-x-auto">
          {!loading && filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">No audit entries found</p>
              <p className="mt-1 text-sm text-gray-500">Actions like approving or rejecting borrow requests are recorded here.</p>
            </div>
          ) : (
            <>
              <table className="hidden w-full text-sm md:table">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Action</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Actor</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Target</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Details</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log) => (
                  <tr key={log.id} className="border-b border-gray-50 transition hover:bg-gray-50 dark:border-gray-800/50 dark:hover:bg-gray-800/30">
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${actionTone(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-800 dark:text-gray-200">{log.actorName || log.actorEmail || 'System'}</p>
                      {log.actorEmail && <p className="text-xs text-gray-400">{log.actorEmail}</p>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600 dark:text-gray-400">
                      {log.entityType}{log.entityId ? ` #${log.entityId}` : ''}
                    </td>
                    <td className="max-w-md px-4 py-3">
                      <p className="truncate text-gray-600 dark:text-gray-300" title={log.details}>{log.details || '—'}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-500">{formatDateTime(log.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="space-y-3 p-4 md:hidden">
              {filtered.map((log) => (
                <div key={log.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                  <div className="flex items-start justify-between gap-3">
                    <span className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${actionTone(log.action)}`}>
                      {log.action}
                    </span>
                    <span className="shrink-0 text-xs text-gray-500">{formatDateTime(log.createdAt)}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="font-semibold text-gray-400">Actor</p>
                      <p className="text-gray-800 dark:text-gray-200">{log.actorName || log.actorEmail || 'System'}</p>
                      {log.actorEmail && <p className="truncate text-gray-400">{log.actorEmail}</p>}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-400">Target</p>
                      <p className="text-gray-600 dark:text-gray-400">{log.entityType}{log.entityId ? ` #${log.entityId}` : ''}</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="font-semibold text-gray-400">Details</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{log.details || '—'}</p>
                  </div>
                </div>
              ))}
            </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
