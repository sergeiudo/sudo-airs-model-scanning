// Canonical metadata for every model source type Prisma AIRS Model Security supports.
// Single source of truth for the Scan page, the Sources page, and integration snippets.
// URI formats and SDK call shapes are exact; cloud-access (IAM) setup is configured in
// Strata Cloud Manager — those steps point to where, not invented mechanics.

export type SourceId = 'HUGGING_FACE' | 'S3' | 'GCS' | 'AZURE' | 'LOCAL'

export type SampleModel = {
  uri: string
  label: string
  expect: 'ALLOWED' | 'BLOCKED' | 'WARNING'
}

export type SourceMeta = {
  id: SourceId
  label: string
  scheme: string
  exampleUri: string
  uriHint: string
  /** How the scanner obtains the model files for this source. */
  access: string
  /** Exact, ordered enablement steps for a customer environment. */
  enablement: string[]
  /** Curated demo models (HuggingFace only — cloud/local depend on customer assets). */
  samples?: SampleModel[]
}

export const SOURCES: Record<SourceId, SourceMeta> = {
  HUGGING_FACE: {
    id: 'HUGGING_FACE',
    label: 'HuggingFace',
    scheme: 'https://huggingface.co/<org>/<model>',
    exampleUri: 'https://huggingface.co/openai-community/gpt2',
    uriHint: 'Must include the org/author segment — huggingface.co/gpt2 fails validation.',
    access: 'The service pulls the repo directly from huggingface.co over HTTPS. Public repos need no extra credentials; private repos require a HuggingFace token configured on the tenant.',
    enablement: [
      'Confirm outbound HTTPS to huggingface.co is allowed from the scanning service.',
      'For private/gated repos, add a HuggingFace access token in Strata Cloud Manager → Insights → Prisma AIRS → Model Security → Settings.',
      'Use the Default HUGGING_FACE security group (auto-created) or a custom one.',
      'Scan with the full URI including the org segment.',
    ],
    samples: [
      { uri: 'https://huggingface.co/microsoft/DialoGPT-medium', label: 'microsoft/DialoGPT-medium', expect: 'ALLOWED' },
      { uri: 'https://huggingface.co/openai-community/gpt2', label: 'openai-community/gpt2', expect: 'ALLOWED' },
      { uri: 'https://huggingface.co/ykilcher/totally-harmless-model', label: 'ykilcher/totally-harmless-model (GGUF injection)', expect: 'BLOCKED' },
    ],
  },
  S3: {
    id: 'S3',
    label: 'Amazon S3',
    scheme: 's3://<bucket>/<prefix>/',
    exampleUri: 's3://my-models-bucket/llama-3-8b/',
    uriHint: 'Point at the prefix (folder) that holds the model files, not a single object.',
    access: 'The service reads objects from your bucket using cloud credentials you grant it (cross-account IAM role or access keys configured on the tenant).',
    enablement: [
      'In Strata Cloud Manager → Insights → Prisma AIRS → Model Security → Settings, add an S3 source credential (cross-account role or access key).',
      'Grant that principal read access to the bucket/prefix (s3:GetObject, s3:ListBucket).',
      'Allow outbound HTTPS to s3.<region>.amazonaws.com from the scanning service.',
      'Use the Default S3 security group (or a custom one) and scan with the s3:// URI.',
    ],
  },
  GCS: {
    id: 'GCS',
    label: 'Google Cloud Storage',
    scheme: 'gs://<bucket>/<prefix>/',
    exampleUri: 'gs://my-models-bucket/bert-base/',
    uriHint: 'Point at the prefix that holds the model files.',
    access: 'The service reads objects using a Google service account you authorize on the tenant.',
    enablement: [
      'In Strata Cloud Manager → Model Security → Settings, add a GCS source credential (service-account key).',
      'Grant that service account roles/storage.objectViewer on the bucket.',
      'Allow outbound HTTPS to storage.googleapis.com.',
      'Use the Default GCS security group (or custom) and scan with the gs:// URI.',
    ],
  },
  AZURE: {
    id: 'AZURE',
    label: 'Azure Blob Storage',
    scheme: 'https://<account>.blob.core.windows.net/<container>/<prefix>/',
    exampleUri: 'https://myacct.blob.core.windows.net/models/mistral-7b/',
    uriHint: 'Use the blob endpoint URL down to the prefix that holds the model files.',
    access: 'The service reads blobs using credentials you authorize on the tenant (SAS token or service principal).',
    enablement: [
      'In Strata Cloud Manager → Model Security → Settings, add an Azure source credential (SAS token or service principal).',
      'Grant read/list on the container (Storage Blob Data Reader).',
      'Allow outbound HTTPS to <account>.blob.core.windows.net.',
      'Use the Default AZURE security group (or custom) and scan with the blob URL.',
    ],
  },
  LOCAL: {
    id: 'LOCAL',
    label: 'Local filesystem',
    scheme: '/abs/path/to/model  (or  file:///abs/path/to/model)',
    exampleUri: '/models/llama-3-8b',
    uriHint: 'An absolute path on the machine running the SDK/CLI. Files are uploaded to the service for scanning.',
    access: 'The SDK/CLI reads files from the given path on the local machine and uploads them to the service — no cloud credentials needed.',
    enablement: [
      'No source credential needed; the local machine reads the files.',
      'Allow outbound HTTPS from the machine to api.sase.paloaltonetworks.com.',
      'Use the Default LOCAL security group (or custom) and scan with the absolute path.',
      'Use allow_patterns/ignore_patterns to skip large non-model files and speed uploads.',
    ],
  },
}

export const SOURCE_ORDER: SourceId[] = ['HUGGING_FACE', 'S3', 'GCS', 'AZURE', 'LOCAL']
