import { useEffect, useMemo, useState } from 'react'
import type { SecurityRule, SecurityRulesList } from '@/lib/types'
import { api } from '@/lib/api'

const SEVERITY_COLOUR: Record<string, string> = {
  HIGH: 'bg-danger/15 text-danger',
  MEDIUM: 'bg-warn/15 text-warn',
  LOW: 'bg-bg-subtle text-fg-dim',
}

export function Rules() {
  const [rules, setRules] = useState<SecurityRule[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [q, setQ] = useState('')

  useEffect(() => {
    api.listRules().then((r: SecurityRulesList) => setRules(r.security_rules)).catch((e) => setErr(String(e)))
  }, [])

  const filtered = useMemo(() => rules.filter((r) =>
    !q || r.name.toLowerCase().includes(q.toLowerCase()) || (r.description ?? '').toLowerCase().includes(q.toLowerCase())
  ), [rules, q])

  return (
    <div className="space-y-4 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold">Security rules</h1>
        <p className="text-sm text-fg-dim mt-1">
          The complete catalogue of rules the scanner evaluates. Each security group enables some subset of these.
        </p>
      </div>
      {err && <div className="text-danger text-sm">{err}</div>}

      <input
        value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by name or description…"
        className="bg-bg-subtle border border-border rounded-md px-2 py-1.5 text-xs w-full font-mono"
      />

      <div className="bg-bg-raised border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-fg-faint text-[11px] uppercase tracking-wide">
            <tr className="border-b border-border">
              <th className="text-left px-3 py-2 font-normal">Rule</th>
              <th className="text-left px-3 py-2 font-normal">Severity</th>
              <th className="text-left px-3 py-2 font-normal">Description</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const sev = (r.severity ?? '').toUpperCase()
              const colour = SEVERITY_COLOUR[sev] ?? 'bg-bg-subtle text-fg-dim'
              return (
                <tr key={r.uuid} className="border-b border-border/40 align-top">
                  <td className="px-3 py-2 font-medium">{r.name}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${colour}`}>{sev || '—'}</span>
                  </td>
                  <td className="px-3 py-2 text-fg-dim text-xs">{r.description ?? '—'}</td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={3} className="px-3 py-4 text-fg-faint text-sm">No rules match the filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="text-[11px] text-fg-faint">Showing {filtered.length} of {rules.length} rules.</div>
    </div>
  )
}
