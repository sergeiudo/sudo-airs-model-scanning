import type { EnvInfo } from './types'

/** Build a Strata Cloud Manager deep-link to a scan, using the live env config. */
export function scmScanUrl(env: EnvInfo | null, scanUuid: string | null): string | null {
  if (!env?.scm_base || !env?.scm_scan_path || !scanUuid) return null
  const path = env.scm_scan_path.replace('{uuid}', encodeURIComponent(scanUuid))
  return env.scm_base + path
}
