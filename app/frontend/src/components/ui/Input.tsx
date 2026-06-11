import type { InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

const base = 'bg-bg-subtle border border-border rounded-md px-3 py-1.5 text-sm w-full focus:outline-none focus:border-accent/70'

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(base, className)} {...rest} />
}

export function Select({
  className, children, ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <select className={cn(base, className)} {...rest}>
      {children}
    </select>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="text-[11px] uppercase tracking-wide text-fg-faint">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  )
}
