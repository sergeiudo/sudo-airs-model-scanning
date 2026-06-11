import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import type { GroupDetail as GroupDetailT, GroupRule } from '@/lib/types'
import { api } from '@/lib/api'

export function GroupDetail() {
  const { groupUuid = '' } = useParams<{ groupUuid: string }>()
  const [group, setGroup] = useState<GroupDetailT | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    setGroup(null); setErr(null)
    api.getGroup(groupUuid).then(setGroup).catch((e) => setErr(String(e)))
  }, [groupUuid])

  return (
    <div className="space-y-4 max-w-4xl">
      <Link to="/groups" className="inline-flex items-center gap-1 text-xs text-fg-dim hover:text-fg">
        <ChevronLeft className="w-3 h-3" /> All groups
      </Link>
      {err && <div className="text-danger text-sm">{err}</div>}
      {!group && !err && <div className="text-fg-faint text-sm">Loading group…</div>}
      {group && (
        <>
          <div>
            <h1 className="text-xl font-semibold">{group.name}</h1>
            <div className="text-xs text-fg-dim mt-1">
              <span className="font-mono">{group.source_type}</span>
              {group.description && <> · {group.description}</>}
            </div>
            <div className="text-[10px] font-mono text-fg-faint mt-1">{group.uuid}</div>
          </div>

          <div className="bg-bg-raised border border-border rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-border text-sm font-medium">
              Rules <span className="text-fg-faint text-xs ml-2">{group.rules?.length ?? 0} total</span>
            </div>
            <table className="w-full text-sm">
              <thead className="text-fg-faint text-[11px] uppercase tracking-wide">
                <tr className="border-b border-border">
                  <th className="text-left px-3 py-2 font-normal">Rule</th>
                  <th className="text-left px-3 py-2 font-normal">Severity</th>
                  <th className="text-left px-3 py-2 font-normal">Enabled</th>
                  <th className="text-left px-3 py-2 font-normal">Blocking</th>
                </tr>
              </thead>
              <tbody>
                {(group.rules ?? []).map((r, i) => (
                  <RuleRow key={r.rule_uuid ?? `${i}-${r.name}`} rule={r} />
                ))}
                {(!group.rules || group.rules.length === 0) && (
                  <tr><td colSpan={4} className="px-3 py-4 text-fg-faint text-sm">No rules surfaced for this group.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <details className="text-xs">
            <summary className="text-fg-dim cursor-pointer">Raw response</summary>
            <pre className="mt-2 p-3 bg-bg-subtle rounded font-mono text-[11px] overflow-auto">
{JSON.stringify(group, null, 2)}
            </pre>
          </details>
        </>
      )}
    </div>
  )
}

function RuleRow({ rule }: { rule: GroupRule }) {
  const enabled = rule.enabled !== false
  const blocking = !!rule.blocking
  return (
    <tr className="border-b border-border/40">
      <td className="px-3 py-2 text-fg">{rule.name}</td>
      <td className="px-3 py-2 text-fg-dim text-xs font-mono">{rule.severity ?? '—'}</td>
      <td className="px-3 py-2">
        <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
          enabled ? 'bg-success/15 text-success' : 'bg-bg-subtle text-fg-faint'
        }`}>{enabled ? 'enabled' : 'disabled'}</span>
      </td>
      <td className="px-3 py-2">
        <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
          blocking ? 'bg-danger/15 text-danger' : 'bg-bg-subtle text-warn'
        }`}>{blocking ? 'blocking' : 'non-blocking'}</span>
      </td>
    </tr>
  )
}
