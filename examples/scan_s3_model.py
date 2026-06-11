#!/usr/bin/env python3
"""
Scan a model stored in Amazon S3.

The SDK call is identical to a HuggingFace scan — only the security group's source_type
and the model URI scheme (s3://) differ. The scanning service reads the bucket using the
S3 credential configured on your tenant in Strata Cloud Manager
(Insights > Prisma AIRS > Model Security > Settings).

Usage:
    python examples/scan_s3_model.py s3://my-models-bucket/llama-3-8b/
"""

from model_security_client.api import ModelSecurityAPIClient
from uuid import UUID
import sys


def main():
    model_uri = sys.argv[1] if len(sys.argv) > 1 else "s3://my-models-bucket/llama-3-8b/"

    client = ModelSecurityAPIClient(base_url="https://api.sase.paloaltonetworks.com/aims")

    groups = client.list_security_groups()
    s3_group = next((g for g in groups.security_groups if "S3" in str(g.source_type)), None)
    if not s3_group:
        print("ERROR: No S3 security group found. Default groups are auto-created per source type.")
        sys.exit(1)

    print(f"Using security group: {s3_group.name} ({s3_group.uuid})")
    print(f"Scanning: {model_uri}")
    print("Note: point the URI at the prefix (folder) holding the model files.\n")

    try:
        result = client.scan(
            security_group_uuid=UUID(str(s3_group.uuid)),
            model_uri=model_uri,
        )
        print(f"Verdict: {result.eval_outcome}")
        s = getattr(result, "eval_summary", None)
        if s:
            print(f"Rules: {s.rules_passed} passed / {s.rules_failed} failed / {s.total_rules} total")
        print("\nFull findings: Strata Cloud Manager > Insights > Prisma AIRS > Model Security > Scans")
    except Exception as e:
        print(f"ERROR during scan: {e}")
        print("If this is an access error, verify the tenant's S3 credential can read the bucket/prefix.")
        sys.exit(1)


if __name__ == "__main__":
    main()
