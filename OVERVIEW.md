# Prisma AIRS Model Security - Technical Overview

## What It Does

Prisma AIRS Model Security scans machine learning models for security vulnerabilities before deployment. Think of it as antivirus software for AI models - it inspects model files for malicious code, backdoors, supply chain attacks, and policy violations.

## How It Works

### 1. Model Submission

You provide a model location to scan:

```python
from model_security_client.api import ModelSecurityAPIClient

client = ModelSecurityAPIClient(
    base_url="https://api.sase.paloaltonetworks.com/aims"
)

result = client.scan(
    security_group_uuid=your_security_group_id,
    model_uri="https://huggingface.co/microsoft/DialoGPT-medium"
)
```

**Supported Sources:**
- HuggingFace repositories
- Local file systems
- Amazon S3 buckets
- Azure Blob Storage
- Google Cloud Storage

### 2. The Scanning Process

**Step 1: Model Download**
- Prisma AIRS downloads the model files from the specified location
- Supports model version pinning and file filtering
- Typically takes 10-30 seconds depending on model size

**Step 2: File Analysis**
- Decompresses and examines all model files
- Identifies file formats (PyTorch, TensorFlow, ONNX, Pickle, etc.)
- Catalogs dependencies and metadata

**Step 3: Security Rule Evaluation**
- Runs model through your configured security group's rules
- Each rule checks for specific threats or policy violations
- Rules are categorized as BLOCKING or WARNING

**Step 4: Results Generation**
- Aggregates findings across all rules
- Calculates final verdict: ALLOWED, BLOCKED, or WARNING
- Returns summary via API

**Total Time:** 30-90 seconds for most models

### 3. Security Groups & Rules

**Security Groups** are collections of rules applied to models from specific sources.

**Default Groups:**
- `Default HUGGING_FACE` - Rules for HuggingFace models
- `Default LOCAL` - Rules for local filesystem models
- `Default S3` - Rules for Amazon S3
- `Default AZURE` - Rules for Azure Blob Storage
- `Default GCS` - Rules for Google Cloud Storage

**Each group contains ~11 active rules checking for:**

#### 🔴 Critical Threats (BLOCKING)
- **Malicious Code Execution**
  - Pickle deserialization attacks that run arbitrary code
  - Hidden executable payloads in model weights
  - Shell command injection via model metadata

- **Supply Chain Attacks**
  - Compromised dependencies in requirements.txt
  - Poisoned model weights from untrusted sources
  - Tampered model cards or configuration files

- **Neural Backdoors**
  - Hidden triggers that cause misclassification
  - Trojan patterns embedded in model architecture
  - Data exfiltration mechanisms

#### 🟡 Policy Violations (WARNING or BLOCKING)
- **License Issues**
  - GPL/AGPL violations for commercial use
  - Missing license files
  - Incompatible license combinations

- **Unsafe File Formats**
  - Pickle files (allows arbitrary code execution)
  - Keras H5 files (unsafe serialization)
  - Unsigned or unverified binaries

- **Unverified Publishers**
  - Models from unknown organizations
  - Missing model cards or documentation
  - Lack of security metadata

### 4. Scan Results

The SDK returns a **summary result**:

```python
{
  "eval_outcome": "BLOCKED",           # Final verdict
  "uuid": "scan-id-uuid",              # Unique scan identifier
  "eval_summary": {
    "rules_passed": 7,                 # Rules that passed
    "rules_failed": 4,                 # Rules that failed
    "total_rules": 11                  # Total rules evaluated
  },
  "total_files_scanned": 12,           # Files examined
  "scanner_version": "1.6.3",          # Scanner version
  "model_formats": ["pytorch", "json"] # Detected formats
}
```

**Verdict Meanings:**

- **ALLOWED** ✅ - Model passed all security checks, safe to deploy
- **BLOCKED** ⛔ - Model failed one or more BLOCKING rules, deployment prevented
- **WARNING** ⚠️ - Model has non-critical issues, review recommended

### 5. Detailed Results (Strata Cloud Manager Only)

**Important:** The SDK returns summary data only. Detailed violation information is exclusively available in Strata Cloud Manager.

**To view full details:**
1. Log in: https://strata.paloaltonetworks.com
2. Navigate: **Insights → Prisma AIRS → Model Security → Scans**
3. Click your Scan ID
4. View:
   - **Which specific rules failed** - Name and description of each violation
   - **Threat descriptions** - Technical details of the security issue
   - **File-level findings** - Which files triggered which rules
   - **Remediation steps** - How to fix the issues
   - **Severity levels** - Critical, High, Medium, Low classifications
   - **InsightsDB links** - Deep threat intelligence for each finding

**Example violation details:**
```
Rule: Deserialization Threat Detection
Status: FAILED
Severity: CRITICAL
File: model.pkl
Issue: Pickle file contains unsafe __reduce__ method allowing arbitrary code execution
Threat: PAIT-PICKLE-001
Remediation:
  1. Convert model to SafeTensors format
  2. Use ONNX for cross-framework compatibility
  3. Avoid pickle serialization in production
  4. Implement code signing for model files
```

### 6. Common Scan Outcomes

#### Scenario 1: Clean Model from Verified Publisher

```
Model: https://huggingface.co/microsoft/phi-2
Outcome: ALLOWED ✅
Rules Passed: 11/11
Reason:
  - Trusted organization (Microsoft)
  - SafeTensors format (secure)
  - Valid MIT license
  - Complete model card
  - No malicious patterns detected
```

#### Scenario 2: Model with License Violation

```
Model: https://huggingface.co/some-org/gpl-model
Outcome: BLOCKED ⛔
Rules Failed: 1/11 (License Validation)
Reason:
  - GPL-3.0 license incompatible with commercial use
  - Company policy requires permissive licenses only
  - Model otherwise clean
```

#### Scenario 3: Unsafe File Format

```
Model: https://huggingface.co/unknown/pickle-model
Outcome: BLOCKED ⛔
Rules Failed: 2/11 (Format Check, Trust Verification)
Reason:
  - Uses pickle format (allows code execution)
  - Publisher not in verified organization list
  - Recommended: Convert to SafeTensors or ONNX
```

#### Scenario 4: Known Malicious Model

```
Model: https://huggingface.co/attacker/backdoor-model
Outcome: BLOCKED ⛔
Rules Failed: 4/11
Reason:
  - Malicious code detected in model weights
  - Neural backdoor pattern identified
  - Supply chain compromise indicators
  - Data exfiltration mechanism found
```

### 7. Integration Patterns

#### CI/CD Pipeline Integration

```python
def validate_model_before_deployment(model_uri):
    """Gate deployment on security scan results."""
    result = client.scan(
        security_group_uuid=SECURITY_GROUP_UUID,
        model_uri=model_uri
    )

    if result.eval_outcome != "ALLOWED":
        print(f"❌ DEPLOYMENT BLOCKED")
        print(f"Rules failed: {result.eval_summary.rules_failed}")
        print(f"View details: https://strata.paloaltonetworks.com")
        sys.exit(1)  # Fail the pipeline

    print(f"✅ Model approved for deployment")
    return True
```

#### Batch Scanning

```python
models = [
    "https://huggingface.co/openai-community/gpt2",
    "https://huggingface.co/google-bert/bert-base-uncased",
    "https://huggingface.co/microsoft/DialoGPT-medium"
]

for model_uri in models:
    result = client.scan(
        security_group_uuid=SECURITY_GROUP_UUID,
        model_uri=model_uri
    )

    print(f"{model_uri}: {result.eval_outcome}")
    # Output: Shows ALLOWED/BLOCKED status for each model
```

#### Advanced Scanning Options

```python
result = client.scan(
    security_group_uuid=SECURITY_GROUP_UUID,
    model_uri="https://huggingface.co/large-model/model-name",

    # File filtering (scan only specific files)
    allow_patterns=["*.bin", "*.json", "*.safetensors"],
    ignore_patterns=["*.md", "*.txt", "*.png"],

    # Timeout configuration (for large models)
    poll_interval_secs=10,      # Check status every 10 seconds
    poll_timeout_secs=900,      # Wait up to 15 minutes
    scan_timeout_secs=900,      # Scanner timeout 15 minutes

    # Version pinning
    model_version="abc123def"   # Specific git commit hash
)
```

### 8. Why Models Get Blocked

**Top 5 Reasons Models Fail Scans:**

1. **Unsafe Serialization Formats (40%)** - Pickle, Keras H5 files
2. **License Violations (25%)** - GPL/AGPL when policy requires permissive licenses
3. **Unverified Publishers (20%)** - Models from unknown organizations
4. **Missing Metadata (10%)** - No model card, license, or README
5. **Actual Threats (5%)** - Malicious code, backdoors, supply chain attacks

**Note:** Most failures are policy violations, not malicious intent. Real threats are rare but critical when found.

### 9. Technical Architecture

```
┌─────────────────┐
│  Your Code      │
│  (Python SDK)   │
└────────┬────────┘
         │ HTTPS API Call
         ▼
┌─────────────────────────────────────┐
│  Prisma AIRS API                    │
│  (api.sase.paloaltonetworks.com)    │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Model Download & Analysis          │
│  - Fetch from source                │
│  - Extract files                    │
│  - Identify formats                 │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Security Rule Engine               │
│  - Malware detection                │
│  - License validation               │
│  - Format checking                  │
│  - Publisher verification           │
│  - Backdoor detection               │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Results Storage                    │
│  - Strata Cloud Manager             │
│  - Detailed findings                │
│  - Audit trail                      │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────┐
│  Your Code      │
│  (Scan Result)  │
└─────────────────┘
```

### 10. Security Best Practices

**Before Deployment:**
1. **Always scan models** from external sources (HuggingFace, GitHub, etc.)
2. **Verify scan results** in Strata Cloud Manager for details
3. **Block deployments** on BLOCKED verdicts
4. **Investigate warnings** before proceeding

**During Development:**
1. **Use SafeTensors or ONNX** formats instead of Pickle
2. **Include model cards** with security metadata
3. **Use permissive licenses** (MIT, Apache 2.0) when possible
4. **Verify publisher identity** before downloading models

**In Production:**
1. **Integrate into CI/CD** to gate deployments
2. **Scan before serving** to users
3. **Monitor scan results** for trends
4. **Rotate and rescan** models regularly

### 11. Limitations & Considerations

**What the Scanner Can Do:**
✅ Detect malicious code patterns in model files
✅ Identify unsafe serialization formats
✅ Validate licenses and metadata
✅ Verify publisher identity
✅ Find known backdoor signatures

**Best Practice:** Use model scanning as **one layer** of defense, combined with:
- Input validation
- Output monitoring
- Runtime sandboxing
- Adversarial testing
- Regular security audits

### 12. Performance Characteristics

**Scan Times:**
- Small models (< 100MB): 30-60 seconds
- Medium models (100MB - 1GB): 1-2 minutes
- Large models (1GB - 10GB): 2-5 minutes
- Extra-large models (> 10GB): 5-15 minutes

**File Filtering Impact:**
```python
# Scan only model weights (faster)
allow_patterns=["*.bin", "*.safetensors"]
ignore_patterns=["*.md", "*.txt", "*.png"]
# Result: 40-60% faster for models with large documentation
```

**Rate Limits:**
- API calls: Standard rate limiting applies
- Concurrent scans: Check your tier limits
- Storage: Scan results retained for 90 days

### 13. Cost & Licensing

**Prisma AIRS Model Security:**
- Requires Prisma Cloud subscription
- Model scanning included in AIRS license
- No per-scan charges (check your specific agreement)
- Unlimited scans within rate limits

**SDK:**
- Open source Python client
- Free to use with valid Prisma Cloud credentials
- No separate licensing required

---

## Quick Reference

| Aspect | Details |
|--------|---------|
| **Scan Time** | 30-90 seconds typical |
| **Supported Sources** | HuggingFace, S3, Azure, GCS, Local |
| **Formats Detected** | PyTorch, TensorFlow, ONNX, Pickle, Keras, SafeTensors |
| **Rule Categories** | Malware, License, Format, Trust, Backdoor |
| **Results Location** | Summary via API, Details in Strata Cloud Manager |
| **Integration** | CI/CD, CLI, Python SDK |
| **Verdicts** | ALLOWED, BLOCKED, WARNING |

---

## Learn More

- **Documentation:** https://docs.paloaltonetworks.com/prisma/prisma-cloud/prisma-cloud-admin/prisma-cloud-airs
- **SDK:** Installed via private PyPI (see [SDK-TLDR.md](SDK-TLDR.md))
- **Strata Cloud Manager:** https://strata.paloaltonetworks.com
- **Threat Intelligence:** https://insightsdb.paloaltonetworks.com

---

**Last Updated:** 2025-10-24
