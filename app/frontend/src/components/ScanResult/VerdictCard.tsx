import { CheckCircle2, ShieldAlert, AlertTriangle, HelpCircle } from 'lucide-react'
import type { EvalOutcome } from '@/lib/types'
import { normaliseOutcome } from '@/lib/evalOutcome'

const STYLES: Record<string, { border: string; bg: string; text: string; Icon: typeof CheckCircle2; label: string; meaning: string }> = {
  ALLOWED: {
    border: 'border-success/40', bg: 'bg-success/10', text: 'text-success', Icon: CheckCircle2, label: 'Allowed',
    meaning: 'Passed all blocking rules — safe to deploy.',
  },
  BLOCKED: {
    border: 'border-danger/40', bg: 'bg-danger/10', text: 'text-danger', Icon: ShieldAlert, label: 'Blocked',
    meaning: 'Failed one or more blocking rules — deployment should be prevented.',
  },
  WARNING: {
    border: 'border-warn/40', bg: 'bg-warn/10', text: 'text-warn', Icon: AlertTriangle, label: 'Warning',
    meaning: 'Non-critical issues detected — review recommended before deploying.',
  },
}

export function VerdictCard({
  outcome, headline, sub,
}: { outcome: EvalOutcome | undefined | null; headline?: string; sub?: string }) {
  const key = normaliseOutcome(outcome)
  const s = STYLES[key] ?? { border: 'border-border', bg: 'bg-bg-subtle', text: 'text-fg', Icon: HelpCircle, label: key, meaning: '' }
  const { Icon } = s
  return (
    <div className={`border ${s.border} ${s.bg} rounded-lg p-5 flex items-start gap-4`}>
      <Icon className={`w-8 h-8 ${s.text} shrink-0 mt-0.5`} />
      <div className="min-w-0">
        <div className={`text-2xl font-semibold ${s.text}`}>{s.label}</div>
        {headline && <div className="text-sm font-mono text-fg mt-1 truncate">{headline}</div>}
        <div className="text-xs text-fg-dim mt-1">{sub ?? s.meaning}</div>
      </div>
    </div>
  )
}
