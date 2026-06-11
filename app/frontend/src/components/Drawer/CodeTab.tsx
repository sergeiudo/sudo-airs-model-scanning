import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import type { SDKEvent } from '@/lib/types'
import { renderPython } from '@/lib/codegen'
import { logBus } from '@/lib/ws'

type Line = { event: SDKEvent; rendered: string }
const MAX_LINES = 200

export function CodeTab() {
  const [lines, setLines] = useState<Line[]>([])
  const seen = useRef(new Set<string>())
  const { pathname } = useLocation()

  // Clear the rendered script when navigating to a new screen.
  useEffect(() => {
    setLines([])
    seen.current = new Set()
  }, [pathname])

  useEffect(() => {
    return logBus.subscribe((msg) => {
      if ('type' in msg && msg.type === 'ping') return
      const event = msg as SDKEvent
      // Only render OK events. The pending/ok pair would otherwise produce
      // duplicate lines; OK is the authoritative one (kwargs are identical).
      if (event.status !== 'ok') return
      if (seen.current.has(event.id)) return
      seen.current.add(event.id)
      const rendered = renderPython(event)
      setLines((prev) => [...prev, { event, rendered }].slice(-MAX_LINES))
    })
  }, [])

  return (
    <div className="h-full overflow-auto font-mono text-[11px] p-3 space-y-1">
      <div className="text-fg-faint text-[10px] uppercase tracking-wide mb-2">
        Equivalent Python for the current screen — every UI action becomes one line here.
      </div>
      {lines.length === 0 && (
        <div className="text-fg-faint">Interact with the page to populate this view.</div>
      )}
      {lines.map((l, i) => (
        <div key={`${l.event.id}-${i}`} className="text-fg whitespace-pre">{l.rendered}</div>
      ))}
    </div>
  )
}
