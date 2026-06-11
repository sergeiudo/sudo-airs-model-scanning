import { Link } from 'react-router-dom'
import { ExternalLink, RefreshCw, ArrowRight, BookOpen } from 'lucide-react'
import { useSetupStatus, isReady } from '@/lib/setupStatus'
import type { SetupStatus } from '@/lib/types'
import { Stepper, Step, type StepState } from '@/components/ui/Stepper'
import { CodeBlock } from '@/components/ui/CodeBlock'
import { Callout } from '@/components/ui/Callout'
import { Button, LinkButton } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { StatusPill, type StatusKind } from '@/components/ui/StatusPill'
import { Eyebrow } from '@/components/ui/SectionHeader'
import {
  IAM_PERMISSIONS, ENV_VARS, dotenv, setupScript, getPypiUrl,
  verifyInstall, verifySmoke, discoverGroups,
} from '@/lib/integrationSnippets'

export function GetStarted() {
  const { status, loading, refresh } = useSetupStatus()

  // Derive per-step completion from live signals where we can detect them.
  const credsDone = !!status?.all_creds_present
  const sdkDone = !!status?.sdk_installed
  const apiDone = !!status?.api_reachable
  const sourcesDone = (status?.source_types?.length ?? 0) > 0

  const stepState = (done: boolean, prevDone = true): StepState =>
    done ? 'done' : prevDone ? 'active' : 'pending'

  return (
    <div className="space-y-8 max-w-3xl animate-fade-up">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-bg-raised p-6 bg-hero-glow">
        <Eyebrow>Get started</Eyebrow>
        <h1 className="text-2xl font-semibold mt-2">
          Enable <span className="text-gradient">Prisma AIRS Model Security</span> in your environment
        </h1>
        <p className="text-sm text-fg-dim mt-2 max-w-xl">
          Nine guided steps — from creating credentials in Strata Cloud Manager and installing the
          private SDK, to running your first scan and gating models in your own CI/CD. Live checks
          below confirm each step against this machine's environment.
        </p>
        <div className="flex flex-wrap items-center gap-3 mt-4">
          <ReadinessBanner status={status} loading={loading} />
          <Button variant="outline" size="sm" onClick={() => void refresh()} className="no-print">
            <RefreshCw className="w-3.5 h-3.5" /> Re-check
          </Button>
          <LinkButton to="/guide" variant="ghost" size="sm">
            <BookOpen className="w-3.5 h-3.5" /> Printable guide
          </LinkButton>
        </div>
      </div>

      <Stepper>
        <Step index={1} title="Sign in to Strata Cloud Manager" state="active">
          <p className="text-sm text-fg-dim">
            Model Security must be enabled on your Prisma AIRS tenant. Sign in to the management
            console — everything you configure (service accounts, security groups, scan results)
            lives here.
          </p>
          <LinkButton to="https://strata.paloaltonetworks.com" external variant="outline" size="sm">
            Open Strata Cloud Manager <ExternalLink className="w-3.5 h-3.5" />
          </LinkButton>
        </Step>

        <Step index={2} title="Create a service account & capture credentials" state={stepState(credsDone)}>
          <p className="text-sm text-fg-dim">
            In SCM go to <span className="text-fg">Settings → Identity &amp; Access → Service Accounts</span>,
            add an account, and grant these permissions:
          </p>
          <div className="flex flex-wrap gap-2">
            {IAM_PERMISSIONS.map((p) => <Badge key={p} tone="accent">{p}</Badge>)}
          </div>
          <p className="text-sm text-fg-dim">
            Copy the three values below. <span className="text-warn">The client secret is shown only once</span> —
            store it in a secret manager immediately. The TSG ID is under{' '}
            <span className="text-fg">Settings → Tenant Management</span>.
          </p>
          <div className="flex flex-wrap gap-2">
            {ENV_VARS.map((v) => (
              <CredPill key={v} name={v} present={status?.creds_present?.[v]} loading={loading} />
            ))}
          </div>
        </Step>

        <Step index={3} title="Configure credentials" state={stepState(credsDone)}>
          <p className="text-sm text-fg-dim">
            For local use, copy <span className="font-mono text-fg">.env.template</span> to{' '}
            <span className="font-mono text-fg">.env</span> and fill in the three values. In CI, store
            them as masked secrets instead (see the CI/CD generator).
          </p>
          <CodeBlock label=".env" code={dotenv} />
        </Step>

        <Step index={4} title="Download & install the private SDK" state={stepState(sdkDone)}>
          <p className="text-sm text-fg-dim">
            <span className="font-mono text-fg">model-security-client</span> lives on a private,
            OAuth-gated PyPI — plain <span className="font-mono">pip install</span> will not find it.
            The setup script exchanges your credentials for a short-lived authenticated index URL.
          </p>
          <CodeBlock label="recommended — one command" code={setupScript} />
          <details className="text-sm">
            <summary className="cursor-pointer text-fg-dim hover:text-fg">Show the manual OAuth → PyPI flow</summary>
            <div className="mt-3"><CodeBlock label="manual install" code={getPypiUrl} /></div>
          </details>
          <div className="flex items-center gap-3 pt-1">
            <StatusPill
              kind={loading ? 'loading' : sdkDone ? 'ok' : 'fail'}
              label={sdkDone ? `SDK installed${status?.sdk_version ? ` · v${status.sdk_version}` : ''}` : 'SDK not detected'}
            />
          </div>
        </Step>

        <Step index={5} title="Verify the install" state={stepState(apiDone)}>
          <p className="text-sm text-fg-dim">Confirm the import works, then make a first authenticated call.</p>
          <CodeBlock label="shell" code={verifyInstall} />
          <CodeBlock label="python" code={verifySmoke} />
          <StatusPill
            kind={loading ? 'loading' : apiDone ? 'ok' : 'fail'}
            label={apiDone ? 'API reachable — credentials valid' : status?.api_error ? `Unreachable: ${status.api_error}` : 'API not reachable yet'}
          />
        </Step>

        <Step index={6} title="Discover your security group" state={stepState(sourcesDone)}>
          <p className="text-sm text-fg-dim">
            Each model source (HuggingFace, S3, GCS, Azure, local) has a default security group of
            rules, auto-created per tenant. Discover the UUID at runtime — never hardcode it.
          </p>
          <CodeBlock label="python" code={discoverGroups} />
          {sourcesDone && (
            <Callout tone="success" title="Source types detected on this tenant">
              <div className="flex flex-wrap gap-2 mt-1">
                {status!.source_types.map((s) => <Badge key={s} tone="neutral">{s}</Badge>)}
              </div>
            </Callout>
          )}
        </Step>

        <Step index={7} title="Run your first scan" state="active">
          <p className="text-sm text-fg-dim">
            Scan a known-clean model to see an <span className="text-success">ALLOWED</span> verdict,
            then a known-bad one for <span className="text-danger">BLOCKED</span>. The live drawer
            streams every SDK call as it happens.
          </p>
          <div className="flex flex-wrap gap-2">
            <LinkButton to="/scan?uri=https://huggingface.co/microsoft/DialoGPT-medium" variant="brand" size="sm">
              Scan a clean model <ArrowRight className="w-3.5 h-3.5" />
            </LinkButton>
            <LinkButton to="/scan?uri=https://huggingface.co/ykilcher/totally-harmless-model" variant="outline" size="sm">
              Scan a known-bad model
            </LinkButton>
          </div>
        </Step>

        <Step index={8} title="Gate models in your CI/CD" state="active">
          <p className="text-sm text-fg-dim">
            Wire scanning into your pipeline so a <span className="text-danger">BLOCKED</span> verdict
            (or a scan error) fails the build. Generate a ready-to-paste workflow, or grab the SDK/CLI
            snippets.
          </p>
          <div className="flex flex-wrap gap-2">
            <LinkButton to="/cicd" variant="accent" size="sm">CI/CD generator <ArrowRight className="w-3.5 h-3.5" /></LinkButton>
            <LinkButton to="/integrate" variant="outline" size="sm">SDK &amp; CLI snippets</LinkButton>
          </div>
        </Step>

        <Step index={9} title="Investigate findings in Strata Cloud Manager" state="active" last>
          <p className="text-sm text-fg-dim">
            The SDK returns a summary verdict. Per-file findings, threat descriptions, and remediation
            steps live in SCM under <span className="text-fg">Insights → Prisma AIRS → Model Security → Scans</span>.
            Scan detail pages here deep-link straight to the matching scan.
          </p>
          <LinkButton to="https://strata.paloaltonetworks.com" external variant="outline" size="sm">
            Open Strata Cloud Manager <ExternalLink className="w-3.5 h-3.5" />
          </LinkButton>
        </Step>
      </Stepper>

      <Callout tone="tip" title="Presenting to a customer?">
        Use the <Link to="/guide" className="text-brand hover:underline">printable Setup Guide</Link> as a
        leave-behind — it has the full end-to-end story, commands, and architecture in one page they
        can save as PDF.
      </Callout>
    </div>
  )
}

function ReadinessBanner({ status, loading }: { status: SetupStatus | null; loading: boolean }) {
  let kind: StatusKind = 'unknown'
  let label = 'Checking environment…'
  if (loading) kind = 'loading'
  else if (status && isReady(status)) { kind = 'ok'; label = 'Environment ready to scan' }
  else if (status) { kind = 'fail'; label = 'Setup incomplete — follow the steps below' }
  return (
    <div className="inline-flex items-center rounded-md border border-border bg-bg-subtle/60 px-3 py-1.5">
      <StatusPill kind={kind} label={label} />
    </div>
  )
}

function CredPill({ name, present, loading }: { name: string; present?: boolean; loading: boolean }) {
  const kind: StatusKind = loading ? 'loading' : present ? 'ok' : 'fail'
  return (
    <div className="inline-flex items-center rounded-md border border-border bg-bg-subtle/40 px-2.5 py-1">
      <StatusPill kind={kind} label={name} />
    </div>
  )
}
