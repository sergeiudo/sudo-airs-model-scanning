#!/usr/bin/env python3
"""
CI/CD deploy gate — fail closed on a non-ALLOWED verdict or any scan error.

Exit codes:
    0  -> ALLOWED (safe to proceed)
    1  -> BLOCKED / WARNING (deployment should stop)
    2  -> scan error or misconfiguration (fail closed)

This is the application-code equivalent of `model-security scan --block-on-errors`.
Use the CLI directly if you just need a one-liner in a pipeline; use this when you want
custom logging or to integrate the verdict into a larger Python deploy step.

Usage:
    python examples/ci_gate.py https://huggingface.co/openai-community/gpt2
"""

from model_security_client.api import ModelSecurityAPIClient
from uuid import UUID
import sys


def main():
    if len(sys.argv) < 2:
        print("Usage: python examples/ci_gate.py <model-uri>")
        sys.exit(2)
    model_uri = sys.argv[1]

    try:
        client = ModelSecurityAPIClient(base_url="https://api.sase.paloaltonetworks.com/aims")
        groups = client.list_security_groups()
        # Pick the group whose source_type matches the URI scheme.
        if model_uri.startswith("s3://"):
            wanted = "S3"
        elif model_uri.startswith("gs://"):
            wanted = "GCS"
        elif "blob.core.windows.net" in model_uri:
            wanted = "AZURE"
        elif model_uri.startswith("http"):
            wanted = "HUGGING_FACE"
        else:
            wanted = "LOCAL"
        group = next((g for g in groups.security_groups if wanted in str(g.source_type)), None)
        if not group:
            print(f"FAIL: no security group for source type {wanted}")
            sys.exit(2)

        result = client.scan(security_group_uuid=UUID(str(group.uuid)), model_uri=model_uri)
    except Exception as e:
        print(f"FAIL (scan error, failing closed): {e}")
        sys.exit(2)

    verdict = str(result.eval_outcome).replace("EvalOutcome.", "")
    if verdict == "ALLOWED":
        print(f"PASS: {model_uri} -> ALLOWED")
        sys.exit(0)

    s = getattr(result, "eval_summary", None)
    detail = f" ({s.rules_failed}/{s.total_rules} rules failed)" if s else ""
    print(f"BLOCK: {model_uri} -> {verdict}{detail}")
    print("Details: Strata Cloud Manager > Insights > Prisma AIRS > Model Security > Scans")
    sys.exit(1)


if __name__ == "__main__":
    main()
