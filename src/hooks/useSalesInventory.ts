import { useCallback, useEffect, useState } from 'react'
import { fetchInventoryView, fetchSalesView } from '../api/salesInventory'
import type { InventoryView, SalesView } from '../types/salesInventory'

export type LoadState<T> =
  | { status: 'loading' }
  | { status: 'ready'; data: T }
  | { status: 'error'; message: string }

const LOADING = { status: 'loading' } as const

function load<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  setState: (state: LoadState<T>) => void,
  signal: AbortSignal,
) {
  fetcher(signal)
    .then((data) => {
      if (!signal.aborted) setState({ status: 'ready', data })
    })
    .catch((error: unknown) => {
      if (signal.aborted) return
      setState({ status: 'error', message: error instanceof Error ? error.message : String(error) })
    })
}

export function valueWhenReady<T>(state: LoadState<T>, pick: (data: T) => string, placeholder = '—'): string {
  return state.status === 'ready' ? pick(state.data) : placeholder
}

export function useSalesInventory(language: string) {
  const [sales, setSales] = useState<LoadState<SalesView>>(LOADING)
  const [inventory, setInventory] = useState<LoadState<InventoryView>>(LOADING)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    load((signal) => fetchSalesView(language, signal), setSales, controller.signal)
    load((signal) => fetchInventoryView(language, signal), setInventory, controller.signal)
    return () => controller.abort()
  }, [attempt, language])

  const reload = useCallback(() => {
    setSales(LOADING)
    setInventory(LOADING)
    setAttempt((value) => value + 1)
  }, [])

  return { sales, inventory, reload }
}
