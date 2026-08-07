import { createContext, useContext } from 'react'

export const CategoryContext = createContext(null)

export function useCategories() {
  const ctx = useContext(CategoryContext)
  if (!ctx) {
    throw new Error('useCategories must be used within a CategoryProvider')
  }
  return ctx
}
