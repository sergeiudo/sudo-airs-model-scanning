import { Printer, ShieldAlert, FileWarning, UserX, FileX2 } from 'lucide-react'
import { CodeBlock } from '@/components/ui/CodeBlock'
import { Callout } from '@/components/ui/Callout'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Eyebrow } from '@/components/ui/SectionHeader'
import { ArchitectureDiagram } from '@/components/ArchitectureDiagram'
import {
  IAM_PERMISSIONS, dotenv, setupScript, getPypiUrl, manualInstall,
  verifyInstall, sdkScan, cliScan, sdkGate,
} from '@/lib/integrationSnippets'

export function SetupGuide() {
  return (
    <div className="space-y-8 max-w-3xl print-page animate-fade-up">
      {/* Title block */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Eyebrow>Setup guide · leave-behind</Eyebrow>
          <h1 className="text-2xl font-semibold mt-2">
            Prisma AIRS Model Security — integration guide
          </h1>
          <p className="text-sm text-fg-dim mt-2 max-w-xl">
            Everything a team needs to enable Model Security in their own environment: prerequisites,
            credentials, installing the private SDK, running scans, and gating CI/CD. Save this page as
            a PDF to share.
          </p>
        </div>
        <Button variant="brand" size="sm" onClick={() => window.print()} className="no-print shrink-0">
          <Printer className="w-3.5 h-3.5" /> Print / Save PDF
        </Button>
      </div>

      <GuideSection n="1" title="What it is & why it matters">
        <p className="text-sm text-fg-dim">
          Think of it as antivirus for AI models: every model is scanned <span className="text-fg">before
          deployment</span> for malicious code, supply-chain tampering, neural backdoors, unsafe
          serialization formats, and license/policy violations. Most blocks are policy issues (unsafe
          formats, licenses) — real threats are rare but critical when found.
        </p>
        <div className="grid sm:grid-cols-2 gap-2">
          <Threat icon={ShieldAlert} title="Malicious code" sub="Pickle/H5/GGUF code execution, weight payloads" />
          <Threat icon={FileWarning} title="Supply chain" sub="Poisoned weights, tampered model cards" />
          <Threat icon={UserX} title="Unverified publishers" sub="Unknown orgs, missing documentation" />
          <Threat icon={FileX2} title="Unsafe formats / licenses" sub="Pickle, Keras H5; GPL/AGPL violations" />
        </div>
      </GuideSection>

      <GuideSection n="2" title="How it works">
        <ArchitectureDiagram />
        <p className="text-sm text-fg-dim">
          Your code calls the Prisma AIRS API over HTTPS via the Python SDK or the{' '}
          <span className="font-mono text-fg">model-security</span> CLI. The service downloads and
          analyzes the model, applies the rule engine, and returns a verdict:{' '}
          <span className="text-success">ALLOWED</span>, <span className="text-danger">BLOCKED</span>, or{' '}
          <span className="text-warn">WARNING</span>. Per-file detail lives in Strata Cloud Manager.
        </p>
      </GuideSection>

      <GuideSection n="3" title="Prerequisites">
        <ul className="text-sm text-fg-dim list-disc pl-5 space-y-1">
          <li>Prisma AIRS subscription with Model Security enabled on the tenant.</li>
          <li>Strata Cloud Manager access (<span className="font-mono text-fg">strata.paloaltonetworks.com</span>).</li>
          <li>Python <span className="font-mono text-fg">3.10–3.12</span> (3.12 recommended; 3.13+ not validated).</li>
          <li><span className="font-mono text-fg">curl</span> and <span className="font-mono text-fg">jq</span> for the SDK auth flow.</li>
          <li>Outbound HTTPS to <span className="font-mono text-fg">api.sase.paloaltonetworks.com</span>, <span className="font-mono text-fg">auth.apps.paloaltonetworks.com</span>, and your model source (e.g. <span className="font-mono text-fg">huggingface.co</span>).</li>
        </ul>
      </GuideSection>

      <GuideSection n="4" title="Create credentials in Strata Cloud Manager">
        <p className="text-sm text-fg-dim">
          <span className="text-fg">Settings → Identity &amp; Access → Service Accounts → Add</span>.
          Grant these permissions, then copy the Client ID and Client Secret (shown once). Get the TSG
          ID from <span className="text-fg">Settings → Tenant Management</span>.
        </p>
        <div className="flex flex-wrap gap-2">
          {IAM_PERMISSIONS.map((p) => <Badge key={p} tone="accent">{p}</Badge>)}
        </div>
        <Callout tone="warn" title="Secret handling">
          The client secret is displayed only at creation. Store all three values in a secret manager;
          never commit <span className="font-mono">.env</span> or hardcode them. Rotate periodically.
        </Callout>
        <CodeBlock label=".env" code={dotenv} />
      </GuideSection>

      <GuideSection n="5" title="Install the private SDK">
        <p className="text-sm text-fg-dim">
          <span className="font-mono text-fg">model-security-client</span> and{' '}
          <span className="font-mono text-fg">airs-schemas</span> are proprietary packages on a private,
          OAuth-gated PyPI — plain <span className="font-mono">pip install</span> cannot find them.
        </p>
        <CodeBlock label="recommended" code={setupScript} />
        <p className="text-sm text-fg-dim">Under the hood, an OAuth2 exchange produces a short-lived authenticated index URL:</p>
        <CodeBlock label="auth flow" code={getPypiUrl} />
        <details className="text-sm">
          <summary className="cursor-pointer text-fg-dim hover:text-fg no-print">Manual install (no setup script)</summary>
          <div className="mt-3"><CodeBlock label="manual" code={manualInstall} /></div>
        </details>
        <CodeBlock label="verify" code={verifyInstall} />
      </GuideSection>

      <GuideSection n="6" title="Run a scan from code">
        <p className="text-sm text-fg-dim">
          Discover the security group for your source type at runtime (never hardcode UUIDs), then scan.
        </p>
        <CodeBlock label="python — SDK" code={sdkScan} />
        <Callout tone="warn" title="HuggingFace URI gotcha">
          URIs must include the org/author segment.{' '}
          <span className="font-mono text-success">huggingface.co/openai-community/gpt2</span> works;{' '}
          <span className="font-mono text-danger">huggingface.co/gpt2</span> fails validation.
        </Callout>
      </GuideSection>

      <GuideSection n="7" title="Gate it in CI/CD">
        <p className="text-sm text-fg-dim">
          Use the CLI for pipelines — its exit code is the gate. Always pass{' '}
          <span className="font-mono text-fg">--block-on-errors</span> so scan failures fail closed.
          Store credentials as masked CI secrets; the (non-secret) group UUID can be a plain variable.
        </p>
        <CodeBlock label="shell — CLI" code={cliScan} />
        <p className="text-sm text-fg-dim">Or gate from application code:</p>
        <CodeBlock label="python — deploy gate" code={sdkGate} />
      </GuideSection>

      <GuideSection n="8" title="Investigate findings">
        <p className="text-sm text-fg-dim">
          The API/CLI return a summary verdict. For per-file findings, threat descriptions, and
          remediation steps, open Strata Cloud Manager →{' '}
          <span className="text-fg">Insights → Prisma AIRS → Model Security → Scans</span> and select
          your scan ID.
        </p>
      </GuideSection>

      <div className="text-[11px] text-fg-faint border-t border-border pt-4">
        Generated by the Prisma AIRS Model Security demo portal. Commands and endpoints reflect this
        repository's setup scripts and examples.
      </div>
    </div>
  )
}

function GuideSection({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold flex items-center gap-2">
        <span className="text-fg-faint font-mono text-sm">{n}.</span> {title}
      </h2>
      {children}
    </section>
  )
}

function Threat({ icon: Icon, title, sub }: { icon: typeof ShieldAlert; title: string; sub: string }) {
  return (
    <div className="flex gap-2.5 rounded-lg border border-border bg-bg-subtle/30 p-3 print-surface">
      <Icon className="w-4 h-4 text-brand shrink-0 mt-0.5" />
      <div>
        <div className="text-sm font-medium">{title}</div>
        <div className="text-[11px] text-fg-faint mt-0.5">{sub}</div>
      </div>
    </div>
  )
}
