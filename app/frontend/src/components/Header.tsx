import { Link } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import { useSetupStatus, isReady } from '@/lib/setupStatus'
import { StatusPill, type StatusKind } from '@/components/ui/StatusPill'

export function Header() {
  const { status, loading } = useSetupStatus()

  let kind: StatusKind = 'unknown'
  let label = 'Checking environment…'
  if (!loading && status) {
    if (isReady(status)) {
      kind = 'ok'
      label = 'Environment ready'
    } else if (!status.sdk_installed) {
      kind = 'fail'
      label = 'SDK not installed'
    } else if (!status.all_creds_present) {
      kind = 'fail'
      label = 'Credentials missing'
    } else if (!status.api_reachable) {
      kind = 'fail'
      label = 'API unreachable'
    }
  } else if (loading) {
    kind = 'loading'
  }

  return (
    <header className="h-12 shrink-0 border-b border-border bg-bg-raised/60 backdrop-blur flex items-center justify-between px-6">
      <div className="text-sm text-fg-dim">
        AIRS <span className="text-fg font-medium">Model Security</span>
        <span className="text-fg-faint"> · Demo portal</span>
      </div>
      <div className="flex items-center gap-4">
        <Link to="/start" className="no-print">
          <StatusPill kind={kind} label={label} />
        </Link>
        {status?.source_types && status.source_types.length > 0 && (
          <div className="hidden md:flex items-center gap-1.5 text-[11px] font-mono text-fg-faint">
            {status.source_types.length} sources
          </div>
        )}
        <a
          href="https://docs.paloaltonetworks.com/ai-runtime-security/ai-model-security"
          target="_blank"
          rel="noreferrer"
          className="hidden sm:inline-flex items-center gap-1 text-xs text-fg-dim hover:text-fg no-print"
        >
          Docs <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </header>
  )
}
