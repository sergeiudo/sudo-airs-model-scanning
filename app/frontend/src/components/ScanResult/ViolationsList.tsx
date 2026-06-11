import type { Violation } from '@/lib/types'
import { ShieldAlert } from 'lucide-react'

const SEV: Record<string, string> = {
  HIGH: 'text-danger',
  MEDIUM: 'text-warn',
  LOW: 'text-fg-dim',
}

export function ViolationsList({ violations }: { violations: Violation[] }) {
  if (violations.length === 0) {
    return (
      <div className="bg-bg-raised border border-border rounded-lg p-4 text-xs text-fg-faint">
        No violations reported by the scanner.
      </div>
    )
  }
  return (
    <div className="space-y-2">
      {violations.map((v, i) => {
        const sev = (v.severity ?? '').toUpperCase()
        const sevColour = SEV[sev] ?? 'text-fg-dim'
        const steps = v.remediation?.steps ?? []
        return (
          <div key={i} className="bg-bg-raised border border-border rounded-lg p-4 space-y-2">
            <div className="flex items-start gap-3">
              <ShieldAlert className={`w-4 h-4 mt-0.5 shrink-0 ${sevColour}`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-3">
                  <div className="text-sm font-medium text-fg">{v.rule_name ?? 'Unknown rule'}</div>
                  {sev && <span className={`text-[10px] font-mono uppercase ${sevColour}`}>{sev}</span>}
                </div>
                {(v.threat || v.issue) && (
                  <div className="text-xs text-fg-dim mt-1">{v.threat ?? v.issue}</div>
                )}
                {(v.file || v.file_path) && (
                  <div className="text-[11px] font-mono text-fg-faint mt-1">{v.file ?? v.file_path}</div>
                )}
              </div>
            </div>
            {steps.length > 0 && (
              <div className="ml-7">
                <div className="text-[10px] uppercase tracking-wide text-fg-faint mb-1">Remediation</div>
                <ol className="text-xs text-fg-dim list-decimal list-inside space-y-0.5">
                  {steps.map((s, j) => <li key={j}>{s}</li>)}
                </ol>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
