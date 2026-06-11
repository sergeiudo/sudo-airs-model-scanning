import type { ReactNode } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/cn'

export type StepState = 'done' | 'active' | 'pending'

export function Step({
  index, title, state = 'pending', last = false, children,
}: {
  index: number
  title: ReactNode
  state?: StepState
  last?: boolean
  children: ReactNode
}) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 border',
            state === 'done' && 'bg-success/15 text-success border-success/40',
            state === 'active' && 'bg-brand/15 text-brand border-brand/50',
            state === 'pending' && 'bg-bg-subtle text-fg-faint border-border'
          )}
        >
          {state === 'done' ? <Check className="w-4 h-4" /> : index}
        </div>
        {!last && <div className="w-px flex-1 bg-border mt-1" />}
      </div>
      <div className={cn('min-w-0 flex-1', last ? 'pb-0' : 'pb-8')}>
        <div className="text-sm font-semibold text-fg mb-2 mt-1">{title}</div>
        <div className="space-y-3">{children}</div>
      </div>
    </div>
  )
}

export function Stepper({ children }: { children: ReactNode }) {
  return <div className="flex flex-col">{children}</div>
}
