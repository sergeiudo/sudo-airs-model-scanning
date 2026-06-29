import { NavLink } from 'react-router-dom'
import {
  Home, ScanLine, ListChecks, GitCompare, Layers, ShieldCheck, Workflow, Box,
  Settings2, Rocket, BookOpen, Code2, ShieldHalf, ShieldAlert, Database,
  SlidersHorizontal, HelpCircle, LibraryBig,
} from 'lucide-react'

type Item = { to: string; label: string; icon: typeof Home; end?: boolean }
type Group = { heading: string; items: Item[] }

const groups: Group[] = [
  {
    heading: 'Get started',
    items: [
      { to: '/start', label: 'Onboarding', icon: Rocket },
      { to: '/guide', label: 'Setup guide', icon: BookOpen },
    ],
  },
  {
    heading: 'Demo',
    items: [
      { to: '/', label: 'Dashboard', icon: Home, end: true },
      { to: '/scan', label: 'Run a scan', icon: ScanLine },
      { to: '/scans', label: 'Scans', icon: ListChecks },
      { to: '/compare', label: 'Compare', icon: GitCompare },
    ],
  },
  {
    heading: 'Explore',
    items: [
      { to: '/threats', label: 'Threats', icon: ShieldAlert },
      { to: '/sources', label: 'Sources', icon: Database },
      { to: '/groups', label: 'Groups', icon: Layers },
      { to: '/rules', label: 'Rules', icon: ShieldCheck },
      { to: '/models', label: 'Models', icon: Box },
    ],
  },
  {
    heading: 'Integrate',
    items: [
      { to: '/cicd', label: 'CI/CD', icon: Workflow },
      { to: '/integrate', label: 'SDK & CLI', icon: Code2 },
      { to: '/policy', label: 'Policy', icon: SlidersHorizontal },
    ],
  },
  {
    heading: 'Learn',
    items: [
      { to: '/faq', label: 'FAQ', icon: HelpCircle },
      { to: '/resources', label: 'Resources', icon: LibraryBig },
    ],
  },
  {
    heading: 'Reference',
    items: [
      { to: '/environment', label: 'Environment', icon: Settings2 },
    ],
  },
]

export function Sidebar() {
  return (
    <aside className="w-56 shrink-0 border-r border-border bg-bg-raised flex flex-col">
      <div className="px-4 py-4 border-b border-border flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-brand-grad flex items-center justify-center shrink-0 shadow-card">
          <ShieldHalf className="w-5 h-5 text-white" strokeWidth={2.2} />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold tracking-tight leading-tight">Prisma AIRS</div>
          <div className="text-[11px] text-fg-faint leading-tight">Model Security</div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {groups.map((group) => (
          <div key={group.heading}>
            <div className="px-3 pb-1 text-[10px] uppercase tracking-[0.14em] text-fg-faint">
              {group.heading}
            </div>
            <div className="space-y-0.5">
              {group.items.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                      isActive
                        ? 'bg-bg-subtle text-fg'
                        : 'text-fg-dim hover:text-fg hover:bg-bg-subtle/60'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="px-3 py-3 border-t border-border space-y-2">
        <div className="text-[10px] text-fg-faint px-1">localhost only · single tenant</div>
        <div className="rounded-md border border-brand/40 bg-gradient-to-r from-brand/25 via-accent/20 to-purple-500/10 px-2.5 py-1.5 shadow-card">
          <div className="text-[11px] font-semibold text-brand leading-tight">Sergei Udovenko</div>
          <div className="text-[10px] text-fg-dim leading-tight mt-0.5">demo &amp; learning · unofficial</div>
        </div>
      </div>
    </aside>
  )
}
