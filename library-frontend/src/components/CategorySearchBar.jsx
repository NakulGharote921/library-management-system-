import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Grid3x3, Loader2, RefreshCw, Search, AlertTriangle } from 'lucide-react'

export default function CategorySearchBar({
  categories = [],
  selectedCategory = '',
  onCategoryChange,
  value = '',
  onValueChange,
  placeholder = 'Search...',
  ariaLabel = 'Search',
  onSubmit,
  className = 'mx-auto max-w-2xl',
  loading = false,
  error = null,
  onRetry,
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef(null)
  const inputRef = useRef(null)

  const searchable = categories.length > 10

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return categories
    return categories.filter((c) => (c.label || '').toLowerCase().includes(q))
  }, [categories, query])

  const currentLabel = categories.find((c) => String(c.value) === String(selectedCategory))?.label || 'All categories'

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    if (open && searchable) {
      const t = setTimeout(() => inputRef.current?.focus(), 0)
      return () => clearTimeout(t)
    }
  }, [open, searchable])

  const pick = (v) => {
    setOpen(false)
    setQuery('')
    onCategoryChange?.(v)
  }

  const isEmpty = !loading && !error && categories.length === 0

  return (
    <form
      className={`flex items-stretch shadow-sm ${className}`}
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit?.()
      }}
    >
      <div ref={rootRef} className="relative flex-shrink-0">
        <button
          type="button"
          aria-haspopup="true"
          aria-expanded={open}
          disabled={isEmpty}
          title={isEmpty ? 'No categories available' : ''}
          onClick={() => {
            setQuery('')
            setOpen((o) => !o)
          }}
          className={`inline-flex h-full items-center gap-1.5 rounded-l-lg border border-gray-200 bg-gray-100/70 px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-200 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-100 ${
            open ? 'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100' : ''
          } ${isEmpty ? 'cursor-not-allowed opacity-50 hover:bg-gray-100/70 dark:hover:bg-gray-800' : ''}`}
        >
          <Grid3x3 className="h-4 w-4 flex-shrink-0" />
          <span className="max-w-[6rem] truncate sm:max-w-none">{isEmpty ? 'No Categories Available' : currentLabel}</span>
          <ChevronDown className={`h-4 w-4 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <div className="absolute left-0 top-full z-50 mt-1 w-64 overflow-hidden rounded-xl border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-800">
            {loading ? (
              <div className="flex h-20 flex-col items-center justify-center gap-2 text-gray-400">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-xs font-medium">Loading categories…</span>
              </div>
            ) : error ? (
              <div className="flex h-20 flex-col items-center justify-center gap-2 px-2 text-center">
                <span className="flex items-center gap-1.5 text-xs font-medium text-red-500">
                  <AlertTriangle className="h-4 w-4" /> We couldn&apos;t load categories
                </span>
                {onRetry && (
                  <button
                    type="button"
                    onClick={() => { onRetry(); setOpen(true) }}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-600 transition hover:bg-gray-100 dark:border-gray-200 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    <RefreshCw className="h-3 w-3" /> Try Again
                  </button>
                )}
              </div>
            ) : (
              <>
                {searchable && (
                  <div className="relative mb-1.5">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                    <input
                      ref={inputRef}
                      type="search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search categories..."
                      aria-label="Search categories"
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 py-1.5 pl-8 pr-2 text-xs text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                    />
                  </div>
                )}
                <ul className="max-h-64 space-y-0.5 overflow-y-auto">
                  <li>
                    <button
                      type="button"
                      onClick={() => pick('')}
                      className={`flex h-10 w-full items-center rounded-lg px-3 text-left text-sm font-medium transition-colors hover:bg-primary-600 hover:text-white ${!selectedCategory ? 'bg-primary-600 text-white' : 'text-gray-700 dark:text-gray-300'}`}
                    >
                      All Categories
                    </button>
                  </li>
                  {filtered.map((c) => (
                    <li key={c.value}>
                      <button
                        type="button"
                        onClick={() => pick(c.value)}
                        className={`flex h-10 w-full items-center rounded-lg px-3 text-left text-sm font-medium transition-colors hover:bg-primary-600 hover:text-white ${String(selectedCategory) === String(c.value) ? 'bg-primary-600 text-white' : 'text-gray-700 dark:text-gray-300'}`}
                      >
                        {c.label}
                      </button>
                    </li>
                  ))}
                  {filtered.length === 0 && (
                    <li className="px-3 py-4 text-center text-xs text-gray-400">No categories match "{query}"</li>
                  )}
                </ul>
              </>
            )}
          </div>
        )}
      </div>
      <input
        type="search"
        value={value}
        onChange={(e) => onValueChange?.(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="-ml-px w-full min-w-0 flex-1 border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
      />
      <button
        type="submit"
        aria-label="Search"
        className="-ml-px inline-flex flex-shrink-0 items-center gap-1.5 rounded-r-lg border border-primary-600 bg-primary-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-200"
      >
        <Search className="h-4 w-4" />
        <span className="hidden whitespace-nowrap sm:inline">Search</span>
      </button>
    </form>
  )
}
