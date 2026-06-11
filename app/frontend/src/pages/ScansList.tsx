import { useEffect, useMemo, useState } from 'react'
import type { ScanSummary, ScansList as ScansListT } from '@/lib/types'
import { api } from '@/lib/api'
import { ScansTable } from '@/components/ScansTable'
import { RefreshCw } from 'lucide-react'
import { normaliseOutcome } from '@/lib/evalOutcome'

const OUTCOMES = ['ALL', 'ALLOWED', 'BLOCKED', 'WARNING'] as const
type OutcomeFilter = typeof OUTCOMES[number]

export function ScansList() {
  const [scans, setScans] = useState<ScanSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [limit, setLimit] = useState(50)
  const [outcome, setOutcome] = useState<OutcomeFilter>('ALL')
  const [q, setQ] = useState('')

  function fetchScans() {
    setLoading(true); setErr(null)
    api.listScans(limit).then((r: ScansListT) => setScans(r.scans))
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchScans() }, [limit])

  const filtered = useMemo(() => scans.filter((s) => {
    const key = normaliseOutcome(s.eval_outcome)
    if (outcome !== 'ALL' && key !== outcome) return false
    if (q && !s.model_uri.toLowerCase().includes(q.toLowerCase())) return false
    return true
  }), [scans, outcome, q])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Scans</h1>
        <p className="text-sm text-fg-dim mt-1">Recent scans for this tenant. Filter, then click a row for full detail.</p>
      </div>

      <div className="flex items-center gap-3 text-sm">
        <select
          value={outcome} onChange={(e) => setOutcome(e.target.value as OutcomeFilter)}
          className="bg-bg-subtle border border-border rounded-md px-2 py-1 text-xs"
        >
          {OUTCOMES.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <input
          value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter model URI…"
          className="bg-bg-subtle border border-border rounded-md px-2 py-1 text-xs flex-1 font-mono"
        />
        <select
          value={limit} onChange={(e) => setLimit(Number(e.target.value))}
          className="bg-bg-subtle border border-border rounded-md px-2 py-1 text-xs"
        >
          {[20, 50, 100, 200].map((n) => <option key={n} value={n}>Last {n}</option>)}
        </select>
        <button onClick={fetchScans} className="text-fg-dim hover:text-fg" aria-label="Refresh">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {err && <div className="text-danger text-sm">{err}</div>}
      <div className="bg-bg-raised border border-border rounded-lg overflow-hidden">
        <ScansTable scans={filtered} emptyMessage={loading ? 'Loading…' : 'No scans match the filters.'} />
      </div>
      <div className="text-[11px] text-fg-faint">Showing {filtered.length} of {scans.length} scans.</div>
    </div>
  )
}
