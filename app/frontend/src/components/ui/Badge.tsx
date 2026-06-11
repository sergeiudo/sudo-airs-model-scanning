import { cva, type VariantProps } from 'class-variance-authority'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

const badge = cva('inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium', {
  variants: {
    tone: {
      neutral: 'bg-bg-subtle text-fg-dim border border-border',
      success: 'bg-success/15 text-success',
      danger: 'bg-danger/15 text-danger',
      warn: 'bg-warn/15 text-warn',
      accent: 'bg-accent/15 text-accent',
      brand: 'bg-brand/15 text-brand',
    },
  },
  defaultVariants: { tone: 'neutral' },
})

export function Badge({
  tone, className, children,
}: VariantProps<typeof badge> & { className?: string; children: ReactNode }) {
  return <span className={cn(badge({ tone }), className)}>{children}</span>
}
