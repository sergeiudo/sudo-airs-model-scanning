import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import type { ScanSummary } from '@/lib/types'
import { normaliseOutcome } from '@/lib/evalOutcome'

const OUTCOME_COLOUR: Record<string, string> = {
  ALLOWED: 'bg-success/15 text-success',
  BLOCKED: 'bg-danger/15 text-danger',
  WARNING: 'bg-warn/15 text-warn',
}

export function ScansTable({
  scans,
  rowAction,
  emptyMessage = 'No scans yet.',
}: {
  scans: ScanSummary[]
  rowAction?: (scan: ScanSummary) => ReactNode
  emptyMessage?: string
}) {
  if (scans.length === 0) {
    return <div className="text-sm text-fg-faint p-4">{emptyMessage}</div>
  }
  return (
    <table className="w-full text-sm">
      <thead className="text-fg-faint text-[11px] uppercase tracking-wide">
        <tr className="border-b border-border">
          <th className="text-left px-3 py-2 font-normal">Verdict</th>
          <th className="text-left px-3 py-2 font-normal">Model URI</th>
          <th className="text-left px-3 py-2 font-normal">Rules</th>
          <th className="text-left px-3 py-2 font-normal">Created</th>
          <th className="text-left px-3 py-2 font-normal">Scan UUID</th>
          {rowAction && <th className="text-right px-3 py-2 font-normal">·</th>}
        </tr>
      </thead>
      <tbody>
        {scans.map((s) => {
          const key = normaliseOutcome(s.eval_outcome)
          const colour = OUTCOME_COLOUR[key] ?? 'bg-bg-subtle text-fg-dim'
          const summary = s.eval_summary
          return (
            <tr key={s.uuid} className="border-b border-border/40 hover:bg-bg-subtle/40">
              <td className="px-3 py-2">
                <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${colour}`}>{key || '—'}</span>
              </td>
              <td className="px-3 py-2 font-mono text-xs truncate max-w-sm">
                <Link to={`/scans/${s.uuid}`} className="hover:underline">{s.model_uri}</Link>
              </td>
              <td className="px-3 py-2 font-mono text-xs text-fg-dim">
                {summary ? `${summary.rules_passed}/${summary.total_rules}` : '—'}
              </td>
              <td className="px-3 py-2 text-fg-dim text-xs">{s.created_at?.replace('T', ' ').slice(0, 19) ?? '—'}</td>
              <td className="px-3 py-2 font-mono text-[10px] text-fg-faint">{s.uuid.slice(0, 8)}…</td>
              {rowAction && <td className="px-3 py-2 text-right">{rowAction(s)}</td>}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
