# Prisma AIRS Model Security - Notebooks

## Notebooks

- **`prisma-airs-interactive-model-security.ipynb`** - Interactive demo with widget-based scanner UI, batch scanning, history analytics, and visualizations
- **`model_security_demo.ipynb`** - Step-by-step demo covering the full Model Security workflow

## What's Covered

1. **Setup & Authentication** - Configure credentials and initialize SDK
2. **First Model Scan** - Scan Microsoft DialoGPT model
3. **Multiple Model Testing** - Batch scan different models
4. **Scan History & Analytics** - View past scans with visualizations
5. **Detailed Scan Information** - Retrieve comprehensive scan details
6. **Advanced Features** - File filtering and custom timeouts
7. **Production Integration** - CI/CD validation function example
8. **Export Results** - Save scan data to CSV/JSON

## Prerequisites

### 1. Virtual Environment

```bash
cd /path/to/sudo-airs-model-scanning
source .venv/bin/activate
```

### 2. Credentials

Set environment variables before launching Jupyter:

```bash
export MODEL_SECURITY_CLIENT_ID="AIRS@your-tsg-id.iam.panserviceaccount.com"
export MODEL_SECURITY_CLIENT_SECRET="your-client-secret-uuid"
export TSG_ID="your-tsg-id"
```

Or use the `.env` file approach described in the main README.

### 3. Security Groups

Security groups are discovered dynamically by the notebooks. No hardcoded UUIDs needed — the SDK queries your tenant's security groups at runtime.

## Running

```bash
jupyter notebook

# Open either notebook and run all cells (Shift+Enter)
```

## Troubleshooting

### ValidationError on URLs

HuggingFace URLs must include author/organization:
- Wrong: `https://huggingface.co/gpt2`
- Correct: `https://huggingface.co/openai-community/gpt2`

### Import Errors

```bash
# Activate virtual environment first
source .venv/bin/activate

# Reinstall if needed
pip install model-security-client --extra-index-url $(../get-pypi-url.sh)
```

## View Detailed Scan Results

The SDK returns summary data only. For detailed violation information:

1. Go to: https://strata.paloaltonetworks.com
2. Navigate to: **Insights → Prisma AIRS → Model Security → Scans**
3. Click on your Scan ID (displayed in notebook output)

## Questions?

See the main [README](../README.md) for project overview and setup instructions.
