#!/usr/bin/env python3
"""
Scan a model stored on the local filesystem.

For LOCAL sources the SDK/CLI reads files from the given absolute path and uploads them to
the service — no cloud credentials are required. Use ignore_patterns to skip large
non-model files and speed up the upload.

Usage:
    python examples/scan_local_model.py /abs/path/to/model
"""

from model_security_client.api import ModelSecurityAPIClient
from uuid import UUID
import sys


def main():
    if len(sys.argv) < 2:
        print("Usage: python examples/scan_local_model.py /abs/path/to/model")
        sys.exit(1)
    model_path = sys.argv[1]

    client = ModelSecurityAPIClient(base_url="https://api.sase.paloaltonetworks.com/aims")

    groups = client.list_security_groups()
    local_group = next((g for g in groups.security_groups if "LOCAL" in str(g.source_type)), None)
    if not local_group:
        print("ERROR: No LOCAL security group found. Default groups are auto-created per source type.")
        sys.exit(1)

    print(f"Using security group: {local_group.name} ({local_group.uuid})")
    print(f"Scanning local path: {model_path}\n")

    try:
        result = client.scan(
            security_group_uuid=UUID(str(local_group.uuid)),
            model_uri=model_path,
            ignore_patterns=["*.md", "*.txt", "*.png"],
        )
        print(f"Verdict: {result.eval_outcome}")
        s = getattr(result, "eval_summary", None)
        if s:
            print(f"Rules: {s.rules_passed} passed / {s.rules_failed} failed / {s.total_rules} total")
        print("\nFull findings: Strata Cloud Manager > Insights > Prisma AIRS > Model Security > Scans")
    except Exception as e:
        print(f"ERROR during scan: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
