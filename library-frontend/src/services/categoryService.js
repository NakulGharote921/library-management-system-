import { api, getApiErrorMessage } from './api.js'

export const categoryService = {
  getAll: async () => {
    const r = await api.get('/categories')
    return r.data
  },
  getById: async (id) => {
    const r = await api.get(`/categories/${id}`)
    return r.data
  },
  create: async (payload) => {
    const r = await api.post('/categories', payload)
    return r.data
  },
  update: async (id, payload) => {
    const r = await api.put(`/categories/${id}`, payload)
    return r.data
  },
  remove: async (id) => {
    const r = await api.delete(`/categories/${id}`)
    return r.data
  },
}

export { getApiErrorMessage }
