#!/usr/bin/env python3
"""
Batch-scan multiple models and print a verdict summary table.

Useful for vetting a list of candidate models at once (e.g. a model registry sync).
Edit MODELS below or pass URIs on the command line.

Usage:
    python examples/batch_scan.py
    python examples/batch_scan.py https://huggingface.co/openai-community/gpt2 https://huggingface.co/google-bert/bert-base-uncased
"""

from model_security_client.api import ModelSecurityAPIClient
from uuid import UUID
import sys

MODELS = [
    "https://huggingface.co/microsoft/DialoGPT-medium",
    "https://huggingface.co/openai-community/gpt2",
    "https://huggingface.co/ykilcher/totally-harmless-model",
]


def main():
    models = sys.argv[1:] or MODELS

    client = ModelSecurityAPIClient(base_url="https://api.sase.paloaltonetworks.com/aims")
    groups = client.list_security_groups()
    hf_group = next((g for g in groups.security_groups if "HUGGING_FACE" in str(g.source_type)), None)
    if not hf_group:
        print("ERROR: No HuggingFace security group found.")
        sys.exit(1)

    print(f"Scanning {len(models)} model(s) with group {hf_group.name}\n")
    rows = []
    for uri in models:
        try:
            result = client.scan(security_group_uuid=UUID(str(hf_group.uuid)), model_uri=uri)
            verdict = str(result.eval_outcome).replace("EvalOutcome.", "")
        except Exception as e:
            verdict = f"ERROR: {e}"
        rows.append((uri, verdict))
        print(f"  {verdict:<10} {uri}")

    blocked = sum(1 for _, v in rows if v not in ("ALLOWED",) and not v.startswith("ERROR"))
    errored = sum(1 for _, v in rows if v.startswith("ERROR"))
    print(f"\nSummary: {len(rows)} scanned, {blocked} not allowed, {errored} errored")
    print("Details: Strata Cloud Manager > Insights > Prisma AIRS > Model Security > Scans")


if __name__ == "__main__":
    main()
