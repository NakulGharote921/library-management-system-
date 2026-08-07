import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { DEFAULT_COVER, resolveCoverUrl } from '../utils/bookCovers.js'

const FALLBACK_TIMEOUT = 8000

function BookCoverBase({ src, alt = 'Book cover', className = '', imgClassName = '', eager = false, priority = false }) {
  const resolved = resolveCoverUrl(src)
  const [current, setCurrent] = useState(resolved)
  const [loaded, setLoaded] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const imgRef = useRef(null)

  useEffect(() => {
    setCurrent(resolveCoverUrl(src))
    setLoaded(false)
    setAttempt(0)
  }, [src])

  const finishLoad = useCallback(() => setLoaded(true), [])

  const handleError = useCallback(() => {
    if (current !== DEFAULT_COVER) {
      setAttempt(1)
    } else {
      setLoaded(true)
    }
  }, [current])

  useEffect(() => {
    const img = imgRef.current
    if (!img || !img.complete) return
    if (img.naturalWidth > 0) {
      setLoaded(true)
    } else {
      handleError()
    }
  }, [current, attempt, handleError])

  useEffect(() => {
    if (loaded) return
    const timer = setTimeout(() => {
      const img = imgRef.current
      if (img && img.complete) return
      if (current !== DEFAULT_COVER) {
        setAttempt(1)
      } else {
        setLoaded(true)
      }
    }, FALLBACK_TIMEOUT)
    return () => clearTimeout(timer)
  }, [current, attempt, loaded])

  return (
    <span className={`relative block overflow-hidden bg-gray-100 dark:bg-gray-800 ${className}`}>
      {!loaded && <span className="skeleton absolute inset-0" aria-hidden="true" />}
      <img
        ref={imgRef}
        src={current}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        draggable={false}
        fetchPriority={priority ? 'high' : 'auto'}
        onLoad={finishLoad}
        onError={handleError}
        className={`relative transition-opacity duration-300 ease-out ${
          loaded ? 'visible opacity-100' : 'invisible opacity-0'
        } ${imgClassName}`}
      />
    </span>
  )
}

const BookCover = memo(BookCoverBase)

export default BookCover
