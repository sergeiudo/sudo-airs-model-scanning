import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { GroupsList, SecurityGroup } from '@/lib/types'
import { api } from '@/lib/api'

export function Groups() {
  const [groups, setGroups] = useState<SecurityGroup[]>([])
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => {
    api.groups().then((r: GroupsList) => setGroups(r.security_groups)).catch((e) => setErr(String(e)))
  }, [])

  return (
    <div className="space-y-4 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold">Security groups</h1>
        <p className="text-sm text-fg-dim mt-1">
          One group per source type (HuggingFace, S3, GCS, Azure, Local). Click a group to see its rules.
        </p>
      </div>
      {err && <div className="text-danger text-sm">{err}</div>}
      <div className="bg-bg-raised border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-fg-faint text-[11px] uppercase tracking-wide">
            <tr className="border-b border-border">
              <th className="text-left px-3 py-2 font-normal">Name</th>
              <th className="text-left px-3 py-2 font-normal">Source type</th>
              <th className="text-left px-3 py-2 font-normal">UUID</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g.uuid} className="border-b border-border/40 hover:bg-bg-subtle/40">
                <td className="px-3 py-2"><Link to={`/groups/${g.uuid}`} className="hover:underline">{g.name}</Link></td>
                <td className="px-3 py-2 font-mono text-xs text-fg-dim">{g.source_type}</td>
                <td className="px-3 py-2 font-mono text-[10px] text-fg-faint">{g.uuid.slice(0, 8)}…</td>
              </tr>
            ))}
            {groups.length === 0 && (
              <tr><td colSpan={3} className="px-3 py-4 text-fg-faint text-sm">No groups.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
