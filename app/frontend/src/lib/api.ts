import type {
  EnvInfo, GroupDetail, GroupsList, EvaluationsList, ModelFilesList,
  ModelsList, ModelVersionsList, ScanDetail, ScanJob, ScansList,
  ScanRequestAdvanced, SchemasList, SecurityRulesList, SetupStatus, ViolationsList,
} from './types'

async function jget<T>(path: string): Promise<T> {
  const r = await fetch(path)
  if (!r.ok) throw new Error(`${path} → ${r.status}`)
  return r.json() as Promise<T>
}

async function jpost<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error(`${path} → ${r.status}`)
  return r.json() as Promise<T>
}

export const api = {
  env: () => jget<EnvInfo>('/api/env'),
  setupStatus: () => jget<SetupStatus>('/api/setup/status'),
  groups: () => jget<GroupsList>('/api/groups'),
  getGroup: (uuid: string) => jget<GroupDetail>(`/api/groups/${uuid}`),
  listRules: () => jget<SecurityRulesList>('/api/rules'),
  listSchemas: () => jget<SchemasList>('/api/schemas'),
  listModels: (limit = 50) => jget<ModelsList>(`/api/models?limit=${limit}`),
  listModelVersions: (modelUuid: string) => jget<ModelVersionsList>(`/api/models/${modelUuid}/versions`),
  listVersionFiles: (versionUuid: string) => jget<ModelFilesList>(`/api/model-versions/${versionUuid}/files`),
  startScan: (body: { security_group_uuid: string; model_uri: string } & ScanRequestAdvanced) =>
    jpost<{ scan_job_id: string }>('/api/scans', body),
  scanJob: (jobId: string) => jget<ScanJob>(`/api/scan-jobs/${jobId}`),
  listScans: (limit = 50) => jget<ScansList>(`/api/scans?limit=${limit}`),
  getScan: (uuid: string) => jget<ScanDetail>(`/api/scans/${uuid}`),
  getScanViolations: (uuid: string) => jget<ViolationsList>(`/api/scans/${uuid}/violations`),
  getScanEvaluations: (uuid: string) => jget<EvaluationsList>(`/api/scans/${uuid}/evaluations`),
}
