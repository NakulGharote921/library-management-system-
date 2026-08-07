import axios from 'axios'

function apiBaseUrl() {
  const env = import.meta.env.VITE_API_BASE_URL?.trim()
  if (env) return env.replace(/\/$/, '')
  return 'https://library-management-system-1-fj8q.onrender.com'
}

export const API_BASE_URL = apiBaseUrl()

export const api = axios.create({
  baseURL: apiBaseUrl(),
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

export function getApiErrorMessage(error) {
  if (error?.code === 'ERR_NETWORK' || error?.message === 'Network Error') {
    return `Cannot reach the API at ${apiBaseUrl()}. Make sure the backend is running.`
  }
  const data = error?.response?.data
  if (!data) return error?.message || 'Something went wrong'
  if (data.fieldErrors && typeof data.fieldErrors === 'object') {
    const vals = Object.values(data.fieldErrors).filter(Boolean)
    if (vals.length) return vals.join(' · ')
  }
  if (typeof data.message === 'string' && data.message) return data.message
  if (Array.isArray(data.details) && data.details.length) return data.details.join(' · ')
  return data.error || error.message || 'Request failed'
}

export const bookService = {
  getAll: () => api.get('/books').then((r) => r.data),
  getById: (id) => api.get(`/books/${id}`).then((r) => r.data),
  create: (payload) => api.post('/books', payload).then((r) => r.data),
  update: (id, payload) => api.put(`/books/${id}`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/books/${id}`).then((r) => r.data),
  search: (keyword) => api.get('/books/search', { params: { keyword } }).then((r) => r.data),
  getAvailable: () => api.get('/books/available').then((r) => r.data),
  getByCategoryId: (categoryId) => api.get(`/books/by-category/${categoryId}`).then((r) => r.data),
  uploadCover: (id, file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/books/${id}/cover`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data)
  },
}

export const userService = {
  getAll: () => api.get('/users').then((r) => r.data),
  getPaginated: (params) => api.get('/users/paginated', { params }).then((r) => r.data),
  getOverview: () => api.get('/users/overview').then((r) => r.data),
  getById: (id) => api.get(`/users/${id}`).then((r) => r.data),
  getProfile: (id) => api.get(`/users/${id}/profile`).then((r) => r.data),
  getMemberPayments: (id) => api.get(`/users/${id}/payments`).then((r) => r.data),
  getMemberNotifications: (id) => api.get(`/users/${id}/notifications`).then((r) => r.data),
  getMemberReadingHistory: (id) => api.get(`/users/${id}/reading-history`).then((r) => r.data),
  getMemberReadingStats: (id) => api.get(`/users/${id}/reading-history/stats`).then((r) => r.data),
  getMemberReservations: (id) => api.get(`/users/${id}/reservations`).then((r) => r.data),
  getMemberSubscriptions: (id) => api.get(`/users/${id}/subscriptions`).then((r) => r.data),
  create: (payload) => api.post('/users', payload).then((r) => r.data),
  update: (id, payload) => api.put(`/users/${id}`, payload).then((r) => r.data),
  updateStatus: (id, status) => api.put(`/users/${id}/status`, { status }).then((r) => r.data),
  remove: (id) => api.delete(`/users/${id}`).then((r) => r.data),
  search: (keyword) => api.get('/users/search', { params: { keyword } }).then((r) => r.data),
}

export const issuedBookService = {
  getAll: () => api.get('/issued-books').then((r) => r.data),
  getActive: () => api.get('/issued-books/active').then((r) => r.data),
  getReturned: () => api.get('/issued-books/returned').then((r) => r.data),
  getOverdue: () => api.get('/issued-books/overdue').then((r) => r.data),
  getMyBooks: () => api.get('/issued-books/my').then((r) => r.data),
  getByUser: (userId) => api.get(`/issued-books/user/${userId}`).then((r) => r.data),
  issue: (bookId, userId, issueDate, returnDate) =>
    api.post('/issued-books/issue', { bookId, userId, issueDate, returnDate }).then((r) => r.data),
  returnBook: (id) => api.put(`/issued-books/return/${id}`).then((r) => r.data),
  requestReturn: (id) => api.post(`/issued-books/${id}/return-request`).then((r) => r.data),
  sendReminder: (id) => api.post(`/issued-books/${id}/reminder`).then((r) => r.data),
  generateFine: (id) => api.post(`/issued-books/${id}/generate-fine`).then((r) => r.data),
}

export const borrowBook = (bookId) => api.post(`/books/${bookId}/borrow`).then((r) => r.data)

export const reserveBook = (bookId) => api.post('/reservations', { bookId }).then((r) => r.data)

export const reservationService = {
  getMy: () => api.get('/reservations/my').then((r) => r.data),
  getStats: () => api.get('/reservations/stats').then((r) => r.data),
  getById: (id) => api.get(`/reservations/${id}`).then((r) => r.data),
  getByBook: (bookId) => api.get(`/reservations/book/${bookId}`).then((r) => r.data),
  getQueue: (bookId, reservationId) => api.get(`/reservations/queue/${bookId}`, { params: { reservationId } }).then((r) => r.data),
  getWaitingQueue: (bookId) => api.get(`/reservations/queue/${bookId}/all`).then((r) => r.data),
  create: (bookId) => api.post('/reservations', { bookId }).then((r) => r.data),
  cancel: (id) => api.delete(`/reservations/${id}`).then((r) => r.data),
  markPickup: (id) => api.put(`/reservations/${id}/pickup`).then((r) => r.data),
  approve: (id) => api.post(`/reservations/${id}/approve`).then((r) => r.data),
  adminCancel: (id) => api.put(`/reservations/${id}/cancel`).then((r) => r.data),
  getAll: (params) => api.get('/reservations/admin/all', { params }).then((r) => r.data),
  getAdminStats: () => api.get('/reservations/admin/stats').then((r) => r.data),
  getHistory: (params) => api.get('/reservations/admin/history', { params }).then((r) => r.data),
  overrideQueue: (id, queuePosition) => api.put(`/reservations/admin/${id}/override`, { queuePosition }).then((r) => r.data),
  changePickupTime: (id, pickupExpiryDate) => api.put(`/reservations/admin/${id}/pickup-time`, { pickupExpiryDate }).then((r) => r.data),
  markReady: (id) => api.put(`/reservations/${id}/ready`).then((r) => r.data),
  markComplete: (id) => api.put(`/reservations/${id}/complete`).then((r) => r.data),
  expire: (id) => api.put(`/reservations/${id}/expire`).then((r) => r.data),
  remove: (id) => api.delete(`/reservations/admin/${id}`).then((r) => r.data),
}

export const borrowRequestService = {
  create: (bookId, borrowStartDate, dueDate) => api.post('/borrow-requests', { bookId, borrowStartDate, dueDate }).then((r) => r.data),
  getMy: () => api.get('/borrow-requests/my').then((r) => r.data),
  getAll: (params) => api.get('/borrow-requests/admin/all', { params }).then((r) => r.data),
  getPendingCount: () => api.get('/borrow-requests/admin/pending-count').then((r) => r.data),
  getStats: () => api.get('/borrow-requests/admin/stats').then((r) => r.data),
  getApprovalInfo: (id) => api.get(`/borrow-requests/admin/${id}/approval-info`).then((r) => r.data),
  approve: (id) => api.post(`/borrow-requests/${id}/approve`).then((r) => r.data),
  reject: (id, reason) => api.post(`/borrow-requests/${id}/reject`, { reason }).then((r) => r.data),
  cancel: (id) => api.post(`/borrow-requests/${id}/cancel`).then((r) => r.data),
}

export const auditLogService = {
  getAll: () => api.get('/audit-logs').then((r) => r.data),
}

export const notificationService = {
  getMy: () => api.get('/notifications').then((r) => r.data),
  getUnreadCount: () => api.get('/notifications/unread-count').then((r) => r.data),
  markRead: (id) => api.put(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () => api.put('/notifications/read-all').then((r) => r.data),
}

export const getBookById = (id) => api.get(`/books/${id}`).then((r) => r.data)

export const dashboardService = {
  getStats: () => api.get('/dashboard/stats').then((r) => r.data),
}

export const wishlistService = {
  getMy: () => api.get('/wishlist').then((r) => r.data),
  getFiltered: (params) => api.get('/wishlist/filter', { params }).then((r) => r.data),
  getStats: () => api.get('/wishlist/stats').then((r) => r.data),
  getRecommended: () => api.get('/wishlist/recommended').then((r) => r.data),
  getAnalytics: () => api.get('/wishlist/analytics').then((r) => r.data),
  add: (bookId) => api.post(`/wishlist/${bookId}`).then((r) => r.data),
  remove: (bookId) => api.delete(`/wishlist/${bookId}`),
  updatePriority: (bookId, priority) => api.put(`/wishlist/${bookId}/priority`, { priority }).then((r) => r.data),
  updateNotes: (bookId, notes) => api.put(`/wishlist/${bookId}/notes`, { notes }).then((r) => r.data),
  toggleNotify: (bookId, notify) => api.put(`/wishlist/${bookId}/notify`, { notify }).then((r) => r.data),
}

export const fineService = {
  getMy: () => api.get('/fines/my').then((r) => r.data),
  getUserFines: (userId) => api.get(`/fines/user/${userId}`).then((r) => r.data),
  getAll: () => api.get('/fines').then((r) => r.data),
  waive: (fineId, reason) => api.post(`/fines/${fineId}/waive`, { reason }).then((r) => r.data),
}

export const paymentService = {
  createOrder: (fineId, paymentType = 'FINE') => api.post('/payments/create-order', { fineId, paymentType }).then((r) => r.data),
  createSubscriptionOrder: (subscriptionId) => api.post('/payments/create-subscription-order', { subscriptionId }).then((r) => r.data),
  verify: (razorpayOrderId, razorpayPaymentId, razorpaySignature) =>
    api.post('/payments/verify', { razorpay_order_id: razorpayOrderId, razorpay_payment_id: razorpayPaymentId, razorpay_signature: razorpaySignature }).then((r) => r.data),
  getMy: () => api.get('/payments/my').then((r) => r.data),
  getByOrderId: (orderId) => api.get(`/payments/order/${orderId}`).then((r) => r.data),
  getById: (id) => api.get(`/payments/${id}`).then((r) => r.data),
  getHistory: (params) => api.get('/payments/history', { params }).then((r) => r.data),
  markFailed: (orderId) => api.post(`/payments/${orderId}/failed`).then((r) => r.data),
}

export const subscriptionService = {
  getPlans: () => api.get('/subscription-plans').then((r) => r.data),
  getAllPlans: () => api.get('/subscription-plans/all').then((r) => r.data),
  getPlan: (id) => api.get(`/subscription-plans/${id}`).then((r) => r.data),
  createPlan: (payload) => api.post('/subscription-plans', payload).then((r) => r.data),
  updatePlan: (id, payload) => api.put(`/subscription-plans/${id}`, payload).then((r) => r.data),
  deletePlan: (id) => api.delete(`/subscription-plans/${id}`),
}

export const homeStatsService = {
  get: () => api.get('/public/home-stats').then((r) => r.data),
}

export const userSubscriptionService = {
  purchase: (planId) => api.post(`/subscriptions/purchase/${planId}`).then((r) => r.data),
  activate: (subscriptionId, razorpayOrderId, razorpayPaymentId) =>
    api.post(`/subscriptions/${subscriptionId}/activate`, { razorpayOrderId, razorpayPaymentId }).then((r) => r.data),
  cancel: (subscriptionId) => api.post(`/subscriptions/${subscriptionId}/cancel`),
  getMy: () => api.get('/subscriptions/my').then((r) => r.data),
  getActive: () => api.get('/subscriptions/active').then((r) => r.data),
  getSummary: () => api.get('/subscriptions/summary').then((r) => r.data),
}

export const analyticsService = {
  get: () => api.get('/analytics').then((r) => r.data),
}

export const adminDashboardService = {
  getDashboard: () => api.get('/admin/analytics/dashboard').then((r) => r.data),
  getMonthlyRevenue: (months = 12) => api.get('/admin/analytics/revenue', { params: { months } }).then((r) => r.data),
}

export const readingHistoryService = {
  getMy: (params) => api.get('/reading-history/my', { params }).then((r) => r.data),
  getStats: () => api.get('/reading-history/my/stats').then((r) => r.data),
  getById: (id) => api.get(`/reading-history/${id}`).then((r) => r.data),
  rate: (id, rating) => api.put(`/reading-history/${id}/rating`, { rating }).then((r) => r.data),
  review: (id, review) => api.put(`/reading-history/${id}/review`, { review }).then((r) => r.data),
  getRecommendations: () => api.get('/reading-history/my/recommendations').then((r) => r.data),
}

export default api
