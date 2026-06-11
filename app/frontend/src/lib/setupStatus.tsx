import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { SetupStatus } from './types'
import { api } from './api'

type Ctx = {
  status: SetupStatus | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

const SetupStatusContext = createContext<Ctx | null>(null)

export function SetupStatusProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SetupStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setStatus(await api.setupStatus())
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  return (
    <SetupStatusContext.Provider value={{ status, loading, error, refresh }}>
      {children}
    </SetupStatusContext.Provider>
  )
}

export function useSetupStatus(): Ctx {
  const ctx = useContext(SetupStatusContext)
  if (!ctx) throw new Error('useSetupStatus must be used within SetupStatusProvider')
  return ctx
}

/** Overall readiness: ready when SDK installed, creds present, and API reachable. */
export function isReady(s: SetupStatus | null): boolean {
  return !!s && s.sdk_installed && s.all_creds_present && s.api_reachable
}
