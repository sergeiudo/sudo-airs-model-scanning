import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { EnvInfo, GroupsList, ScanJob, ScanRequestAdvanced, SecurityGroup } from '@/lib/types'
import { api } from '@/lib/api'
import { validateHuggingFaceUri } from '@/lib/hf'
import { normaliseOutcome } from '@/lib/evalOutcome'
import { ChevronDown, ChevronUp, Loader2, XCircle } from 'lucide-react'
import { VerdictCard } from '@/components/ScanResult/VerdictCard'
import { RulesSummary } from '@/components/ScanResult/RulesSummary'
import { ScmDeepLink } from '@/components/ScanResult/ScmDeepLink'
import { SOURCES, SOURCE_ORDER, type SourceId } from '@/lib/sources'

type SourceType = SourceId

export function Scan() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const [groups, setGroups] = useState<SecurityGroup[]>([])
  const [env, setEnv] = useState<EnvInfo | null>(null)
  const [sourceType, setSourceType] = useState<SourceType>('HUGGING_FACE')
  const [groupUuid, setGroupUuid] = useState<string>('')
  const [uri, setUri] = useState<string>(params.get('uri') ?? '')
  const [job, setJob] = useState<ScanJob | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const [advOpen, setAdvOpen] = useState(false)
  const [adv, setAdv] = useState<ScanRequestAdvanced>({})
  const [autoNav, setAutoNav] = useState(true)

  useEffect(() => {
    api.groups().then((g: GroupsList) => setGroups(g.security_groups)).catch((e) => setErr(String(e)))
    api.env().then(setEnv).catch(() => {})
  }, [])

  const filteredGroups = groups.filter((g) => g.source_type.includes(sourceType))
  useEffect(() => {
    if (filteredGroups.length > 0 && !filteredGroups.find((g) => g.uuid === groupUuid)) {
      setGroupUuid(filteredGroups[0].uuid)
    }
  }, [sourceType, groups])

  const meta = SOURCES[sourceType]
  const hfCheck = sourceType === 'HUGGING_FACE' && uri ? validateHuggingFaceUri(uri) : { ok: true as const }
  const canSubmit = !!groupUuid && !!uri && hfCheck.ok && (!job || job.status !== 'pending')

  async function submit() {
    setErr(null); setJob(null)
    try {
      const { scan_job_id } = await api.startScan({
        security_group_uuid: groupUuid, model_uri: uri, ...adv,
      })
      pollJob(scan_job_id)
    } catch (e) { setErr(String(e)) }
  }

  function pollJob(jobId: string) {
    setJob({ job_id: jobId, status: 'pending', scan_id: null, result: null, error: null })
    const tick = async () => {
      try {
        const j = await api.scanJob(jobId)
        setJob(j)
        if (j.status === 'pending') { setTimeout(tick, 600); return }
        if (j.status === 'done' && j.scan_id && autoNav && normaliseOutcome(j.result?.eval_outcome) !== 'ERROR') {
          nav(`/scans/${j.scan_id}`)
        }
      } catch (e) { setErr(String(e)) }
    }
    setTimeout(tick, 600)
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold">Run a scan</h1>
        <p className="text-sm text-fg-dim mt-1">Pick a source type and security group, paste a model URI, hit scan.</p>
      </div>
      {err && <div className="text-danger text-sm">{err}</div>}

      <div className="bg-bg-raised border border-border rounded-lg p-4 space-y-4">
        <Field label="Source type">
          <select value={sourceType} onChange={(e) => { setSourceType(e.target.value as SourceType); setUri('') }}
            className="bg-bg-subtle border border-border rounded-md px-3 py-1.5 text-sm w-full">
            {SOURCE_ORDER.map((s) => (
              <option key={s} value={s}>{SOURCES[s].label} ({s})</option>
            ))}
          </select>
          <div className="text-fg-faint text-[11px] mt-1.5">
            <span className="font-mono text-fg-dim">{meta.scheme}</span> — {meta.access}
          </div>
        </Field>

        <Field label="Security group">
          <select value={groupUuid} onChange={(e) => setGroupUuid(e.target.value)}
            className="bg-bg-subtle border border-border rounded-md px-3 py-1.5 text-sm w-full">
            {filteredGroups.map((g) => (
              <option key={g.uuid} value={g.uuid}>{g.name} ({g.uuid.slice(0, 8)}…)</option>
            ))}
            {filteredGroups.length === 0 && <option>No group for this source type</option>}
          </select>
        </Field>

        <Field label="Model URI">
          <input value={uri} onChange={(e) => setUri(e.target.value)}
            placeholder={meta.exampleUri}
            className="bg-bg-subtle border border-border rounded-md px-3 py-1.5 text-sm w-full font-mono" />
          {sourceType === 'HUGGING_FACE' && !hfCheck.ok && (
            <div className="text-warn text-xs mt-1">{hfCheck.reason}</div>
          )}
          <div className="text-fg-faint text-xs mt-1.5">{meta.uriHint}</div>
          {meta.samples ? (
            <div className="text-fg-faint text-xs mt-2 space-x-3">
              <span>Quick picks:</span>
              {meta.samples.map((s) => (
                <button key={s.uri} onClick={() => setUri(s.uri)} className="underline hover:text-fg">
                  {s.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-fg-faint text-xs mt-2">
              <button onClick={() => setUri(meta.exampleUri)} className="underline hover:text-fg">
                Use example URI
              </button>
              <span className="ml-2">— swap in your own {meta.label} path. See the{' '}
                <a href="/sources" className="underline hover:text-fg">Sources guide</a> for enablement steps.</span>
            </div>
          )}
        </Field>

        <div>
          <button onClick={() => setAdvOpen((o) => !o)}
            className="inline-flex items-center gap-1 text-xs text-fg-dim hover:text-fg">
            {advOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            Advanced options
          </button>
          {advOpen && (
            <div className="mt-3 grid grid-cols-2 gap-3 bg-bg-subtle/40 border border-border rounded p-3">
              <PatternList
                label="allow_patterns"
                values={adv.allow_patterns ?? []}
                onChange={(v) => setAdv((a) => ({ ...a, allow_patterns: v.length ? v : undefined }))}
                placeholder="*.bin"
              />
              <PatternList
                label="ignore_patterns"
                values={adv.ignore_patterns ?? []}
                onChange={(v) => setAdv((a) => ({ ...a, ignore_patterns: v.length ? v : undefined }))}
                placeholder=".gitattributes"
              />
              <NumberField label="poll_interval_secs" value={adv.poll_interval_secs}
                onChange={(n) => setAdv((a) => ({ ...a, poll_interval_secs: n }))} />
              <NumberField label="poll_timeout_secs" value={adv.poll_timeout_secs}
                onChange={(n) => setAdv((a) => ({ ...a, poll_timeout_secs: n }))} />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <button onClick={submit} disabled={!canSubmit}
            className="bg-accent text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed">
            {job?.status === 'pending' ? 'Scanning…' : 'Start scan'}
          </button>
          <label className="text-xs text-fg-dim flex items-center gap-2">
            <input type="checkbox" checked={autoNav} onChange={(e) => setAutoNav(e.target.checked)} />
            Open detail when done
          </label>
        </div>
      </div>

      {job?.status === 'pending' && (
        <div className="bg-bg-raised border border-border rounded-lg p-4 flex items-center gap-3 text-sm">
          <Loader2 className="w-4 h-4 text-accent animate-spin" />
          <span>Scanning… polling the SDK in a background thread. Watch the Log drawer for live events.</span>
        </div>
      )}

      {job?.status === 'error' && (
        <div className="bg-bg-raised border border-border rounded-lg p-4 flex items-center gap-3 text-sm">
          <XCircle className="w-4 h-4 text-danger" />
          <span className="font-mono text-xs text-danger">{job.error}</span>
        </div>
      )}

      {job?.status === 'done' && job.result && !autoNav && (
        <div className="space-y-3">
          <VerdictCard outcome={job.result.eval_outcome} headline={uri} />
          <RulesSummary summary={job.result.eval_summary} />
          <div className="flex items-center justify-between text-xs">
            <ScmDeepLink env={env} scanUuid={job.scan_id} />
            {job.scan_id && (
              <a href={`/scans/${job.scan_id}`} className="text-accent hover:underline">Open full detail →</a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="text-[11px] uppercase tracking-wide text-fg-faint">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  )
}

function PatternList({ label, values, onChange, placeholder }:
  { label: string; values: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wide text-fg-faint">{label}</label>
      <input
        value={values.join(', ')}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value.split(',').map((p) => p.trim()).filter(Boolean))}
        className="mt-1 bg-bg-subtle border border-border rounded-md px-2 py-1 text-xs w-full font-mono"
      />
      <div className="text-[10px] text-fg-faint mt-1">comma-separated</div>
    </div>
  )
}

function NumberField({ label, value, onChange }: { label: string; value: number | undefined; onChange: (n: number | undefined) => void }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wide text-fg-faint">{label}</label>
      <input
        type="number" min={1}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
        className="mt-1 bg-bg-subtle border border-border rounded-md px-2 py-1 text-xs w-full font-mono"
      />
      <div className="text-[10px] text-fg-faint mt-1">leave blank for SDK default</div>
    </div>
  )
}
