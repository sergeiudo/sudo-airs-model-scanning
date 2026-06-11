import type { ReactNode } from 'react'
import { Info, AlertTriangle, CheckCircle2, Lightbulb } from 'lucide-react'
import { cn } from '@/lib/cn'

type Tone = 'info' | 'warn' | 'success' | 'tip'

const TONE: Record<Tone, { wrap: string; icon: typeof Info; iconCls: string }> = {
  info: { wrap: 'border-accent/30 bg-accent/5', icon: Info, iconCls: 'text-accent' },
  warn: { wrap: 'border-warn/30 bg-warn/5', icon: AlertTriangle, iconCls: 'text-warn' },
  success: { wrap: 'border-success/30 bg-success/5', icon: CheckCircle2, iconCls: 'text-success' },
  tip: { wrap: 'border-brand/30 bg-brand/5', icon: Lightbulb, iconCls: 'text-brand' },
}

export function Callout({
  tone = 'info', title, children,
}: { tone?: Tone; title?: ReactNode; children: ReactNode }) {
  const t = TONE[tone]
  const Icon = t.icon
  return (
    <div className={cn('border rounded-lg p-3 flex gap-3', t.wrap)}>
      <Icon className={cn('w-4 h-4 shrink-0 mt-0.5', t.iconCls)} />
      <div className="text-sm text-fg-dim min-w-0">
        {title && <div className="font-medium text-fg mb-0.5">{title}</div>}
        {children}
      </div>
    </div>
  )
}
