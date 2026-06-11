# Security Policy

## Reporting Security Vulnerabilities

We take the security of this project seriously. If you discover a security vulnerability, please follow these steps:

### Private Disclosure

**DO NOT** create a public GitHub issue for security vulnerabilities.

Instead, please report security issues privately:

1. **Contact:** Open a GitHub issue with minimal details and request private disclosure
2. **Include:**
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### What to Report

Please report any vulnerabilities including:

- Authentication bypass
- Privilege escalation
- Injection vulnerabilities (code injection, prompt injection)
- Information disclosure
- Denial of service attacks
- Insecure credential handling
- Dependencies with known CVEs

### What NOT to Report

The following are **not** security vulnerabilities:

- Models being blocked by security scans (this is expected behavior)
- Rate limiting or API throttling
- Missing features or enhancement requests
- General support questions

## Security Best Practices

###  Credential Management

**CRITICAL:** Never commit credentials to version control.

#### ✅ DO:
- Use environment variables for all credentials
- Store credentials in `~/.bashrc` or `~/.zshrc`
- Use secret management systems (AWS Secrets Manager, HashiCorp Vault)
- Rotate credentials regularly (recommended: every 90 days)
- Use service accounts with minimum required permissions
- Add `.env` files to `.gitignore`

#### ❌ DON'T:
- Hardcode credentials in Python scripts
- Commit `.env` files to git
- Share credentials via email or chat
- Use personal credentials for automated systems
- Store credentials in notebooks
- Screenshot or share credentials in documentation

### Environment Variables

Set credentials securely:

```bash
# Add to ~/.bashrc or ~/.zshrc
export MODEL_SECURITY_CLIENT_ID="AIRS@your-tsg-id.iam.panserviceaccount.com"
export MODEL_SECURITY_CLIENT_SECRET="your-client-secret-uuid"
export TSG_ID="your-tsg-id"

# Reload shell configuration
source ~/.bashrc  # or source ~/.zshrc
```

### Service Account Permissions

Use least-privilege access:

1. Create dedicated service accounts for automation
2. Grant only required permissions:
   - `prisma-airs.model-security:scan` - Scan models
   - `prisma-airs.model-security:read` - View scan results
3. Do NOT grant admin or write permissions unless required
4. Review permissions quarterly

### Jupyter Notebook Security

When using notebooks:

1. **Clear sensitive output before committing:**
   ```bash
   # Install nbstripout to automatically strip notebook outputs
   pip install nbstripout
   nbstripout --install
   ```

2. **Never hardcode credentials in cells**
3. **Use kernel restart to clear sensitive variables**
4. **Don't share notebooks with filled-in credentials**

### Dependencies

#### Vulnerability Scanning

Regularly scan dependencies for vulnerabilities:

```bash
# Install safety
pip install safety

# Scan installed packages
safety check

# Scan requirements.txt
safety check -r requirements.txt
```

#### Keep Dependencies Updated

```bash
# Check for outdated packages
pip list --outdated

# Update specific package
pip install --upgrade model-security-client

# Update all packages (test thoroughly!)
pip install --upgrade -r requirements.txt
```

### Network Security

#### API Endpoints

- Always use HTTPS (never HTTP)
- Verify SSL certificates
- Use API endpoints: `https://api.sase.paloaltonetworks.com/aims`
- Do not disable SSL verification

#### Firewall Rules

If behind corporate firewall, allow outbound HTTPS to:
- `api.sase.paloaltonetworks.com` (port 443)
- `strata.paloaltonetworks.com` (port 443)
- `huggingface.co` (port 443) - if scanning HuggingFace models

### CI/CD Integration

When integrating into CI/CD:

1. **Use GitHub Secrets** / GitLab CI Variables / equivalent
2. **Never log credentials** in build output
3. **Fail builds on security scan failures**
4. **Audit scan results** before deployment
5. **Use separate service accounts** for CI/CD vs development

Example GitHub Actions:

```yaml
env:
  MODEL_SECURITY_CLIENT_ID: ${{ secrets.MODEL_SECURITY_CLIENT_ID }}
  MODEL_SECURITY_CLIENT_SECRET: ${{ secrets.MODEL_SECURITY_CLIENT_SECRET }}
  TSG_ID: ${{ secrets.TSG_ID }}
```

### Code Review

Before committing:

1. **Check for credentials:**
   ```bash
   grep -r "AIRS@" .
   grep -r -E "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}" .
   ```

2. **Review `.gitignore`** - ensure sensitive files are excluded

3. **Strip notebook outputs:**
   ```bash
   jupyter nbconvert --clear-output --inplace notebooks/*.ipynb
   ```

### Incident Response

If credentials are compromised:

1. **Immediately revoke** the service account in Strata Cloud Manager
2. **Create new service account** with different credentials
3. **Audit access logs** for unauthorized use
4. **Review recent scans** for anomalies
5. **Notify security team**

## Supported Versions

We provide security updates for:

| Version | Supported          |
| ------- | ------------------ |
| Latest  | ✅ Full support    |
| < Latest| ⚠️ Security fixes only |

## Security Contact

- **Contact:** Open a GitHub issue with security concerns
- **Response Time:** We aim to respond within 48 hours

## Disclosure Policy

1. **Report received** - Acknowledged within 48 hours
2. **Initial assessment** - Within 5 business days
3. **Fix developed** - Timeline depends on severity
4. **Fix released** - Coordinated disclosure
5. **Public disclosure** - After fix is available

## Hall of Fame

We recognize security researchers who responsibly disclose vulnerabilities:

- *No reports yet*

Thank you for helping keep this project secure!

---

**Last Updated:** 2025-10-24
