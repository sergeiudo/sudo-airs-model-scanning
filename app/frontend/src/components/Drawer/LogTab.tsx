import { useEffect, useRef, useState } from 'react'
import type { SDKEvent } from '@/lib/types'
import { logBus } from '@/lib/ws'

type Row = SDKEvent
const MAX_ROWS = 200

export function LogTab() {
  const [rows, setRows] = useState<Row[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    return logBus.subscribe((msg) => {
      if ('type' in msg && msg.type === 'ping') return
      const event = msg as SDKEvent
      setRows((prev) => {
        // Update existing pending row when its ok/error arrives, else prepend.
        const i = prev.findIndex((r) => r.id === event.id)
        if (i >= 0) {
          const next = prev.slice()
          next[i] = event
          return next
        }
        return [event, ...prev].slice(0, MAX_ROWS)
      })
    })
  }, [])

  return (
    <div ref={scrollRef} className="h-full overflow-auto font-mono text-[11px]">
      <table className="w-full">
        <thead className="sticky top-0 bg-bg-raised text-fg-faint">
          <tr className="border-b border-border">
            <th className="text-left px-3 py-1.5 font-normal">Status</th>
            <th className="text-left px-3 py-1.5 font-normal">Method</th>
            <th className="text-left px-3 py-1.5 font-normal">Args</th>
            <th className="text-right px-3 py-1.5 font-normal">ms</th>
            <th className="text-left px-3 py-1.5 font-normal">Response / Error</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-border/40">
              <td className="px-3 py-1">
                <StatusPill status={r.status} />
              </td>
              <td className="px-3 py-1 text-fg">{r.method}</td>
              <td className="px-3 py-1 text-fg-dim truncate max-w-xs">{JSON.stringify(r.kwargs)}</td>
              <td className="px-3 py-1 text-right text-fg-faint">{r.duration_ms?.toFixed(0) ?? '·'}</td>
              <td className="px-3 py-1 text-fg-dim truncate max-w-md">
                {r.status === 'error' ? <span className="text-danger">{r.error}</span> : r.response_summary ?? '·'}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={5} className="px-3 py-4 text-fg-faint">Waiting for SDK activity…</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function StatusPill({ status }: { status: SDKEvent['status'] }) {
  const cls =
    status === 'ok' ? 'bg-success/20 text-success' :
    status === 'error' ? 'bg-danger/20 text-danger' :
    'bg-accent/20 text-accent'
  return <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide ${cls}`}>{status}</span>
}
