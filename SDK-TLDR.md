# SDK Installation TL;DR

## Why `pip install -r requirements.txt` Fails

**Short Answer:**
`model-security-client` and `airs-schemas` are **proprietary Palo Alto Networks packages** hosted on a private PyPI repository, not on public PyPI.

**What This Means:**
- ❌ `pip install model-security-client` → **Fails** (package not found)
- ❌ `pip install -r requirements.txt` → **Fails** (packages not found)
- ✅ `./setup-sdk.sh` → **Works** (authenticates + installs)

## The Two Missing Packages

### 1. `model-security-client`
**What it is:** Prisma AIRS Python SDK for scanning ML models
**What it does:** Provides `ModelSecurityAPIClient` class and API methods
**Why private:** Proprietary Palo Alto Networks software, requires license

### 2. `airs-schemas`
**What it is:** Schema definitions and data models for Prisma AIRS
**What it does:** Pydantic models for API requests/responses
**Why private:** Dependency of `model-security-client`, proprietary

> Installed versions float with the private index. Check what you have with
> `pip show model-security-client airs-schemas`, or see the Environment page in the demo portal.

## How to Install Them

### Option 1: Automated (Recommended)
```bash
cp .env.template .env
nano .env  # Add credentials
./setup-sdk.sh
```

### Option 2: Manual
```bash
export MODEL_SECURITY_CLIENT_ID="your-client-id"
export MODEL_SECURITY_CLIENT_SECRET="your-secret"
export TSG_ID="your-tsg-id"

pip install model-security-client --extra-index-url $(./get-pypi-url.sh)
```

## Where Do I Get Credentials?

**Login:** https://strata.paloaltonetworks.com

1. Settings → Identity & Access → Service Accounts (get Client ID/Secret)
2. Tenant Management (get TSG ID)

## What Happens Behind the Scenes

1. **Authentication:** Script exchanges your credentials for an access token
2. **PyPI URL:** Access token is used to get a time-limited private PyPI URL
3. **Installation:** `pip` uses that URL to download proprietary packages
4. **Security:** Your credentials never leave your machine, only tokens are sent

## Still Confused?

See [QUICK-START.md](QUICK-START.md) for the complete guide.
