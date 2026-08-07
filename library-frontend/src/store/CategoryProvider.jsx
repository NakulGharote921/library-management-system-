import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { categoryService } from '../services/categoryService.js'
import { CategoryContext } from './CategoryContext.js'

export function CategoryProvider({ children }) {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const inFlightRef = useRef(null)

  const refresh = useCallback(async ({ silent = false } = {}) => {
    if (inFlightRef.current) return inFlightRef.current
    if (!silent) setLoading(true)
    const promise = categoryService
      .getAll()
      .then((data) => {
        setCategories(data || [])
        setError(null)
        return data || []
      })
      .catch((err) => {
        setError(err)
        return []
      })
      .finally(() => {
        inFlightRef.current = null
        setLoading(false)
      })
    inFlightRef.current = promise
    return promise
  }, [])

  useEffect(() => {
    let cancelled = false
    categoryService
      .getAll()
      .then((data) => {
        if (cancelled) return
        setCategories(data || [])
        setError(null)
      })
      .catch((err) => {
        if (!cancelled) setError(err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const createCategory = useCallback(async (payload) => {
    const created = await categoryService.create(payload)
    await refresh({ silent: true })
    return created
  }, [refresh])

  const updateCategory = useCallback(async (id, payload) => {
    const updated = await categoryService.update(id, payload)
    await refresh({ silent: true })
    return updated
  }, [refresh])

  const deleteCategory = useCallback(async (id) => {
    await categoryService.remove(id)
    await refresh({ silent: true })
  }, [refresh])

  const value = useMemo(
    () => ({
      categories,
      loading,
      error,
      refresh,
      createCategory,
      updateCategory,
      deleteCategory,
    }),
    [categories, loading, error, refresh, createCategory, updateCategory, deleteCategory],
  )

  return <CategoryContext.Provider value={value}>{children}</CategoryContext.Provider>
}
