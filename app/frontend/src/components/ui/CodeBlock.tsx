import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { cn } from '@/lib/cn'

export function CodeBlock({
  code, label, lang, className,
}: { code: string; label?: string; lang?: string; className?: string }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  return (
    <div className={cn('bg-bg-raised border border-border rounded-lg overflow-hidden print-surface', className)}>
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border">
        <div className="text-[11px] text-fg-faint font-mono">{label ?? lang ?? 'shell'}</div>
        <button
          onClick={copy}
          className="text-[11px] text-fg-dim hover:text-fg inline-flex items-center gap-1 no-print"
        >
          {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
          {copied ? 'copied' : 'copy'}
        </button>
      </div>
      <pre className="p-3 font-mono text-[11px] leading-relaxed overflow-auto bg-bg-subtle/30">{code}</pre>
    </div>
  )
}
