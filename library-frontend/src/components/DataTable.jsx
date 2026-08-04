import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import Button from './Button.jsx'

export default function DataTable({
  columns,
  data,
  actions,
  searchKeys,
  pageSize = 8,
  emptyTitle = 'Nothing here yet',
  emptySubtitle = 'Try adjusting filters or add a new record.',
}) {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return data
    return data.filter((row) =>
      (searchKeys || []).some((k) => String(row[k] ?? '').toLowerCase().includes(q)),
    )
  }, [data, query, searchKeys])

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, pages - 1)
  const slice = filtered.slice(currentPage * pageSize, currentPage * pageSize + pageSize)

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(0)
            }}
            placeholder="Search table..."
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-3 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-gray-800 dark:bg-gray-900"
            aria-label="Search table"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>
            {filtered.length} result{filtered.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/80 py-16 text-center dark:border-gray-800 dark:bg-gray-900/40">
          <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">{emptyTitle}</p>
          <p className="mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">{emptySubtitle}</p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 md:block">
            <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
              <thead className="bg-gray-50/80 dark:bg-gray-800/60">
                <tr>
                  {columns.map((c) => (
                    <th
                      key={c.key}
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                    >
                      {c.header}
                    </th>
                  ))}
                  {actions ? (
                    <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Actions
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {slice.map((row, idx) => (
                  <tr
                    key={row.id ?? idx}
                    className={`transition hover:bg-primary-50/40 dark:hover:bg-gray-800/50 ${
                      idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/40 dark:bg-gray-900/80'
                    }`}
                  >
                    {columns.map((c) => (
                      <td key={c.key} className="whitespace-nowrap px-4 py-3 text-gray-800 dark:text-gray-100">
                        {c.render ? c.render(row) : row[c.key]}
                      </td>
                    ))}
                    {actions ? <td className="px-4 py-3 text-right">{actions(row)}</td> : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 md:hidden">
            {slice.map((row, idx) => (
              <div
                key={row.id ?? idx}
                className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
              >
                <dl className="space-y-2">
                  {columns.map((c) => (
                    <div key={c.key} className="flex justify-between gap-3 text-sm">
                      <dt className="text-gray-500">{c.header}</dt>
                      <dd className="text-right font-medium text-gray-900 dark:text-gray-100">
                        {c.render ? c.render(row) : row[c.key]}
                      </dd>
                    </div>
                  ))}
                </dl>
                {actions ? <div className="mt-4 flex justify-end gap-2">{actions(row)}</div> : null}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-gray-500">
              Page {currentPage + 1} of {pages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                type="button"
                disabled={currentPage === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                icon={ChevronLeft}
              >
                Prev
              </Button>
              <Button
                variant="secondary"
                size="sm"
                type="button"
                disabled={currentPage >= pages - 1}
                onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
              >
                Next
                <ChevronRight className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
