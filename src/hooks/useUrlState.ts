import { useSearchParams } from 'react-router-dom'
import { useCallback } from 'react'

type Primitive = string | number | boolean

/**
 * Like useState, but persisted in the URL search params.
 * Supports string, number, and boolean values.
 * Falls back to `defaultValue` when the param is absent or unparseable.
 */
export function useUrlState<T extends Primitive>(
  key: string,
  defaultValue: T
): [T, (next: T) => void] {
  const [searchParams, setSearchParams] = useSearchParams()

  const raw = searchParams.get(key)

  let value: T
  if (raw === null) {
    value = defaultValue
  } else if (typeof defaultValue === 'boolean') {
    value = (raw === 'true') as unknown as T
  } else if (typeof defaultValue === 'number') {
    const n = Number(raw)
    value = (isNaN(n) ? defaultValue : n) as T
  } else {
    value = raw as T
  }

  const setValue = useCallback(
    (next: T) => {
      setSearchParams(
        (prev) => {
          const updated = new URLSearchParams(prev)
          const str = String(next)
          // Remove param when it matches the default — keeps URLs clean
          if (str === String(defaultValue)) {
            updated.delete(key)
          } else {
            updated.set(key, str)
          }
          return updated
        },
        { replace: true }
      )
    },
    [key, defaultValue, setSearchParams]
  )

  return [value, setValue]
}
