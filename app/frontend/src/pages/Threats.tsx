import { Link } from 'react-router-dom'
import { ShieldAlert, ArrowRight } from 'lucide-react'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Callout } from '@/components/ui/Callout'
import { THREATS, SEVERITY_RANK, type Severity, type Threat } from '@/lib/threatsData'
import { SOURCES } from '@/lib/sources'

const SEV_CLASS: Record<Severity, string> = {
  CRITICAL: 'bg-danger/15 text-danger',
  HIGH: 'bg-danger/10 text-danger',
  MEDIUM: 'bg-warn/15 text-warn',
  LOW: 'bg-bg-subtle text-fg-dim',
}

export function Threats() {
  const ordered = [...THREATS].sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])
  const samples = SOURCES.HUGGING_FACE.samples ?? []

  return (
    <div className="space-y-5 max-w-3xl">
      <SectionHeader
        title="Threat catalogue"
        subtitle="What model scanning actually catches — the threat classes, the formats they hide in, and how to remediate. Maps to the rules each security group enforces."
      />

      <Callout tone="tip" title="Want the live rule list?">
        This page explains the threat classes in plain language. The exact rules your tenant
        evaluates (and their on/off + blocking state per group) live under{' '}
        <Link to="/rules" className="text-brand hover:underline">Rules</Link> and{' '}
        <Link to="/groups" className="text-brand hover:underline">Groups</Link>.
      </Callout>

      <div className="space-y-4">
        {ordered.map((t) => <ThreatCard key={t.id} t={t} />)}
      </div>

      <Card className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-brand" />
          <h2 className="text-base font-semibold">Demo gallery — see each verdict live</h2>
        </div>
        <p className="text-sm text-fg-dim">
          Curated HuggingFace models with expected outcomes. One click loads the Scan page with the
          URI pre-filled.
        </p>
        <div className="grid sm:grid-cols-2 gap-2">
          {samples.map((s) => (
            <Link
              key={s.uri}
              to={`/scan?uri=${encodeURIComponent(s.uri)}`}
              className="flex items-center justify-between gap-2 rounded-lg border border-border bg-bg-subtle/30 px-3 py-2 hover:bg-bg-subtle/60 transition-colors"
            >
              <span className="text-sm font-mono truncate">{s.label}</span>
              <span className="shrink-0">
                <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                  s.expect === 'ALLOWED' ? 'bg-success/15 text-success'
                  : s.expect === 'BLOCKED' ? 'bg-danger/15 text-danger'
                  : 'bg-warn/15 text-warn'}`}>{s.expect}</span>
              </span>
            </Link>
          ))}
        </div>
        <div className="text-sm text-fg-dim">
          <Link to="/scan" className="text-brand hover:underline inline-flex items-center gap-1">
            Open the scanner <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </Card>
    </div>
  )
}

function ThreatCard({ t }: { t: Threat }) {
  return (
    <Card className="p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-base font-semibold">{t.title}</h2>
        <div className="flex items-center gap-2 shrink-0">
          {t.paitExample && <Badge tone="neutral">{t.paitExample}</Badge>}
          <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${SEV_CLASS[t.severity]}`}>{t.severity}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {t.formats.map((f) => <Badge key={f} tone="accent">{f}</Badge>)}
      </div>

      <div>
        <div className="text-[11px] uppercase tracking-wide text-fg-faint">Attack scenario</div>
        <p className="text-sm text-fg-dim mt-0.5">{t.scenario}</p>
      </div>

      <div>
        <div className="text-[11px] uppercase tracking-wide text-fg-faint">What the scanner detects</div>
        <p className="text-sm text-fg-dim mt-0.5">{t.detects}</p>
      </div>

      <div>
        <div className="text-[11px] uppercase tracking-wide text-fg-faint mb-1">Remediation</div>
        <ul className="text-sm text-fg-dim list-disc pl-5 space-y-1">
          {t.remediation.map((r) => <li key={r}>{r}</li>)}
        </ul>
      </div>
    </Card>
  )
}
