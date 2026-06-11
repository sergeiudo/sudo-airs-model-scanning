import { useEffect, useRef, useState } from 'react'
import { repl } from '@/lib/repl'
import { SNIPPETS } from './snippets'
import type { ReplLine } from '@/lib/types'

export function ReplTab() {
  const [lines, setLines] = useState<ReplLine[]>([])
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [historyIdx, setHistoryIdx] = useState<number | null>(null)
  const [more, setMore] = useState(false) // last reply asked for more input
  const taRef = useRef<HTMLTextAreaElement>(null)
  const outputRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    repl.connect()
    return repl.subscribe((msg) => {
      setLines((prev) => [...prev, { kind: 'out', text: msg.output, ok: msg.ok, more: msg.more }])
      setMore(msg.more)
    })
  }, [])

  useEffect(() => {
    outputRef.current?.scrollTo({ top: outputRef.current.scrollHeight })
  }, [lines])

  function submit() {
    if (!input.trim() && !more) return
    setLines((prev) => [...prev, { kind: 'in', text: input }])
    repl.send(input + (input.endsWith('\n') ? '' : '\n'))
    setHistory((h) => (input ? [...h, input] : h))
    setHistoryIdx(null)
    setInput('')
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
      return
    }
    if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault()
      setLines([])
      return
    }
    if (e.key === 'ArrowUp' && !e.shiftKey && input.indexOf('\n') === -1) {
      if (history.length === 0) return
      e.preventDefault()
      const next = historyIdx == null ? history.length - 1 : Math.max(0, historyIdx - 1)
      setHistoryIdx(next)
      setInput(history[next] ?? '')
    }
    if (e.key === 'ArrowDown' && historyIdx != null) {
      e.preventDefault()
      const next = historyIdx + 1
      if (next >= history.length) {
        setHistoryIdx(null); setInput('')
      } else {
        setHistoryIdx(next); setInput(history[next])
      }
    }
  }

  return (
    <div className="h-full flex flex-col font-mono text-[11px]">
      <div ref={outputRef} className="flex-1 overflow-auto p-3 space-y-0.5">
        <div className="text-fg-faint text-[10px] uppercase tracking-wide mb-2">
          Python REPL — `client` is the SDKProxy. Calls go through it: <span className="text-fg">client.call("list_security_groups")</span>
        </div>
        {lines.length === 0 && (
          <div className="text-fg-faint">Type a command, Enter to run. Shift+Enter for newline. ↑/↓ for history. Ctrl+L to clear.</div>
        )}
        {lines.map((l, i) => l.kind === 'in' ? (
          <div key={i} className="text-accent whitespace-pre">{'>>> '}{l.text}</div>
        ) : (
          <div key={i} className={`whitespace-pre ${l.ok ? 'text-fg' : 'text-danger'}`}>{l.text}</div>
        ))}
      </div>
      <div className="border-t border-border p-2 flex items-end gap-2">
        <select
          onChange={(e) => { if (e.target.value) { setInput(e.target.value); e.target.value = '' } }}
          defaultValue=""
          className="bg-bg-subtle border border-border rounded text-[10px] text-fg-dim px-1 py-0.5"
        >
          <option value="" disabled>Snippets…</option>
          {SNIPPETS.map((s) => <option key={s.label} value={s.code}>{s.label}</option>)}
        </select>
        <textarea
          ref={taRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
          placeholder={more ? '... continue' : '>>> '}
          rows={input.split('\n').length}
          className="flex-1 bg-bg-subtle border border-border rounded px-2 py-1 text-xs font-mono resize-none focus:outline-none focus:border-accent"
          spellCheck={false}
        />
        <button
          onClick={submit}
          className="text-xs bg-accent text-white px-2 py-1 rounded hover:bg-accent/90"
        >Run</button>
      </div>
    </div>
  )
}
