import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { EnvInfo, GroupsList, ScanSummary } from '@/lib/types'
import { api } from '@/lib/api'
import {
  ScanLine, ExternalLink, ShieldAlert, FileWarning, UserX, FileX2, Rocket, ArrowRight,
} from 'lucide-react'
import { ScansTable } from '@/components/ScansTable'
import { Card, CardHeader } from '@/components/ui/Card'
import { LinkButton } from '@/components/ui/Button'
import { Eyebrow } from '@/components/ui/SectionHeader'
import { useSetupStatus, isReady } from '@/lib/setupStatus'

export function Dashboard() {
  const [env, setEnv] = useState<EnvInfo | null>(null)
  const [groups, setGroups] = useState<GroupsList | null>(null)
  const [scans, setScans] = useState<ScanSummary[] | null>(null)
  const [modelCount, setModelCount] = useState<number | null>(null)
  const [ruleCount, setRuleCount] = useState<number | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const { status } = useSetupStatus()

  useEffect(() => {
    Promise.all([
      api.env(),
      api.groups(),
      api.listScans(5),
      api.listModels(200).then((r) => r.models.length).catch(() => null),
      api.listRules().then((r) => r.security_rules.length).catch(() => null),
    ])
      .then(([e, g, s, m, ru]) => {
        setEnv(e); setGroups(g); setScans(s.scans); setModelCount(m); setRuleCount(ru)
      })
      .catch((e) => setErr(String(e)))
  }, [])

  const ready = isReady(status)

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-bg-raised p-6 bg-hero-glow">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="max-w-2xl">
            <Eyebrow>Prisma AIRS · Model Security</Eyebrow>
            <h1 className="text-2xl font-semibold mt-2 leading-tight">
              Antivirus for AI models — <span className="text-gradient">scan before you deploy</span>
            </h1>
            <p className="text-sm text-fg-dim mt-2">
              Inspect any model from HuggingFace, S3, GCS, Azure, or local storage for malicious code,
              backdoors, unsafe formats, and license violations — then gate it in CI/CD.
            </p>
            <div className="mt-4 rounded-lg border border-brand/40 bg-gradient-to-r from-brand/25 via-accent/20 to-purple-500/10 px-4 py-3 shadow-card">
              <p className="text-sm leading-relaxed text-fg">
                Built by <span className="font-semibold text-brand">Sergei Udovenko</span>, SE @ Palo Alto
                Networks, for <span className="font-semibold">demo &amp; learning</span> purposes.
              </p>
              <p className="text-sm leading-relaxed text-fg-dim mt-0.5">
                Not an official Palo Alto Networks product — just a guide to integrating Model Scanning.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <LinkButton to="/scan" variant="brand" size="md">
                <ScanLine className="w-4 h-4" /> Run a scan
              </LinkButton>
              {!ready ? (
                <LinkButton to="/start" variant="accent" size="md">
                  <Rocket className="w-4 h-4" /> Get started
                </LinkButton>
              ) : (
                <LinkButton to="/start" variant="outline" size="md">
                  <Rocket className="w-4 h-4" /> Onboarding
                </LinkButton>
              )}
              <LinkButton to="/guide" variant="ghost" size="md">Setup guide</LinkButton>
            </div>
          </div>
          {env && (
            <div className="shrink-0 rounded-lg border border-border bg-bg-subtle/50 px-4 py-3 text-[11px] font-mono space-y-1.5 min-w-[200px]">
              <div>
                <div className="text-fg-faint">TSG</div>
                <div className="text-fg break-all">{env.tsg_id || '(not set)'}</div>
              </div>
              <div>
                <div className="text-fg-faint">Base URL</div>
                <div className="text-fg break-all">{env.base_url}</div>
              </div>
              {status?.sdk_version && (
                <div>
                  <div className="text-fg-faint">SDK</div>
                  <div className="text-fg">v{status.sdk_version}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {err && <div className="text-danger text-sm">{err}</div>}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="SDK version" value={env?.sdk_version ?? status?.sdk_version ?? '…'} />
        <Stat label="Security groups" value={groups ? String(groups.security_groups.length) : '…'} to="/groups" />
        <Stat label="Models scanned" value={modelCount != null ? String(modelCount) : '…'} to="/models" />
        <Stat label="Rules enforced" value={ruleCount != null ? String(ruleCount) : '…'} to="/rules" />
      </div>

      {/* What we check */}
      <Card>
        <CardHeader
          title="What we check"
          subtitle="Every scan runs the full rule catalogue per source type"
          action={
            <Link to="/rules" className="text-xs text-fg-dim hover:text-fg inline-flex items-center gap-1">
              Browse rules <ArrowRight className="w-3 h-3" />
            </Link>
          }
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border">
          <Threat icon={ShieldAlert} title="Malicious code" sub="Pickle / H5 / GGUF execution" />
          <Threat icon={FileWarning} title="Supply chain" sub="Poisoned weights, tampering" />
          <Threat icon={UserX} title="Unverified publishers" sub="Unknown orgs, no model card" />
          <Threat icon={FileX2} title="Unsafe formats & licenses" sub="Pickle, H5; GPL / AGPL" />
        </div>
      </Card>

      {/* Recent scans */}
      <Card className="overflow-hidden">
        <CardHeader
          title="Recent scans"
          action={
            <Link to="/scans" className="text-xs text-fg-dim hover:text-fg inline-flex items-center gap-1">
              All scans <ExternalLink className="w-3 h-3" />
            </Link>
          }
        />
        <ScansTable scans={scans ?? []} emptyMessage={scans == null ? 'Loading…' : 'No scans yet — try running one.'} />
      </Card>
    </div>
  )
}

function Stat({ label, value, to }: { label: string; value: string; to?: string }) {
  const body = (
    <Card className="p-4 h-full hover:bg-bg-subtle/40 transition-colors">
      <div className="text-[11px] uppercase tracking-wide text-fg-faint">{label}</div>
      <div className="text-lg font-semibold mt-1 font-mono">{value}</div>
    </Card>
  )
  return to ? <Link to={to}>{body}</Link> : body
}

function Threat({ icon: Icon, title, sub }: { icon: typeof ShieldAlert; title: string; sub: string }) {
  return (
    <div className="bg-bg-raised p-4 flex gap-3">
      <Icon className="w-4 h-4 text-brand shrink-0 mt-0.5" />
      <div>
        <div className="text-sm font-medium">{title}</div>
        <div className="text-[11px] text-fg-faint mt-0.5">{sub}</div>
      </div>
    </div>
  )
}
