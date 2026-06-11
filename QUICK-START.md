# Quick Start - Once You Have Credentials

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
jupyter notebook
```

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
