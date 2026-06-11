import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft, ExternalLink } from 'lucide-react'
import type { EnvInfo, Evaluation, ScanDetail as ScanDetailT, Violation } from '@/lib/types'
import { api } from '@/lib/api'
import { scmScanUrl } from '@/lib/scm'
import { LinkButton } from '@/components/ui/Button'
import { VerdictCard } from '@/components/ScanResult/VerdictCard'
import { RulesSummary } from '@/components/ScanResult/RulesSummary'
import { ModelFormatsChips } from '@/components/ScanResult/ModelFormatsChips'
import { FilesScannedStats } from '@/components/ScanResult/FilesScannedStats'
import { ScmDeepLink } from '@/components/ScanResult/ScmDeepLink'
import { ViolationsList } from '@/components/ScanResult/ViolationsList'
import { EvaluationsTable } from '@/components/ScanResult/EvaluationsTable'

export function ScanDetail() {
  const { scanUuid = '' } = useParams<{ scanUuid: string }>()
  const [scan, setScan] = useState<ScanDetailT | null>(null)
  const [env, setEnv] = useState<EnvInfo | null>(null)
  const [violations, setViolations] = useState<Violation[] | null>(null)
  const [evaluations, setEvaluations] = useState<Evaluation[] | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    setScan(null); setViolations(null); setEvaluations(null); setErr(null)
    Promise.all([
      api.getScan(scanUuid),
      api.env(),
      api.getScanViolations(scanUuid).then((r) => r.violations).catch(() => [] as Violation[]),
      api.getScanEvaluations(scanUuid).then((r) => r.evaluations).catch(() => [] as Evaluation[]),
    ])
      .then(([s, e, v, ev]) => { setScan(s); setEnv(e); setViolations(v); setEvaluations(ev) })
      .catch((e) => setErr(String(e)))
  }, [scanUuid])

  return (
    <div className="space-y-4 max-w-4xl">
      <Link to="/scans" className="inline-flex items-center gap-1 text-xs text-fg-dim hover:text-fg">
        <ChevronLeft className="w-3 h-3" /> All scans
      </Link>

      {err && <div className="text-danger text-sm">{err}</div>}
      {!scan && !err && <div className="text-fg-faint text-sm">Loading scan…</div>}

      {scan && (
        <>
          <VerdictCard
            outcome={scan.eval_outcome}
            headline={scan.model_uri}
            sub={`Scanned ${scan.created_at?.replace('T', ' ').slice(0, 19) ?? ''}${
              scan.security_group_name ? ` · ${scan.security_group_name}` : ''
            }`}
          />

          <div className="grid md:grid-cols-2 gap-3">
            <RulesSummary summary={scan.eval_summary} />
            <FilesScannedStats
              scanned={scan.total_files_scanned}
              skipped={scan.total_files_skipped}
              scannerVersion={scan.scanner_version}
            />
          </div>

          <ModelFormatsChips formats={scan.model_formats} />

          {scmScanUrl(env, scan.uuid) && (
            <div className="rounded-lg border border-accent/30 bg-accent/5 p-4 flex items-center justify-between gap-4">
              <div className="text-sm text-fg-dim min-w-0">
                <div className="font-medium text-fg">Full per-file findings in Strata Cloud Manager</div>
                The SDK returns a summary verdict. Threat descriptions, file-level findings, and
                remediation steps live in SCM for this scan.
              </div>
              <LinkButton to={scmScanUrl(env, scan.uuid)!} external variant="accent" size="sm" className="shrink-0">
                Open in SCM <ExternalLink className="w-3.5 h-3.5" />
              </LinkButton>
            </div>
          )}

          {violations && violations.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Violations <span className="text-fg-faint text-xs ml-2">{violations.length}</span></div>
              <ViolationsList violations={violations} />
            </div>
          )}

          {evaluations && evaluations.length > 0 && (
            <details>
              <summary className="text-sm font-medium cursor-pointer">
                Per-rule evaluations <span className="text-fg-faint text-xs ml-2">{evaluations.length}</span>
              </summary>
              <div className="mt-2 bg-bg-raised border border-border rounded-lg overflow-hidden">
                <EvaluationsTable evaluations={evaluations} />
              </div>
            </details>
          )}

          <div className="bg-bg-raised border border-border rounded-lg p-4 space-y-1">
            <Row k="Scan UUID" v={scan.uuid} mono />
            {scan.security_group_uuid && (
              <Row k="Security group"
                v={`${scan.security_group_name ?? ''} ${scan.security_group_uuid}`.trim()}
                link={`/groups/${scan.security_group_uuid}`} mono />
            )}
            {scan.source_type && <Row k="Source type" v={scan.source_type} />}
            {scan.enabled_rule_count_snapshot != null && <Row k="Enabled rule count (snapshot)" v={String(scan.enabled_rule_count_snapshot)} />}
            {scan.error_code && <Row k="Error code" v={scan.error_code} />}
            {scan.error_message && <Row k="Error message" v={scan.error_message} />}
          </div>

          <div className="flex items-center justify-between text-xs">
            <ScmDeepLink env={env} scanUuid={scan.uuid} />
            <Link to={`/compare?a=${encodeURIComponent(scan.uuid)}`} className="text-fg-dim hover:text-fg">
              Compare with another scan →
            </Link>
          </div>

          <details className="text-xs">
            <summary className="text-fg-dim cursor-pointer">Raw response</summary>
            <pre className="mt-2 p-3 bg-bg-subtle rounded font-mono text-[11px] overflow-auto">
{JSON.stringify(scan, null, 2)}
            </pre>
          </details>
        </>
      )}
    </div>
  )
}

function Row({ k, v, mono = false, link }: { k: string; v: string; mono?: boolean; link?: string }) {
  const valueClass = mono ? 'font-mono text-xs text-fg text-right break-all' : 'text-fg text-right'
  return (
    <div className="flex justify-between gap-4 text-sm py-1 border-b border-border/40 last:border-0">
      <div className="text-fg-dim shrink-0">{k}</div>
      {link
        ? <Link to={link} className={`${valueClass} hover:underline`}>{v}</Link>
        : <div className={valueClass}>{v}</div>}
    </div>
  )
}
