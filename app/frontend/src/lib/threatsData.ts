// Curated threat catalogue for the demo portal. Categories and remediation reflect what
// Prisma AIRS Model Security checks for. PAIT identifiers shown are representative examples
// of the threat-ID scheme — the authoritative, per-finding IDs appear in Strata Cloud
// Manager and InsightsDB for each scan.

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'

export type Threat = {
  id: string
  title: string
  severity: Severity
  formats: string[]
  scenario: string
  detects: string
  remediation: string[]
  paitExample?: string
}

export const THREATS: Threat[] = [
  {
    id: 'deserialization',
    title: 'Malicious deserialization (code execution)',
    severity: 'CRITICAL',
    formats: ['Pickle (.pkl/.bin)', 'PyTorch (.pt)', 'NumPy (.npy)', 'Joblib'],
    scenario:
      'A pickle-backed weights file defines a __reduce__ method that runs arbitrary code the moment the model is loaded — a reverse shell, credential theft, or crypto-miner executes inside your serving environment.',
    detects:
      'Unsafe opcodes and __reduce__/__setstate__ payloads, os/subprocess/eval references, and other code-execution primitives embedded in serialized files.',
    remediation: [
      'Convert weights to SafeTensors (no code execution path).',
      'Use ONNX for cross-framework portability.',
      'Never load pickle from untrusted publishers; gate on the scan verdict.',
    ],
    paitExample: 'PAIT-PICKLE-001',
  },
  {
    id: 'gguf-injection',
    title: 'GGUF / template injection',
    severity: 'HIGH',
    formats: ['GGUF', 'Chat templates', 'Tokenizer configs'],
    scenario:
      'A GGUF model ships a chat template / metadata field crafted to inject instructions or execute logic in the loader or inference harness — the basis of the well-known "totally-harmless-model" demo.',
    detects:
      'Suspicious template expressions and metadata in GGUF and tokenizer/chat-template config that can alter execution or smuggle instructions.',
    remediation: [
      'Pin to a trusted GGUF build and re-scan after any update.',
      'Strip or validate chat templates before serving.',
      'Block on the scan verdict in CI/CD.',
    ],
    paitExample: 'PAIT-GGUF-101',
  },
  {
    id: 'unsafe-format',
    title: 'Unsafe serialization format',
    severity: 'HIGH',
    formats: ['Keras H5', 'Pickle', 'Legacy TF SavedModel (Lambda)'],
    scenario:
      'A Keras H5 model contains a Lambda layer with embedded Python, or a model ships pickle artifacts — formats that allow code execution by design even without an explicit malicious payload.',
    detects:
      'Use of formats/features that permit arbitrary code on load (H5 Lambda layers, pickle), flagged per your security group policy.',
    remediation: [
      'Re-export to SafeTensors / ONNX.',
      'Replace Lambda layers with declarative ops.',
      'Set the format rule to BLOCKING for production groups.',
    ],
  },
  {
    id: 'supply-chain',
    title: 'Supply-chain tampering',
    severity: 'HIGH',
    formats: ['requirements.txt', 'Model card', 'Config files', 'Weights'],
    scenario:
      'A forked model repo pins a typo-squatted dependency or ships tampered weights/config — the model looks legitimate but pulls a compromised package or behaves maliciously at runtime.',
    detects:
      'Suspicious declared dependencies, tampered metadata/config, and integrity anomalies across the model bundle.',
    remediation: [
      'Verify the publisher and pin to a known-good revision (model_version).',
      'Review declared dependencies before install.',
      'Re-scan on every model bump.',
    ],
  },
  {
    id: 'backdoor',
    title: 'Neural backdoor / trojan',
    severity: 'CRITICAL',
    formats: ['Any weights format'],
    scenario:
      'Weights are poisoned so a hidden trigger (a phrase, pixel pattern, or token) flips the model to attacker-chosen behavior, while accuracy on normal inputs stays high to avoid detection.',
    detects:
      'Patterns and signatures associated with known backdoor/trojan techniques in model weights and architecture.',
    remediation: [
      'Prefer models from verified publishers with reproducible training.',
      'Combine scanning with adversarial / trigger testing before deployment.',
      'Treat CRITICAL verdicts as hard blocks.',
    ],
  },
  {
    id: 'license-policy',
    title: 'License & policy violation',
    severity: 'MEDIUM',
    formats: ['License files', 'Model card metadata'],
    scenario:
      'A model is GPL/AGPL or has a non-commercial / missing license, conflicting with your organization\u2019s policy for shipped products — a compliance risk rather than a security exploit.',
    detects:
      'License identification and policy evaluation (e.g. block GPL/AGPL, require a permissive license, require a model card).',
    remediation: [
      'Choose a permissively licensed alternative (MIT/Apache-2.0).',
      'Obtain legal sign-off, or set the license rule to WARNING vs BLOCKING per policy.',
      'Require complete model cards in your security group.',
    ],
  },
  {
    id: 'unverified-publisher',
    title: 'Unverified publisher / missing metadata',
    severity: 'LOW',
    formats: ['Model card', 'Repo metadata'],
    scenario:
      'A model from an unknown org has no model card, no documentation, and no provenance — low signal on its own but a useful policy gate before broader adoption.',
    detects:
      'Absence of model card / documentation and signals about publisher trust, surfaced as warnings.',
    remediation: [
      'Prefer models with complete cards and known provenance.',
      'Require documentation as part of intake.',
      'Keep as WARNING to inform rather than block.',
    ],
  },
]

export const SEVERITY_RANK: Record<Severity, number> = {
  CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3,
}
