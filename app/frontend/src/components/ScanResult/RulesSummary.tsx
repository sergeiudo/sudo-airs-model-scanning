import type { EvalSummary } from '@/lib/types'

export function RulesSummary({ summary }: { summary?: EvalSummary }) {
  if (!summary) return null
  const { rules_passed: p, rules_failed: f, total_rules: t } = summary
  if (t <= 0) return null
  const pct = Math.round((p / t) * 100)
  return (
    <div className="bg-bg-raised border border-border rounded-lg p-4">
      <div className="flex items-baseline justify-between mb-2">
        <div className="text-sm font-medium">Rules</div>
        <div className="text-xs text-fg-dim font-mono">{p} / {t} passed · {pct}%</div>
      </div>
      <div className="h-2 rounded bg-bg-subtle overflow-hidden flex">
        <div className="bg-success h-full" style={{ width: `${pct}%` }} />
        <div className="bg-danger h-full flex-1" />
      </div>
      <div className="flex justify-between text-[11px] text-fg-faint mt-2 font-mono">
        <span className="text-success">{p} passed</span>
        <span className="text-danger">{f} failed</span>
        <span>{t} total</span>
      </div>
    </div>
  )
}
