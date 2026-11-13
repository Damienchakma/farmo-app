import { useCallback, useEffect, useRef, useState } from 'react'

/* ---------------------------------------------------------------- useAsync */

export interface AsyncState<T> {
  data: T | undefined
  loading: boolean
  error: Error | null
  reload: () => void
  /** Replace the cached value without a round trip (optimistic updates). */
  set: (value: T) => void
}

/**
 * Minimal async-data hook: runs `fn` on mount and whenever `deps` change, keeps
 * the previous value visible while reloading, and cancels stale responses.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [data, setData] = useState<T | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [nonce, setNonce] = useState(0)
  const runId = useRef(0)
  const fnRef = useRef(fn)
  fnRef.current = fn

  useEffect(() => {
    const id = ++runId.current
    let cancelled = false
    setLoading(true)
    setError(null)
    fnRef
      .current()
      .then((value) => {
        if (cancelled || id !== runId.current) return
        setData(value)
      })
      .catch((err: unknown) => {
        if (cancelled || id !== runId.current) return
        setError(err instanceof Error ? err : new Error(String(err)))
      })
      .finally(() => {
        if (cancelled || id !== runId.current) return
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce])

  const reload = useCallback(() => setNonce((n) => n + 1), [])

  return { data, loading, error, reload, set: setData }
}

/* --------------------------------------------------------------- useMedia */

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => (typeof window === 'undefined' ? false : window.matchMedia(query).matches))
  useEffect(() => {
    const mql = window.matchMedia(query)
    const handler = (event: MediaQueryListEvent) => setMatches(event.matches)
    mql.addEventListener('change', handler)
    setMatches(mql.matches)
    return () => mql.removeEventListener('change', handler)
  }, [query])
  return matches
}

/* ------------------------------------------------------------------ misc */

export function useCopyToClipboard(resetMs = 1800): { copied: string | null; copy: (value: string, key?: string) => void } {
  const [copied, setCopied] = useState<string | null>(null)
  const timer = useRef<number | null>(null)

  const copy = useCallback(
    (value: string, key?: string) => {
      const done = () => {
        setCopied(key ?? value)
        if (timer.current) window.clearTimeout(timer.current)
        timer.current = window.setTimeout(() => setCopied(null), resetMs)
      }
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(value).then(done).catch(fallback)
      } else {
        fallback()
      }
      function fallback() {
        const area = document.createElement('textarea')
        area.value = value
        area.style.position = 'fixed'
        area.style.opacity = '0'
        document.body.appendChild(area)
        area.select()
        try {
          document.execCommand('copy')
          done()
        } catch {
          /* clipboard unavailable — the value stays visible for manual copy */
        }
        document.body.removeChild(area)
      }
    },
    [resetMs],
  )

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current)
  }, [])

  return { copied, copy }
}

/** Debounce a rapidly changing value (search fields, resize-driven state). */
export function useDebounced<T>(value: T, ms = 250): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), ms)
    return () => window.clearTimeout(id)
  }, [value, ms])
  return debounced
}

/** Track a CSS media feature for reduced motion so charts can opt out of draw-in. */
export function useReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)')
}
