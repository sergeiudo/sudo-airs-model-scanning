import { CheckCircle2, XCircle, Loader2, CircleDashed } from 'lucide-react'
import { cn } from '@/lib/cn'

export type StatusKind = 'ok' | 'fail' | 'loading' | 'unknown'

const MAP: Record<StatusKind, { icon: typeof CheckCircle2; cls: string }> = {
  ok: { icon: CheckCircle2, cls: 'text-success' },
  fail: { icon: XCircle, cls: 'text-danger' },
  loading: { icon: Loader2, cls: 'text-fg-dim animate-spin' },
  unknown: { icon: CircleDashed, cls: 'text-fg-faint' },
}

export function StatusPill({ kind, label }: { kind: StatusKind; label: string }) {
  const { icon: Icon, cls } = MAP[kind]
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-fg-dim">
      <Icon className={cn('w-3.5 h-3.5', cls)} />
      {label}
    </span>
  )
}
