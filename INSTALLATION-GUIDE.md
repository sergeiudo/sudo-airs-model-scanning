# Prisma AIRS Model Security - Installation Guide

## Prerequisites

- **Python 3.10 - 3.12** (3.12 recommended; 3.13 has compatibility issues)
- **pip** (included with Python)
- **jq** (installed automatically by setup script, or `brew install jq` / `apt install jq`)
- **Prisma AIRS credentials** from Strata Cloud Manager

## Step 1: Clone the Repository

```bash
git clone https://github.com/sergeiudo/sudo-airs-model-scanning.git
cd sudo-airs-model-scanning
```

## Step 2: Create a Virtual Environment

```bash
python3 -m venv .venv
source .venv/bin/activate
```

## Step 3: Install Base Dependencies

```bash
pip install -r requirements.txt
```

This installs the Jupyter environment and data visualization libraries. The proprietary SDK is installed separately in the next step.

## Step 4: Configure Credentials

```bash
cp .env.template .env
```

Edit `.env` with your credentials from [Strata Cloud Manager](https://strata.paloaltonetworks.com):

| Variable | Where to Find It | Format |
|----------|-------------------|--------|
| `MODEL_SECURITY_CLIENT_ID` | Settings > Identity & Access > Service Accounts | `AIRS@your-tsg-id.iam.panserviceaccount.com` |
| `MODEL_SECURITY_CLIENT_SECRET` | Shown once when creating the service account | UUID |
| `TSG_ID` | Settings > Tenant Management | Numeric ID |

## Step 5: Install the SDK

```bash
./setup-sdk.sh
```

This script authenticates with your credentials, retrieves a time-limited private PyPI URL, and installs `model-security-client` and its dependency `airs-schemas`.

**Why a separate step?** These packages live on a private PyPI server that requires OAuth2 authentication. Standard `pip install` cannot access them without the authenticated URL.

## Step 6: Verify the Installation

```bash
python -c "from model_security_client.api import ModelSecurityAPIClient; print('SDK imported successfully')"
```

## Step 7: Launch Jupyter

```bash
jupyter notebook
```

Open either notebook:
- `notebooks/prisma-airs-interactive-model-security.ipynb` — Widget-based interactive scanner
- `notebooks/model_security_demo.ipynb` — Step-by-step walkthrough

## Troubleshooting

### `pip install` fails for `model-security-client`

This is expected. The SDK is not on public PyPI. Use `./setup-sdk.sh` instead, which authenticates and installs from the private repository.

### `get-pypi-url.sh` returns empty or errors

Verify your credentials are correct:
```bash
set -a && source .env && set +a
echo $MODEL_SECURITY_CLIENT_ID
echo $TSG_ID
```

Ensure the service account has the correct permissions in Strata Cloud Manager.

### Python version errors

Check your version: `python3 --version`. The SDK requires Python 3.10-3.12. If you have 3.13+, install 3.12 via `pyenv` or your package manager:

```bash
# macOS with pyenv
pyenv install 3.12
pyenv local 3.12
python3 -m venv .venv
source .venv/bin/activate
```

### `jq` not found

The setup script tries to install `jq` automatically. If it fails:
- macOS: `brew install jq`
- Ubuntu/Debian: `sudo apt install jq`
- RHEL/Fedora: `sudo dnf install jq`

### HuggingFace URL validation errors

Model URLs must include the organization or author:
- Wrong: `https://huggingface.co/gpt2`
- Correct: `https://huggingface.co/openai-community/gpt2`

## What Gets Installed

| Package | Source | Purpose |
|---------|--------|---------|
| `model-security-client` | Private PyPI | Prisma AIRS Python SDK |
| `airs-schemas` | Private PyPI | SDK data models (auto-installed as dependency) |
| `jupyter`, `notebook` | Public PyPI | Jupyter environment |
| `ipywidgets` | Public PyPI | Interactive notebook widgets |
| `pandas`, `matplotlib`, `seaborn` | Public PyPI | Data analysis and visualization |

## Next Steps

- [QUICK-START.md](QUICK-START.md) — 3-step quick start
- [SDK-TLDR.md](SDK-TLDR.md) — Why `pip install` fails and how the private PyPI works
- [OVERVIEW.md](OVERVIEW.md) — Technical overview of Prisma AIRS Model Security
