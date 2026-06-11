import { ExternalLink, Presentation, FileText, BookOpen, Code2 } from 'lucide-react'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Card } from '@/components/ui/Card'

type Resource = {
  title: string
  desc: string
  href: string
  external?: boolean
  icon: typeof Presentation
}

const DECKS: Resource[] = [
  { title: 'Model Scanning — overview deck', desc: 'Slide deck: what it is, threats, verdicts, demo flow.', href: '/api/assets/overview-deck', external: true, icon: Presentation },
  { title: 'CI/CD Integration deck', desc: 'Slide deck: gating model deployments in pipelines.', href: '/api/assets/cicd-deck', external: true, icon: Presentation },
  { title: 'AI Model Security (PDF)', desc: 'Official Palo Alto Networks product documentation.', href: '/api/assets/product-pdf', external: true, icon: FileText },
]

const DOCS: Resource[] = [
  { title: 'Product documentation', desc: 'docs.paloaltonetworks.com — AI Model Security.', href: 'https://docs.paloaltonetworks.com/ai-runtime-security/ai-model-security', external: true, icon: BookOpen },
  { title: 'Strata Cloud Manager', desc: 'Console for findings, security groups, and scan history.', href: 'https://strata.paloaltonetworks.com', external: true, icon: ExternalLink },
  { title: 'GitHub repository', desc: 'This demo repo — notebooks, examples, and the portal source.', href: 'https://github.com/sergeiudo/sudo-airs-model-scanning', external: true, icon: Code2 },
]

export function Resources() {
  return (
    <div className="space-y-6 max-w-3xl">
      <SectionHeader
        title="Resources"
        subtitle="Leave-behinds and references for customer conversations — decks, the product PDF, and official docs."
      />

      <div>
        <h2 className="text-sm font-semibold text-fg-dim uppercase tracking-wide mb-2">Decks & PDF</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {DECKS.map((r) => <ResourceCard key={r.title} r={r} />)}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-fg-dim uppercase tracking-wide mb-2">In this portal</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <ResourceCard r={{ title: 'Printable setup guide', desc: 'One-page integration guide — save as PDF to leave behind.', href: '/guide', icon: FileText }} />
          <ResourceCard r={{ title: 'Onboarding wizard', desc: 'Guided enablement with live environment checks.', href: '/start', icon: BookOpen }} />
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-fg-dim uppercase tracking-wide mb-2">Notebooks (run locally)</h2>
        <Card className="p-4 text-sm text-fg-dim space-y-1.5">
          <p>Interactive walkthroughs live in the repo under <span className="font-mono text-fg">notebooks/</span>:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><span className="font-mono text-fg">prisma-airs-interactive-model-security.ipynb</span> — widget-based scanner, batch scans, analytics.</li>
            <li><span className="font-mono text-fg">model_security_demo.ipynb</span> — step-by-step workflow.</li>
          </ul>
          <p className="text-xs text-fg-faint">Launch with <span className="font-mono">jupyter notebook</span> after <span className="font-mono">source .venv/bin/activate</span>.</p>
        </Card>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-fg-dim uppercase tracking-wide mb-2">External</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {DOCS.map((r) => <ResourceCard key={r.title} r={r} />)}
        </div>
      </div>
    </div>
  )
}

function ResourceCard({ r }: { r: Resource }) {
  const Icon = r.icon
  const inner = (
    <Card className="p-4 h-full hover:bg-bg-subtle/40 transition-colors">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-bg-subtle flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-brand" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium flex items-center gap-1.5">
            {r.title}
            {r.external && <ExternalLink className="w-3 h-3 text-fg-faint shrink-0" />}
          </div>
          <div className="text-xs text-fg-dim mt-0.5">{r.desc}</div>
        </div>
      </div>
    </Card>
  )
  return (
    <a href={r.href} target={r.external ? '_blank' : undefined} rel={r.external ? 'noreferrer' : undefined}>
      {inner}
    </a>
  )
}
