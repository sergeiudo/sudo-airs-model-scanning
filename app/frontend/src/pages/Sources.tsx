import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Callout } from '@/components/ui/Callout'
import { CodeBlock } from '@/components/ui/CodeBlock'
import { SOURCES, SOURCE_ORDER, type SourceId } from '@/lib/sources'
import { sourceScans } from '@/lib/integrationSnippets'

export function Sources() {
  return (
    <div className="space-y-5 max-w-3xl">
      <SectionHeader
        title="Model sources"
        subtitle="Prisma AIRS scans models from five source types. URI formats and the exact steps to enable each one in a customer environment."
      />

      <Callout tone="tip" title="Same call, different source">
        The SDK <span className="font-mono text-fg">scan()</span> call is identical across
        sources — only the security group's <span className="font-mono text-fg">source_type</span> and
        the <span className="font-mono text-fg">model_uri</span> scheme change. Cloud sources are read
        by the service using credentials you authorize in Strata Cloud Manager; local files are
        uploaded by the SDK/CLI.
      </Callout>

      {SOURCE_ORDER.map((id) => (
        <SourceCard key={id} id={id} />
      ))}

      <Callout tone="warn" title="Where cloud access is configured">
        For S3 / GCS / Azure, the scanning service needs read access to your storage. You grant it in
        Strata Cloud Manager → <span className="font-mono">Insights → Prisma AIRS → Model Security →
        Settings</span>. The security group UUID is not sensitive; the cloud credential is — treat it
        like any other secret. See the official{' '}
        <a href="https://docs.paloaltonetworks.com/ai-runtime-security/ai-model-security"
          target="_blank" rel="noreferrer" className="text-brand hover:underline">product docs</a> for
        the exact IAM policy per cloud.
      </Callout>

      <div className="text-sm text-fg-dim">
        Ready to try one? <Link to="/scan" className="text-brand hover:underline inline-flex items-center gap-1">Run a scan <ArrowRight className="w-3.5 h-3.5" /></Link>
      </div>
    </div>
  )
}

function SourceCard({ id }: { id: SourceId }) {
  const m = SOURCES[id]
  return (
    <Card className="p-5 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">{m.label}</h2>
        <Badge tone="neutral">{m.id}</Badge>
      </div>

      <div className="grid sm:grid-cols-2 gap-3 text-sm">
        <Fact label="URI format" mono>{m.scheme}</Fact>
        <Fact label="Example" mono>{m.exampleUri}</Fact>
      </div>

      <p className="text-sm text-fg-dim">{m.access}</p>

      <div>
        <div className="text-[11px] uppercase tracking-wide text-fg-faint mb-1.5">Enablement steps</div>
        <ol className="text-sm text-fg-dim list-decimal pl-5 space-y-1">
          {m.enablement.map((s) => <li key={s}>{s}</li>)}
        </ol>
      </div>

      <CodeBlock label="python — SDK" code={sourceScans[m.id]} />
    </Card>
  )
}

function Fact({ label, mono, children }: { label: string; mono?: boolean; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-bg-subtle/30 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-fg-faint">{label}</div>
      <div className={`mt-0.5 text-fg ${mono ? 'font-mono text-xs break-all' : ''}`}>{children}</div>
    </div>
  )
}
