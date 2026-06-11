import type { ReactNode } from 'react'

export function SectionHeader({
  title, subtitle, action,
}: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold">{title}</h1>
        {subtitle && <p className="text-sm text-fg-dim mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="text-[11px] uppercase tracking-[0.15em] text-fg-faint font-medium">
      {children}
    </div>
  )
}
