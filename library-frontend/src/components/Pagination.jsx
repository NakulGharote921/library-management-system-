import { useMemo } from 'react'

const BASE = 'flex items-center justify-center font-medium text-sm focus:outline-none box-border border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-colors'

const ACTIVE = 'flex items-center justify-center font-medium text-sm focus:outline-none box-border border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-700 text-primary-600 dark:text-primary-400 transition-colors'

export default function Pagination({ currentPage = 0, totalPages = 1, onChange }) {
  const pages = useMemo(() => {
    const arr = []
    for (let i = Math.max(0, currentPage - 2); i <= Math.min(totalPages - 1, currentPage + 2); i++) arr.push(i)
    return arr
  }, [currentPage, totalPages])

  if (totalPages <= 1) return null

  const pageClass = (n) => `${n === currentPage ? ACTIVE : BASE} w-9 h-9`
  const edgeClass = `${BASE} px-3 h-9 disabled:opacity-50 disabled:cursor-not-allowed`
  const ellipsis = <li><span className="flex h-9 w-9 items-center justify-center border border-gray-200 bg-white text-sm text-gray-400 dark:border-gray-700 dark:bg-gray-800">…</span></li>

  return (
    <nav className="flex justify-center py-4" aria-label="Page navigation">
      <ul className="flex -space-x-px text-sm">
        <li>
          <button type="button" disabled={currentPage === 0} onClick={() => onChange(currentPage - 1)} className={`${edgeClass} rounded-l-lg`}>
            Previous
          </button>
        </li>
        {pages[0] > 0 && (
          <>
            <li>
              <button type="button" aria-current={currentPage === 0 ? 'page' : undefined} onClick={() => onChange(0)} className={pageClass(0)}>
                1
              </button>
            </li>
            {pages[0] > 1 && ellipsis}
          </>
        )}
        {pages.map((n) => (
          <li key={n}>
            <button type="button" aria-current={n === currentPage ? 'page' : undefined} onClick={() => onChange(n)} className={pageClass(n)}>
              {n + 1}
            </button>
          </li>
        ))}
        {pages[pages.length - 1] < totalPages - 1 && (
          <>
            {pages[pages.length - 1] < totalPages - 2 && ellipsis}
            <li>
              <button type="button" aria-current={currentPage === totalPages - 1 ? 'page' : undefined} onClick={() => onChange(totalPages - 1)} className={pageClass(totalPages - 1)}>
                {totalPages}
              </button>
            </li>
          </>
        )}
        <li>
          <button type="button" disabled={currentPage >= totalPages - 1} onClick={() => onChange(currentPage + 1)} className={`${edgeClass} rounded-r-lg`}>
            Next
          </button>
        </li>
      </ul>
    </nav>
  )
}
