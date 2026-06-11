export type SDKEvent = {
  id: string
  method: string
  kwargs: Record<string, unknown>
  status: 'pending' | 'ok' | 'error'
  started_at: number
  duration_ms: number | null
  response_summary: string | null
  response_full: unknown
  error: string | null
}

export type EnvInfo = {
  sdk_version: string
  airs_schemas_version: string
  base_url: string
  tsg_id: string
  scm_base: string
  scm_scan_path: string  // contains "{uuid}" placeholder
  methods: string[]
}

export type SecurityGroup = {
  uuid: string
  name: string
  source_type: string
  description: string | null
}

export type GroupsList = { security_groups: SecurityGroup[] }

export type EvalSummary = {
  rules_passed: number
  rules_failed: number
  total_rules: number
}

export type EvalOutcome = 'ALLOWED' | 'BLOCKED' | 'WARNING' | 'ERROR' | string

export type ScanSummary = {
  uuid: string
  model_uri: string
  eval_outcome: EvalOutcome
  eval_summary?: EvalSummary
  created_at: string
  source_type?: string
}

export type ScanDetail = ScanSummary & {
  updated_at?: string
  scanner_version?: string
  model_formats?: string[]
  total_files_scanned?: number
  total_files_skipped?: number
  enabled_rule_count_snapshot?: number
  security_group_uuid?: string
  security_group_name?: string
  error_code?: string | null
  error_message?: string | null
  // Anything else the SDK adds is preserved as raw JSON in the detail view.
  [extra: string]: unknown
}

export type ScansList = { scans: ScanSummary[] }

export type ScanJob = {
  job_id: string
  status: 'pending' | 'done' | 'error'
  scan_id: string | null
  result: ScanDetail | null
  error: string | null
}

export type ScanRequestAdvanced = {
  allow_patterns?: string[]
  ignore_patterns?: string[]
  poll_interval_secs?: number
  poll_timeout_secs?: number
}

export type SecurityRule = {
  uuid: string
  name: string
  description?: string
  severity?: 'HIGH' | 'MEDIUM' | 'LOW' | string
  [extra: string]: unknown
}

export type SecurityRulesList = { security_rules: SecurityRule[] }

export type GroupRule = {
  name: string
  enabled?: boolean
  blocking?: boolean
  rule_uuid?: string
  severity?: string
  [extra: string]: unknown
}

export type GroupDetail = {
  uuid: string
  name: string
  source_type: string
  description?: string | null
  rules?: GroupRule[]
  [extra: string]: unknown
}

export type ModelSummary = {
  uuid: string
  name?: string
  uri?: string
  source_type?: string
  author?: string
  created_at?: string
  [extra: string]: unknown
}

export type ModelsList = { models: ModelSummary[] }

export type ModelVersion = {
  uuid: string
  name?: string
  version_id?: string
  tag?: string
  created_at?: string
  [extra: string]: unknown
}

export type ModelVersionsList = { model_versions: ModelVersion[] }

export type ModelFile = {
  uuid?: string
  name?: string
  path?: string
  size?: number
  format?: string
  [extra: string]: unknown
}

export type ModelFilesList = { files: ModelFile[] }

export type Violation = {
  rule_name?: string
  severity?: string
  threat?: string
  issue?: string
  file?: string
  file_path?: string
  remediation?: { steps?: string[]; [k: string]: unknown }
  [extra: string]: unknown
}

export type ViolationsList = { violations: Violation[] }

export type Evaluation = {
  rule_name?: string
  outcome?: 'PASSED' | 'FAILED' | string
  severity?: string
  detail?: string
  [extra: string]: unknown
}

export type EvaluationsList = { evaluations: Evaluation[] }

export type SchemaEntry = {
  name: string
  module: string
  schema: Record<string, unknown>
  error?: string
}

export type SchemasList = { schemas: SchemaEntry[] }

export type ReplLine =
  | { kind: 'in'; text: string }
  | { kind: 'out'; text: string; ok: boolean; more: boolean }

export type SetupStatus = {
  sdk_installed: boolean
  sdk_version: string | null
  schemas_installed: boolean
  schemas_version: string | null
  creds_present: Record<string, boolean>
  all_creds_present: boolean
  api_reachable: boolean
  api_error: string | null
  source_types: string[]
}
