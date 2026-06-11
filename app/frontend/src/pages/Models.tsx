import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import type { ModelFile, ModelSummary, ModelVersion } from '@/lib/types'
import { api } from '@/lib/api'

export function Models() {
  const { modelUuid, versionUuid } = useParams<{ modelUuid?: string; versionUuid?: string }>()
  if (versionUuid && modelUuid) return <FilesView modelUuid={modelUuid} versionUuid={versionUuid} />
  if (modelUuid) return <VersionsView modelUuid={modelUuid} />
  return <ModelsList />
}

function ModelsList() {
  const [models, setModels] = useState<ModelSummary[]>([])
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => { api.listModels(100).then((r) => setModels(r.models)).catch((e) => setErr(String(e))) }, [])

  return (
    <div className="space-y-4 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold">Models</h1>
        <p className="text-sm text-fg-dim mt-1">
          Every model the scanner has catalogued for this tenant. Click a row to see its versions and files.
        </p>
      </div>
      {err && <div className="text-danger text-sm">{err}</div>}
      <div className="bg-bg-raised border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-fg-faint text-[11px] uppercase tracking-wide">
            <tr className="border-b border-border">
              <th className="text-left px-3 py-2 font-normal">Name</th>
              <th className="text-left px-3 py-2 font-normal">URI</th>
              <th className="text-left px-3 py-2 font-normal">Source</th>
              <th className="text-left px-3 py-2 font-normal">UUID</th>
            </tr>
          </thead>
          <tbody>
            {models.map((m) => (
              <tr key={m.uuid} className="border-b border-border/40 hover:bg-bg-subtle/40">
                <td className="px-3 py-2"><Link to={`/models/${m.uuid}`} className="hover:underline">{m.name ?? '(unnamed)'}</Link></td>
                <td className="px-3 py-2 font-mono text-xs truncate max-w-sm text-fg-dim">{m.uri ?? '—'}</td>
                <td className="px-3 py-2 font-mono text-[11px] text-fg-dim">{m.source_type ?? '—'}</td>
                <td className="px-3 py-2 font-mono text-[10px] text-fg-faint">{m.uuid.slice(0, 8)}…</td>
              </tr>
            ))}
            {models.length === 0 && (
              <tr><td colSpan={4} className="px-3 py-4 text-fg-faint text-sm">No models catalogued yet — run a scan first.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function VersionsView({ modelUuid }: { modelUuid: string }) {
  const [versions, setVersions] = useState<ModelVersion[]>([])
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => {
    setVersions([]); setErr(null)
    api.listModelVersions(modelUuid).then((r) => setVersions(r.model_versions)).catch((e) => setErr(String(e)))
  }, [modelUuid])
  return (
    <div className="space-y-4 max-w-4xl">
      <Link to="/models" className="inline-flex items-center gap-1 text-xs text-fg-dim hover:text-fg">
        <ChevronLeft className="w-3 h-3" /> All models
      </Link>
      <div>
        <h1 className="text-xl font-semibold">Versions</h1>
        <div className="text-[10px] font-mono text-fg-faint mt-1">model {modelUuid}</div>
      </div>
      {err && <div className="text-danger text-sm">{err}</div>}
      <div className="bg-bg-raised border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-fg-faint text-[11px] uppercase tracking-wide">
            <tr className="border-b border-border">
              <th className="text-left px-3 py-2 font-normal">Version</th>
              <th className="text-left px-3 py-2 font-normal">Created</th>
              <th className="text-left px-3 py-2 font-normal">UUID</th>
            </tr>
          </thead>
          <tbody>
            {versions.map((v) => (
              <tr key={v.uuid} className="border-b border-border/40 hover:bg-bg-subtle/40">
                <td className="px-3 py-2">
                  <Link to={`/models/${modelUuid}/versions/${v.uuid}`} className="hover:underline">
                    {v.name ?? v.tag ?? v.version_id ?? '(unnamed)'}
                  </Link>
                </td>
                <td className="px-3 py-2 text-fg-dim text-xs">{v.created_at?.replace('T', ' ').slice(0, 19) ?? '—'}</td>
                <td className="px-3 py-2 font-mono text-[10px] text-fg-faint">{v.uuid.slice(0, 8)}…</td>
              </tr>
            ))}
            {versions.length === 0 && (
              <tr><td colSpan={3} className="px-3 py-4 text-fg-faint text-sm">No versions for this model.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function FilesView({ modelUuid, versionUuid }: { modelUuid: string; versionUuid: string }) {
  const [files, setFiles] = useState<ModelFile[]>([])
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => {
    setFiles([]); setErr(null)
    api.listVersionFiles(versionUuid).then((r) => setFiles(r.files)).catch((e) => setErr(String(e)))
  }, [versionUuid])
  return (
    <div className="space-y-4 max-w-4xl">
      <Link to={`/models/${modelUuid}`} className="inline-flex items-center gap-1 text-xs text-fg-dim hover:text-fg">
        <ChevronLeft className="w-3 h-3" /> Versions
      </Link>
      <div>
        <h1 className="text-xl font-semibold">Files</h1>
        <div className="text-[10px] font-mono text-fg-faint mt-1">version {versionUuid}</div>
      </div>
      {err && <div className="text-danger text-sm">{err}</div>}
      <div className="bg-bg-raised border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-fg-faint text-[11px] uppercase tracking-wide">
            <tr className="border-b border-border">
              <th className="text-left px-3 py-2 font-normal">Path</th>
              <th className="text-left px-3 py-2 font-normal">Format</th>
              <th className="text-right px-3 py-2 font-normal">Size (bytes)</th>
            </tr>
          </thead>
          <tbody>
            {files.map((f, i) => (
              <tr key={f.uuid ?? `${i}-${f.name ?? f.path}`} className="border-b border-border/40">
                <td className="px-3 py-2 font-mono text-xs text-fg">{f.path ?? f.name ?? '(unnamed)'}</td>
                <td className="px-3 py-2 font-mono text-[11px] text-fg-dim">{f.format ?? '—'}</td>
                <td className="px-3 py-2 text-right font-mono text-xs text-fg-dim">{f.size?.toLocaleString() ?? '—'}</td>
              </tr>
            ))}
            {files.length === 0 && (
              <tr><td colSpan={3} className="px-3 py-4 text-fg-faint text-sm">No files for this version.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
