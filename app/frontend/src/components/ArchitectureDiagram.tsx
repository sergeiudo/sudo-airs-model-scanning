import { ArrowRight, Code2, ShieldCheck, FileSearch, ExternalLink } from 'lucide-react'

function Node({
  icon: Icon, title, sub,
}: { icon: typeof Code2; title: string; sub: string }) {
  return (
    <div className="flex-1 min-w-[150px] rounded-lg border border-border bg-bg-subtle/40 p-3 text-center print-surface">
      <Icon className="w-5 h-5 mx-auto text-accent" />
      <div className="text-sm font-medium mt-1.5">{title}</div>
      <div className="text-[11px] text-fg-faint mt-0.5">{sub}</div>
    </div>
  )
}

function Arrow({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-1 shrink-0">
      <ArrowRight className="w-4 h-4 text-fg-faint" />
      <div className="text-[10px] text-fg-faint mt-0.5 whitespace-nowrap">{label}</div>
    </div>
  )
}

export function ArchitectureDiagram() {
  return (
    <div className="rounded-lg border border-border bg-bg-raised p-4 print-surface">
      <div className="flex flex-col md:flex-row items-stretch gap-2 md:gap-0">
        <Node icon={Code2} title="Your code" sub="Python SDK or model-security CLI" />
        <Arrow label="HTTPS" />
        <Node icon={ShieldCheck} title="Prisma AIRS API" sub="api.sase.paloaltonetworks.com" />
        <Arrow label="download + analyze" />
        <Node icon={FileSearch} title="Rule engine" sub="malware · backdoors · formats · license" />
        <Arrow label="verdict" />
        <Node icon={ExternalLink} title="Results" sub="summary via API · detail in SCM" />
      </div>
    </div>
  )
}
