import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function Card({
  className, children, as: As = 'div',
}: { className?: string; children: ReactNode; as?: 'div' | 'section' }) {
  return (
    <As className={cn('bg-bg-raised border border-border rounded-lg', className)}>
      {children}
    </As>
  )
}

export function CardHeader({
  title, subtitle, action, className,
}: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center justify-between gap-3 px-4 py-3 border-b border-border', className)}>
      <div className="min-w-0">
        <div className="text-sm font-medium">{title}</div>
        {subtitle && <div className="text-xs text-fg-dim mt-0.5">{subtitle}</div>}
      </div>
      {action}
    </div>
  )
}
