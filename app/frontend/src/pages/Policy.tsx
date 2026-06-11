import { Link } from 'react-router-dom'
import { Layers, SlidersHorizontal, ShieldCheck } from 'lucide-react'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Card } from '@/components/ui/Card'
import { Callout } from '@/components/ui/Callout'
import { Badge } from '@/components/ui/Badge'

export function Policy() {
  return (
    <div className="space-y-6 max-w-3xl">
      <SectionHeader
        title="Policy & rule customization"
        subtitle="How security groups and rules map to org policy — and exactly where to tune them for a customer environment."
      />

      <Callout tone="tip" title="Mental model">
        A <span className="text-fg">security group</span> = a policy bound to one source type
        (HuggingFace, S3, …). It contains <span className="text-fg">rules</span>, each with an
        on/off state, a severity, and whether it\u2019s <span className="text-fg">blocking</span>.
        A scan runs the model through its group\u2019s rules and returns a verdict. Default groups are
        auto-created per source type; you customize from there.
      </Callout>

      <Card className="p-5 space-y-3">
        <div className="flex items-center gap-2"><Layers className="w-4 h-4 text-brand" /><h2 className="text-base font-semibold">Read vs. write</h2></div>
        <p className="text-sm text-fg-dim">
          The SDK/CLI and this portal <span className="text-fg">read</span> groups and rules
          (browse them under <Link to="/groups" className="text-brand hover:underline">Groups</Link> and{' '}
          <Link to="/rules" className="text-brand hover:underline">Rules</Link>). Policy{' '}
          <span className="text-fg">changes</span> — enabling/disabling rules, severity, blocking,
          allowlists — are made in <span className="font-mono text-fg">Strata Cloud Manager</span>, the
          system of record. The steps below are the SCM navigation to use live with a customer.
        </p>
      </Card>

      <PolicySection icon={SlidersHorizontal} title="Change a rule from WARNING to BLOCKING (or off)">
        <ol className="text-sm text-fg-dim list-decimal pl-5 space-y-1">
          <li>SCM → <span className="text-fg">Insights → Prisma AIRS → Model Security → Security Groups</span>.</li>
          <li>Open the security group for the source type (e.g. <span className="font-mono">Default HUGGING_FACE</span>).</li>
          <li>Find the rule, toggle <Badge tone="neutral">enabled</Badge> and{' '}
            <Badge tone="neutral">blocking</Badge>, or adjust its severity.</li>
          <li>Save. The next scan against that group reflects the change immediately — re-run a scan to demo before/after.</li>
        </ol>
        <p className="text-xs text-fg-faint">
          Example: many teams keep the license rule as WARNING during evaluation, then flip it to
          BLOCKING for the production group once policy is agreed.
        </p>
      </PolicySection>

      <PolicySection icon={ShieldCheck} title="Allowlist a trusted publisher or accept a finding">
        <ol className="text-sm text-fg-dim list-decimal pl-5 space-y-1">
          <li>Open the scan in SCM to identify the exact rule and file that fired.</li>
          <li>If it\u2019s an intentional, reviewed exception, adjust the corresponding rule on that
            security group (e.g. relax the publisher/license rule) — scoped to that group only.</li>
          <li>Document the exception; keep production groups strict and use a separate, more permissive
            group for sandbox/experimentation.</li>
        </ol>
      </PolicySection>

      <PolicySection icon={Layers} title="Create a custom security group per environment">
        <ol className="text-sm text-fg-dim list-decimal pl-5 space-y-1">
          <li>In SCM → Security Groups, create a new group bound to the source type.</li>
          <li>Enable the rule set and blocking states that match that environment\u2019s risk tolerance
            (e.g. <span className="text-fg">prod-strict</span> vs <span className="text-fg">sandbox</span>).</li>
          <li>In code, discover it by name/UUID at runtime — never hardcode the UUID:</li>
        </ol>
        <pre className="text-xs font-mono bg-bg-subtle/50 border border-border rounded p-3 overflow-x-auto">{`g = next(g for g in client.list_security_groups().security_groups
         if g.name == "prod-strict")
client.scan(security_group_uuid=UUID(str(g.uuid)), model_uri=...)`}</pre>
      </PolicySection>

      <Callout tone="warn" title="Keep policy in version-aware language">
        Rule catalogues evolve with scanner versions. When demoing, show the live{' '}
        <Link to="/rules" className="text-brand hover:underline">Rules</Link> list rather than a
        screenshot, so the customer sees exactly what their tenant enforces today.
      </Callout>
    </div>
  )
}

function PolicySection({ icon: Icon, title, children }: { icon: typeof Layers; title: string; children: React.ReactNode }) {
  return (
    <Card className="p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-brand" />
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
      {children}
    </Card>
  )
}
