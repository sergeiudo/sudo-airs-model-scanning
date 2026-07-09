# Quick Start - Once You Have Credentials

> **Prerequisites:** Python 3.10–3.12 (3.12 recommended; 3.13+ not supported), `git`, `jq`,
> and — only for the Demo Portal web UI — Node.js 20+. `setup-sdk.sh` creates the virtual
> environment for you (auto-selecting a supported Python), so no manual `venv` step is needed.

## 3-Step Installation

### 1. Add Credentials
```bash
cp .env.template .env
nano .env  # Fill in your credentials
```

### 2. Run Setup
```bash
./setup-sdk.sh
```

### 3. Launch Jupyter
```bash
source .venv/bin/activate
jupyter notebook
```

> Prefer the web UI? Run `./app/run-app.sh` instead (needs Node.js 20+) — it serves the
> Demo Portal on http://localhost:8765.

---

## Your Credentials Checklist

Get these from: **https://strata.paloaltonetworks.com**

- [ ] `MODEL_SECURITY_CLIENT_ID` (from Settings → Identity & Access → Service Accounts)
- [ ] `MODEL_SECURITY_CLIENT_SECRET` (shown only once at creation)
- [ ] `TSG_ID` (from Tenant Management)

---

## What's Ready to Use

✅ **Installed:**
- Jupyter Notebook environment
- Data analysis libraries (pandas, matplotlib, seaborn)
- Authentication scripts
- Setup automation

🔜 **After you run `./setup-sdk.sh`:**
- `model-security-client` SDK
- `airs-schemas` package

---

## Test the Installation

```python
from model_security_client.api import ModelSecurityAPIClient

client = ModelSecurityAPIClient(
    base_url="https://api.sase.paloaltonetworks.com/aims"
)

# List security groups
groups = client.list_security_groups()
print(f"✅ Found {len(groups.security_groups)} security groups")
```

---

## Need Help?

- 📖 SDK FAQ: `SDK-TLDR.md`
- 📄 Full guide: [INSTALLATION-GUIDE.md](INSTALLATION-GUIDE.md)
- 🌐 Product overview: [OVERVIEW.md](OVERVIEW.md)
