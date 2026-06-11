import { useEffect, useMemo, useState } from 'react'
import type { EnvInfo, SchemaEntry, SchemasList } from '@/lib/types'
import { api } from '@/lib/api'
import { ChevronRight } from 'lucide-react'

export function Environment() {
  const [env, setEnv] = useState<EnvInfo | null>(null)
  const [schemas, setSchemas] = useState<SchemaEntry[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [q, setQ] = useState('')

  useEffect(() => {
    api.env().then(setEnv).catch((e) => setErr(String(e)))
    api.listSchemas().then((r: SchemasList) => setSchemas(r.schemas)).catch(() => {})
  }, [])

  const filteredSchemas = useMemo(
    () => schemas.filter((s) => !q || s.name.toLowerCase().includes(q.toLowerCase())),
    [schemas, q]
  )

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold">Environment</h1>
        <p className="text-sm text-fg-dim mt-1">SDK install info, client methods, and Pydantic schema browser.</p>
      </div>
      {err && <div className="text-danger text-sm">{err}</div>}

      <div className="bg-bg-raised border border-border rounded-lg p-4 space-y-1">
        <Row k="SDK version" v={env?.sdk_version ?? '…'} />
        <Row k="airs-schemas version" v={env?.airs_schemas_version ?? '…'} />
        <Row k="Base URL" v={env?.base_url ?? '…'} />
        <Row k="TSG ID" v={env?.tsg_id || '(not set in process env)'} />
        <Row k="SCM base" v={env?.scm_base ?? '…'} />
      </div>

      <div className="bg-bg-raised border border-border rounded-lg p-4">
        <div className="text-sm font-medium mb-2">ModelSecurityAPIClient methods</div>
        <div className="text-xs text-fg-faint mb-3">{env?.methods.length ?? 0} public methods</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-xs">
          {env?.methods.map((m) => (
            <div key={m} className="text-fg-dim">client.<span className="text-fg">{m}</span>()</div>
          ))}
        </div>
      </div>

      <div className="bg-bg-raised border border-border rounded-lg p-4 space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <div className="text-sm font-medium">airs_schemas Pydantic models</div>
          <div className="text-xs text-fg-faint">{filteredSchemas.length} of {schemas.length}</div>
        </div>
        <input
          value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter schemas by name…"
          className="bg-bg-subtle border border-border rounded-md px-2 py-1 text-xs w-full font-mono"
        />
        <div className="divide-y divide-border">
          {filteredSchemas.map((s) => <SchemaItem key={s.name + s.module} entry={s} />)}
          {filteredSchemas.length === 0 && (
            <div className="text-xs text-fg-faint py-2">
              {schemas.length === 0 ? 'No schemas loaded — check /api/schemas.' : 'No schemas match the filter.'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SchemaItem({ entry }: { entry: SchemaEntry }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="py-2">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 text-left w-full">
        <ChevronRight className={`w-3 h-3 text-fg-dim transition-transform ${open ? 'rotate-90' : ''}`} />
        <span className="font-mono text-xs text-fg">{entry.name}</span>
        <span className="font-mono text-[10px] text-fg-faint">{entry.module}</span>
      </button>
      {open && (
        <pre className="mt-2 p-3 bg-bg-subtle rounded font-mono text-[10px] overflow-auto max-h-96">
{JSON.stringify(entry.schema, null, 2)}
        </pre>
      )}
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between text-sm py-1.5 border-b border-border/40 last:border-0">
      <div className="text-fg-dim">{k}</div>
      <div className="font-mono text-xs text-fg">{v}</div>
    </div>
  )
}
