import type { Evaluation } from '@/lib/types'

const OUTCOME: Record<string, string> = {
  PASSED: 'bg-success/15 text-success',
  FAILED: 'bg-danger/15 text-danger',
}

export function EvaluationsTable({ evaluations }: { evaluations: Evaluation[] }) {
  if (evaluations.length === 0) {
    return <div className="text-xs text-fg-faint p-4">No per-rule evaluations returned.</div>
  }
  return (
    <table className="w-full text-sm">
      <thead className="text-fg-faint text-[11px] uppercase tracking-wide">
        <tr className="border-b border-border">
          <th className="text-left px-3 py-2 font-normal">Rule</th>
          <th className="text-left px-3 py-2 font-normal">Outcome</th>
          <th className="text-left px-3 py-2 font-normal">Severity</th>
        </tr>
      </thead>
      <tbody>
        {evaluations.map((e, i) => {
          const out = (e.outcome ?? '').toUpperCase()
          const cls = OUTCOME[out] ?? 'bg-bg-subtle text-fg-dim'
          return (
            <tr key={i} className="border-b border-border/40">
              <td className="px-3 py-2 text-fg">{e.rule_name ?? 'Unknown'}</td>
              <td className="px-3 py-2">
                <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${cls}`}>{out || '—'}</span>
              </td>
              <td className="px-3 py-2 font-mono text-xs text-fg-dim">{e.severity ?? '—'}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
