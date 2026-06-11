import { useState } from 'react'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { CodeBlock } from '@/components/ui/CodeBlock'
import { Callout } from '@/components/ui/Callout'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import {
  verifySmoke, discoverGroups, sdkScan, sdkGate, advancedScan, cliScan,
} from '@/lib/integrationSnippets'

type Tab = 'sdk' | 'cli'

export function SdkCli() {
  const [tab, setTab] = useState<Tab>('sdk')

  return (
    <div className="space-y-5 max-w-3xl">
      <SectionHeader
        title="SDK & CLI"
        subtitle="Copy-paste building blocks for integrating Model Security into application code or pipelines."
      />

      <div className="inline-flex rounded-md border border-border bg-bg-raised p-0.5">
        <TabButton active={tab === 'sdk'} onClick={() => setTab('sdk')}>Python SDK</TabButton>
        <TabButton active={tab === 'cli'} onClick={() => setTab('cli')}>CLI</TabButton>
      </div>

      {tab === 'sdk' ? (
        <div className="space-y-5">
          <Block title="1 · Initialize & verify" desc="Construct the client (auth comes from your three env vars) and make a first call.">
            <CodeBlock label="python" code={verifySmoke} />
          </Block>
          <Block title="2 · Discover your security group" desc="Filter by source type at runtime — never hardcode UUIDs.">
            <CodeBlock label="python" code={discoverGroups} />
          </Block>
          <Block title="3 · Scan a model" desc="Pass the group UUID and a model URI; read result.eval_outcome.">
            <CodeBlock label="python" code={sdkScan} />
          </Block>
          <Block title="4 · Gate a deployment" desc="Block promotion on any non-ALLOWED verdict.">
            <CodeBlock label="python" code={sdkGate} />
          </Block>
          <Block title="5 · Advanced options" desc="Filter files and tune polling for very large models.">
            <CodeBlock label="python" code={advancedScan} />
          </Block>
        </div>
      ) : (
        <div className="space-y-5">
          <Callout tone="tip" title="When to use the CLI">
            The same wheel installs a <span className="font-mono text-fg">model-security</span> command —
            ideal for CI/CD where you want one command and an exit code. For ready-made pipeline files,
            use the <span className="text-brand">CI/CD generator</span>.
          </Callout>
          <Block title="Scan & gate" desc="Exit code is the gate. Always use --block-on-errors so scan failures fail closed.">
            <CodeBlock label="shell" code={cliScan} />
          </Block>
          <Block title="Common subcommands" desc="">
            <CodeBlock
              label="shell"
              code={`model-security scan        # run a scan and gate on the verdict
model-security get-scan    # fetch a scan's summary by UUID
model-security list-scans  # recent scan history`}
            />
          </Block>
        </div>
      )}

      <Callout tone="warn" title="HuggingFace URIs need the org/author segment">
        Use <span className="font-mono text-success">https://huggingface.co/openai-community/gpt2</span>,
        not <span className="font-mono text-danger">https://huggingface.co/gpt2</span>.
      </Callout>
    </div>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 text-sm rounded transition-colors',
        active ? 'bg-bg-subtle text-fg' : 'text-fg-dim hover:text-fg'
      )}
    >
      {children}
    </button>
  )
}

function Block({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <Card className="p-4 space-y-3">
      <div>
        <div className="text-sm font-medium">{title}</div>
        {desc && <div className="text-xs text-fg-dim mt-0.5">{desc}</div>}
      </div>
      {children}
    </Card>
  )
}
