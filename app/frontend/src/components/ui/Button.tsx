import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'

const button = cva(
  'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap',
  {
    variants: {
      variant: {
        brand: 'bg-brand text-white hover:bg-brand-dim shadow-card',
        accent: 'bg-accent text-white hover:bg-accent/90',
        outline: 'border border-border text-fg hover:bg-bg-subtle/60',
        ghost: 'text-fg-dim hover:text-fg hover:bg-bg-subtle/60',
        danger: 'bg-danger/15 text-danger hover:bg-danger/25',
      },
      size: {
        sm: 'text-xs px-2.5 py-1.5',
        md: 'text-sm px-3.5 py-2',
        lg: 'text-sm px-5 py-2.5',
      },
    },
    defaultVariants: { variant: 'accent', size: 'md' },
  }
)

type CommonProps = VariantProps<typeof button> & { className?: string; children: ReactNode }

export function Button({
  variant, size, className, children, ...rest
}: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={cn(button({ variant, size }), className)} {...rest}>
      {children}
    </button>
  )
}

export function LinkButton({
  to, variant, size, className, children, external,
}: CommonProps & { to: string; external?: boolean }) {
  const cls = cn(button({ variant, size }), className)
  if (external) {
    return (
      <a href={to} target="_blank" rel="noreferrer" className={cls}>
        {children}
      </a>
    )
  }
  return (
    <Link to={to} className={cls}>
      {children}
    </Link>
  )
}
