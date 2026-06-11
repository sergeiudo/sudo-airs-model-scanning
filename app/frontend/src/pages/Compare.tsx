import { useEffect, useMemo, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import type { EnvInfo, ScanDetail, ScanSummary } from '@/lib/types'
import { api } from '@/lib/api'
import { VerdictCard } from '@/components/ScanResult/VerdictCard'
import { RulesSummary } from '@/components/ScanResult/RulesSummary'
import { ModelFormatsChips } from '@/components/ScanResult/ModelFormatsChips'
import { FilesScannedStats } from '@/components/ScanResult/FilesScannedStats'
import { ScmDeepLink } from '@/components/ScanResult/ScmDeepLink'
import { ScansTable } from '@/components/ScansTable'
import { normaliseOutcome } from '@/lib/evalOutcome'

export function Compare() {
  const [params, setParams] = useSearchParams()
  const a = params.get('a')
  const b = params.get('b')

  if (a && b) return <Side a={a} b={b} />
  return <Picker selected={[a, b].filter(Boolean) as string[]} onPick={(uuid) => {
    const cur = [a, b].filter(Boolean) as string[]
    if (cur.includes(uuid)) return
    const next = [...cur, uuid].slice(0, 2)
    const sp = new URLSearchParams()
    if (next[0]) sp.set('a', next[0])
    if (next[1]) sp.set('b', next[1])
    setParams(sp)
  }} />
}

function Picker({ selected, onPick }: { selected: string[]; onPick: (uuid: string) => void }) {
  const [scans, setScans] = useState<ScanSummary[]>([])
  useEffect(() => { api.listScans(50).then((r) => setScans(r.scans)) }, [])
  return (
    <div className="space-y-4 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold">Compare scans</h1>
        <p className="text-sm text-fg-dim mt-1">
          Pick two scans to render side-by-side. Pair a clean model with a poisoned one to make the gate's job obvious.
        </p>
      </div>
      <div className="text-xs text-fg-dim">Picked: {selected.length}/2</div>
      <div className="bg-bg-raised border border-border rounded-lg overflow-hidden">
        <ScansTable
          scans={scans}
          rowAction={(s) => {
            const picked = selected.includes(s.uuid)
            return (
              <button
                onClick={() => onPick(s.uuid)}
                disabled={picked || selected.length >= 2}
                className="text-xs px-2 py-0.5 rounded border border-border bg-bg-subtle hover:bg-bg-subtle/70 disabled:opacity-40"
              >
                {picked ? 'picked' : 'pick'}
              </button>
            )
          }}
        />
      </div>
    </div>
  )
}

function Side({ a, b }: { a: string; b: string }) {
  const [sa, setSa] = useState<ScanDetail | null>(null)
  const [sb, setSb] = useState<ScanDetail | null>(null)
  const [env, setEnv] = useState<EnvInfo | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    setSa(null); setSb(null); setErr(null)
    Promise.all([api.getScan(a), api.getScan(b), api.env()])
      .then(([x, y, e]) => { setSa(x); setSb(y); setEnv(e) })
      .catch((e) => setErr(String(e)))
  }, [a, b])

  const verdictsDiffer = useMemo(() => {
    if (!sa || !sb) return false
    return normaliseOutcome(sa.eval_outcome) !== normaliseOutcome(sb.eval_outcome)
  }, [sa, sb])

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">Compare scans</h1>
        <Link to="/compare" className="text-xs text-fg-dim hover:text-fg">Pick different scans →</Link>
      </div>
      {err && <div className="text-danger text-sm">{err}</div>}
      {verdictsDiffer && (
        <div className="border border-warn/40 bg-warn/5 text-warn text-xs px-3 py-2 rounded">
          The two scans returned different verdicts. That's exactly the kind of contrast a customer demo wants to make visible.
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <Column scan={sa} env={env} />
        <Column scan={sb} env={env} />
      </div>
    </div>
  )
}

function Column({ scan, env }: { scan: ScanDetail | null; env: EnvInfo | null }) {
  if (!scan) return <div className="text-fg-faint text-sm">Loading…</div>
  return (
    <div className="space-y-3">
      <VerdictCard outcome={scan.eval_outcome} headline={scan.model_uri} sub={scan.created_at?.replace('T', ' ').slice(0, 19)} />
      <RulesSummary summary={scan.eval_summary} />
      <FilesScannedStats
        scanned={scan.total_files_scanned}
        skipped={scan.total_files_skipped}
        scannerVersion={scan.scanner_version}
      />
      <ModelFormatsChips formats={scan.model_formats} />
      <div className="flex items-center justify-between text-xs">
        <ScmDeepLink env={env} scanUuid={scan.uuid} />
        <Link to={`/scans/${scan.uuid}`} className="text-fg-dim hover:text-fg">Full detail →</Link>
      </div>
    </div>
  )
}
