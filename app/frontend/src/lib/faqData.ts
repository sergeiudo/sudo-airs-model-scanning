// Customer-facing FAQ content for the demo portal. Grouped by theme; each entry is plain
// prose so SEs can answer common questions without leaving the portal. Where a precise,
// account-specific answer is required (pricing tiers, exact retention, regions), the answer
// says so and points to the contract / official docs rather than inventing specifics.

export type FaqItem = { q: string; a: string }
export type FaqGroup = { theme: string; items: FaqItem[] }

export const FAQ: FaqGroup[] = [
  {
    theme: 'Data handling & privacy',
    items: [
      {
        q: 'Where is my model downloaded, and do you keep a copy?',
        a: 'For cloud/HuggingFace sources the scanning service fetches the model files to analyze them; for LOCAL sources the SDK/CLI uploads the files. Scan summaries and findings are retained so you can review them in Strata Cloud Manager. For your contract\u2019s exact data-retention and copy-handling terms, confirm with your Palo Alto account team — do not assume beyond what your agreement states.',
      },
      {
        q: 'Is my model used to train anything?',
        a: 'Model Security is a static-analysis scanner, not a training pipeline. Treat the specifics of any data use as governed by your agreement; this is a common procurement question, so route it to your account/security contact for a contractual answer.',
      },
      {
        q: 'What data leaves my environment?',
        a: 'The model files for the source being scanned, plus the API request metadata (security group UUID, model URI, scan options). Credentials are exchanged for short-lived tokens; the client secret itself is not sent on every call. Findings are stored in your tenant in Strata Cloud Manager.',
      },
      {
        q: 'How long are scan results kept?',
        a: 'Scan results are available in Strata Cloud Manager for review and audit. Treat the exact retention window as account-specific — confirm the current value with your account team rather than relying on a hardcoded number.',
      },
    ],
  },
  {
    theme: 'Network & deployment',
    items: [
      {
        q: 'What outbound endpoints do I need to allow?',
        a: 'api.sase.paloaltonetworks.com (the Model Security API), auth.apps.paloaltonetworks.com (OAuth for the private SDK + tokens), and your model source (e.g. huggingface.co, s3.<region>.amazonaws.com, storage.googleapis.com, <account>.blob.core.windows.net).',
      },
      {
        q: 'Does it work behind a proxy?',
        a: 'Yes — the SDK/CLI honor standard HTTPS_PROXY / HTTP_PROXY / NO_PROXY environment variables. Ensure the proxy allows the endpoints above and does not break TLS for the private PyPI install step.',
      },
      {
        q: 'Can it run fully air-gapped?',
        a: 'No. Both the private SDK install and scanning require reaching Palo Alto cloud endpoints. In restricted networks, run scans from a CI runner that has the narrow egress allow-list above.',
      },
      {
        q: 'Why can\u2019t I just pip install the SDK?',
        a: 'model-security-client and airs-schemas are proprietary and live on a private, OAuth-gated PyPI. Use ./setup-sdk.sh (or get-pypi-url.sh) which exchanges your three credentials for a short-lived authenticated index URL. See SDK-TLDR.md.',
      },
    ],
  },
  {
    theme: 'Verdicts & accuracy',
    items: [
      {
        q: 'What\u2019s the difference between BLOCKED, WARNING, and ALLOWED?',
        a: 'ALLOWED = passed all rules. BLOCKED = failed at least one BLOCKING rule; deployment should stop. WARNING = a non-blocking rule fired; review recommended but not auto-failed. Whether a given rule is blocking is configured per security group.',
      },
      {
        q: 'I think a block is a false positive. What do I do?',
        a: 'Open the scan in Strata Cloud Manager to see the exact rule, file, and reason. If it\u2019s policy (e.g. a license rule) you can adjust the rule\u2019s severity/blocking state for that security group. If you believe it\u2019s a true detection misfire, raise it with support with the scan ID.',
      },
      {
        q: 'Why does the SDK only return a summary?',
        a: 'The API/CLI return the verdict and rule counts so they\u2019re easy to gate on. Per-file findings, threat descriptions, and remediation are in Strata Cloud Manager → Insights → Prisma AIRS → Model Security → Scans (the portal deep-links to your exact scan).',
      },
    ],
  },
  {
    theme: 'Formats & sources',
    items: [
      {
        q: 'Which model formats are detected?',
        a: 'PyTorch, TensorFlow/Keras (incl. H5), ONNX, SafeTensors, Pickle, GGUF, and more. The risky ones (Pickle, H5 Lambda, GGUF templates) get specific code-execution checks — see the Threat catalogue.',
      },
      {
        q: 'Which sources can I scan from?',
        a: 'HuggingFace, Amazon S3, Google Cloud Storage, Azure Blob Storage, and the local filesystem. See the Sources page for URI formats and per-source enablement steps.',
      },
      {
        q: 'My HuggingFace scan fails validation — why?',
        a: 'HuggingFace URIs must include the org/author segment. huggingface.co/openai-community/gpt2 works; huggingface.co/gpt2 does not.',
      },
    ],
  },
  {
    theme: 'Limits & performance',
    items: [
      {
        q: 'How long does a scan take?',
        a: 'Typically 30–90 seconds. Small models (<100MB) ~30–60s; multi-GB models a few minutes. Use allow_patterns/ignore_patterns to skip large non-model files and speed things up.',
      },
      {
        q: 'Are there rate limits or scan quotas?',
        a: 'Standard API rate limiting applies and concurrency depends on your tier. Treat exact numbers as account-specific and confirm with your account team.',
      },
      {
        q: 'How do I handle very large models timing out?',
        a: 'Raise poll_timeout_secs / scan_timeout_secs (e.g. 900s) and narrow files with allow_patterns. The Scan page\u2019s Advanced options expose these.',
      },
    ],
  },
  {
    theme: 'Licensing & positioning',
    items: [
      {
        q: 'How is this licensed / priced?',
        a: 'Model Security is part of Prisma AIRS and requires an AIRS subscription. The SDK/CLI themselves are free to use with valid credentials. Pricing is account-specific — your account team has the authoritative answer.',
      },
      {
        q: 'How is this different from open-source scanners like modelscan or picklescan?',
        a: 'Open-source tools mostly flag unsafe pickle opcodes. Prisma AIRS adds a managed, policy-driven engine across many formats (GGUF, H5, SafeTensors, ONNX), supply-chain and license checks, multi-cloud source access, central results/audit in Strata Cloud Manager, and CI/CD-ready gating — without you maintaining detections.',
      },
      {
        q: 'Doesn\u2019t HuggingFace already scan models?',
        a: 'HuggingFace runs some surface scanning, but it\u2019s tied to their platform and not policy-configurable for your org, nor does it cover your S3/GCS/Azure/local models or gate your pipelines. Prisma AIRS gives you one consistent policy across all sources.',
      },
    ],
  },
]
