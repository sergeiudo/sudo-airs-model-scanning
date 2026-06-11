// Canonical commands and code snippets shown across the onboarding wizard,
// the takeaway setup guide, and the SDK & CLI integration page. Sourced from
// the repo's own scripts/docs/examples so the demo stays accurate.

export const ENV_VARS = ['MODEL_SECURITY_CLIENT_ID', 'MODEL_SECURITY_CLIENT_SECRET', 'TSG_ID'] as const

export const IAM_PERMISSIONS = ['ai_ms_pypi_auth', 'ai_ms.scans', 'ai_ms.security_groups'] as const

export const SOURCE_TYPES = ['HUGGING_FACE', 'S3', 'GCS', 'AZURE', 'LOCAL'] as const

export const dotenv = `# .env  (copy from .env.template — NEVER commit this file)
MODEL_SECURITY_CLIENT_ID="AIRS@your-tsg-id.iam.panserviceaccount.com"
MODEL_SECURITY_CLIENT_SECRET="your-client-secret-uuid"
TSG_ID="your-tsg-id"`

export const exportEnv = `export MODEL_SECURITY_CLIENT_ID="AIRS@your-tsg-id.iam.panserviceaccount.com"
export MODEL_SECURITY_CLIENT_SECRET="your-client-secret-uuid"
export TSG_ID="your-tsg-id"`

export const setupScript = `# One-time automated setup (creates .venv, installs deps + private SDK)
cp .env.template .env      # then fill in your three credentials
./setup-sdk.sh`

export const getPypiUrl = `# How the private SDK is reached: OAuth2 -> authenticated PyPI URL
# 1) client_credentials grant -> SCM access token
# 2) access token -> short-lived private PyPI index URL
# 3) pip install using that URL as --extra-index-url

PYPI_URL=$(./get-pypi-url.sh)
pip install model-security-client --extra-index-url "$PYPI_URL"`

export const manualInstall = `python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt          # base deps (NOT the SDK)
pip install model-security-client \\
  --extra-index-url $(./get-pypi-url.sh)  # the proprietary SDK`

export const verifyInstall = `python -c "from model_security_client.api import ModelSecurityAPIClient; print('SDK ok')"`

export const verifySmoke = `from model_security_client.api import ModelSecurityAPIClient

client = ModelSecurityAPIClient(base_url="https://api.sase.paloaltonetworks.com/aims")
groups = client.list_security_groups()
print(f"Found {len(groups.security_groups)} security groups")`

export const discoverGroups = `# Discover the security group for your source type at runtime.
# Do NOT hardcode UUIDs — default groups are auto-created per source type.
groups = client.list_security_groups()
hf_group = next(
    g for g in groups.security_groups
    if "HUGGING_FACE" in str(g.source_type)
)
print(hf_group.name, hf_group.uuid)`

export const sdkScan = `from uuid import UUID
from model_security_client.api import ModelSecurityAPIClient

client = ModelSecurityAPIClient(base_url="https://api.sase.paloaltonetworks.com/aims")

groups = client.list_security_groups()
hf_group = next(g for g in groups.security_groups if "HUGGING_FACE" in str(g.source_type))

result = client.scan(
    security_group_uuid=UUID(str(hf_group.uuid)),
    # NOTE: HuggingFace URIs MUST include the org/author segment.
    model_uri="https://huggingface.co/microsoft/DialoGPT-medium",
)
print(result.eval_outcome)  # e.g. EvalOutcome.ALLOWED`

export const sdkGate = `import sys
from uuid import UUID

def validate_model_before_deploy(client, group_uuid: str, model_uri: str) -> bool:
    result = client.scan(security_group_uuid=UUID(group_uuid), model_uri=model_uri)
    if str(result.eval_outcome) != "EvalOutcome.ALLOWED":
        s = result.eval_summary
        print(f"DEPLOYMENT BLOCKED — {s.rules_failed}/{s.total_rules} rules failed")
        print("Details: Strata Cloud Manager -> Insights -> Prisma AIRS -> Model Security")
        sys.exit(1)
    print("Model approved for deployment")
    return True`

export const cliScan = `# The wheel also installs a 'model-security' CLI — ideal for CI/CD gates.
model-security scan \\
  --security-group-uuid "<security-group-uuid>" \\
  --model-uri "https://huggingface.co/microsoft/DialoGPT-medium" \\
  --poll-timeout-secs 900 \\
  --block-on-errors
# Exit code is the gate: 0 = ALLOWED, non-zero = BLOCKED or scan error.`

// Per-source scan snippets. The SDK call is identical across sources — only the
// security-group source_type filter and the model_uri scheme change.
export const sourceScans: Record<string, string> = {
  HUGGING_FACE: `group = next(g for g in client.list_security_groups().security_groups
             if "HUGGING_FACE" in str(g.source_type))
result = client.scan(
    security_group_uuid=UUID(str(group.uuid)),
    model_uri="https://huggingface.co/openai-community/gpt2",  # include the org segment
)
print(result.eval_outcome)`,
  S3: `group = next(g for g in client.list_security_groups().security_groups
             if "S3" in str(g.source_type))
result = client.scan(
    security_group_uuid=UUID(str(group.uuid)),
    model_uri="s3://my-models-bucket/llama-3-8b/",  # prefix, not a single object
)
print(result.eval_outcome)
# The service reads the bucket via the S3 credential configured on your tenant in SCM.`,
  GCS: `group = next(g for g in client.list_security_groups().security_groups
             if "GCS" in str(g.source_type))
result = client.scan(
    security_group_uuid=UUID(str(group.uuid)),
    model_uri="gs://my-models-bucket/bert-base/",
)
print(result.eval_outcome)`,
  AZURE: `group = next(g for g in client.list_security_groups().security_groups
             if "AZURE" in str(g.source_type))
result = client.scan(
    security_group_uuid=UUID(str(group.uuid)),
    model_uri="https://myacct.blob.core.windows.net/models/mistral-7b/",
)
print(result.eval_outcome)`,
  LOCAL: `group = next(g for g in client.list_security_groups().security_groups
             if "LOCAL" in str(g.source_type))
result = client.scan(
    security_group_uuid=UUID(str(group.uuid)),
    model_uri="/models/llama-3-8b",  # absolute path; files are uploaded to the service
    ignore_patterns=["*.md", "*.txt", "*.png"],  # skip non-model files to speed uploads
)
print(result.eval_outcome)`,
}

export const advancedScan = `result = client.scan(
    security_group_uuid=UUID(group_uuid),
    model_uri="https://huggingface.co/large-org/large-model",
    allow_patterns=["*.bin", "*.json", "*.safetensors"],
    ignore_patterns=["*.md", "*.txt", "*.png"],
    poll_interval_secs=10,
    poll_timeout_secs=900,
)`
