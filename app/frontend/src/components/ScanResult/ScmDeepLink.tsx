import { ExternalLink } from 'lucide-react'
import type { EnvInfo } from '@/lib/types'
import { scmScanUrl } from '@/lib/scm'

export function ScmDeepLink({ env, scanUuid }: { env: EnvInfo | null; scanUuid: string | null }) {
  const url = scmScanUrl(env, scanUuid)
  if (!url) {
    return (
      <div className="text-xs text-fg-faint">
        Per-file findings live in Strata Cloud Manager → Insights → Prisma AIRS → Model Security → Scans.
      </div>
    )
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
    >
      Open in Strata Cloud Manager
      <ExternalLink className="w-3.5 h-3.5" />
    </a>
  )
}
