import type { EvalOutcome } from './types'

/** Normalise an SDK eval_outcome to a bare uppercase key (e.g. "EvalOutcome.BLOCKED" → "BLOCKED").
 *  Handles undefined/null by returning "UNKNOWN". */
export function normaliseOutcome(raw: EvalOutcome | undefined | null): string {
  if (!raw) return 'UNKNOWN'
  return String(raw).replace(/^EvalOutcome\./, '').toUpperCase()
}
