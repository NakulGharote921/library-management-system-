import { API_BASE_URL } from '../services/api.js'

export const DEFAULT_COVER = '/book-covers/default-book.jpeg'

const API_ORIGIN = API_BASE_URL && API_BASE_URL !== '/api' ? API_BASE_URL.replace(/\/api\/?$/, '') : ''

export function resolveCoverUrl(url) {
  if (!url) return DEFAULT_COVER
  if (/^(https?:|data:|blob:)/i.test(url)) return url
  if (url.startsWith('/api/')) {
    return API_ORIGIN ? `${API_ORIGIN}${url}` : url
  }
  return url
}

export function coverSlug(title = '') {
  return String(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function coverUrl(title) {
  const slug = coverSlug(title)
  return slug ? `/book-covers/${slug}.jpeg` : DEFAULT_COVER
}

export function coverOrSlug(existingUrl, title) {
  return existingUrl && !existingUrl.startsWith('/book-covers/')
    ? resolveCoverUrl(existingUrl)
    : coverUrl(title)
}

export function preferCover(book) {
  return coverOrSlug(book?.coverImageUrl, book?.title)
}

export function preloadCover(url) {
  if (!url || typeof window === 'undefined') return
  const img = new Image()
  img.decoding = 'async'
  img.src = resolveCoverUrl(url)
}

export function preloadCovers(urls) {
  urls.forEach(preloadCover)
}
