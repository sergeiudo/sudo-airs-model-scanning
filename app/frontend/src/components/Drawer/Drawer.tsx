import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { LogTab } from './LogTab'
import { CodeTab } from './CodeTab'
import { ReplTab } from './ReplTab'

type Tab = 'log' | 'repl' | 'code'

export function Drawer({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const [tab, setTab] = useState<Tab>('log')
  return (
    <div className="border-t border-border bg-bg-raised">
      <div className="flex items-center justify-between px-4 py-1.5">
        <div className="flex items-center gap-3">
          <span className="text-xs uppercase tracking-wide text-fg-faint">Live</span>
          <TabButton label="Log" active={tab === 'log'} onClick={() => setTab('log')} />
          <TabButton label="REPL" active={tab === 'repl'} onClick={() => setTab('repl')} />
          <TabButton label="Code" active={tab === 'code'} onClick={() => setTab('code')} />
        </div>
        <button onClick={onToggle} className="text-fg-dim hover:text-fg" aria-label="Toggle drawer">
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>
      {open && (
        <div className="h-64 border-t border-border overflow-hidden">
          {tab === 'log' && <LogTab />}
          {tab === 'repl' && <ReplTab />}
          {tab === 'code' && <CodeTab />}
        </div>
      )}
    </div>
  )
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs font-medium px-2 py-0.5 rounded ${
        active ? 'text-fg bg-bg-subtle' : 'text-fg-dim hover:text-fg'
      }`}
    >
      {label}
    </button>
  )
}
