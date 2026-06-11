#!/usr/bin/env python3
"""
Scan a HuggingFace model for security vulnerabilities

This example demonstrates:
- Scanning a known safe model (baseline)
- Scanning a known unsafe model (vulnerability detection)
- Parsing and displaying scan results
"""

from model_security_client.api import ModelSecurityAPIClient
from uuid import UUID
import json
import sys

def print_scan_result(model_uri, result):
    """Pretty print scan results"""
    print("\n" + "=" * 80)
    print(f"SCAN RESULTS: {model_uri}")
    print("=" * 80)

    print(f"\nOverall Verdict: {result.eval_outcome}")

    if hasattr(result, 'aggregate_eval_summary') and result.aggregate_eval_summary:
        summary = result.aggregate_eval_summary
        print("\nSeverity Summary:")
        print(f"  Critical: {summary.critical_count}")
        print(f"  High:     {summary.high_count}")
        print(f"  Medium:   {summary.medium_count}")
        print(f"  Low:      {summary.low_count}")

    if hasattr(result, 'violations') and result.violations:
        print(f"\n⚠ Found {len(result.violations)} violation(s):")
        for i, violation in enumerate(result.violations, 1):
            print(f"\n{i}. {violation.threat}")
            print(f"   Issue: {violation.issue}")
            print(f"   File: {violation.file}")
            if violation.remediation and violation.remediation.steps:
                print(f"   Remediation:")
                for step in violation.remediation.steps:
                    print(f"     • {step}")
    else:
        print("\n✓ No violations found - model passed all security checks")

    print("\n" + "=" * 80)

def main():
    # Initialize client
    client = ModelSecurityAPIClient(
        base_url="https://api.sase.paloaltonetworks.com/aims"
    )

    # Get HuggingFace security group
    groups = client.list_security_groups()
    hf_group = next((g for g in groups.security_groups if "HUGGING_FACE" in str(g.source_type)), None)

    if not hf_group:
        print("ERROR: No HuggingFace security group found")
        print("Default groups should be created automatically")
        sys.exit(1)

    print(f"Using security group: {hf_group.name} ({hf_group.uuid})")

    # Test 1: Scan a known safe model (baseline)
    print("\n" + "━" * 80)
    print("TEST 1: Scanning Known Safe Model (Baseline)")
    print("━" * 80)

    safe_model = "https://huggingface.co/microsoft/DialoGPT-medium"
    print(f"Model: {safe_model}")
    print("Expected: PASS (clean model from verified organization)\n")

    try:
        result = client.scan(
            security_group_uuid=UUID(str(hf_group.uuid)),
            model_uri=safe_model
        )
        print_scan_result(safe_model, result)
    except Exception as e:
        print(f"ERROR during scan: {str(e)}")

    # Test 2: Scan a known vulnerable model
    print("\n" + "━" * 80)
    print("TEST 2: Scanning Known Unsafe Model (Vulnerability Detection)")
    print("━" * 80)

    unsafe_model = "https://huggingface.co/ykilcher/totally-harmless-model"
    print(f"Model: {unsafe_model}")
    print("Expected: FAIL (contains GGUF template injection - PAIT-GGUF-101)\n")

    try:
        result = client.scan(
            security_group_uuid=UUID(str(hf_group.uuid)),
            model_uri=unsafe_model
        )
        print_scan_result(unsafe_model, result)
    except Exception as e:
        print(f"ERROR during scan: {str(e)}")

    print("\n" + "=" * 80)
    print("SCAN COMPLETE")
    print("=" * 80)
    print("\nFor more details, view scan results in Strata Cloud Manager:")
    print("  Insights > Prisma AIRS > Model Security > Scans")
    print()

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nScan interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\nFATAL ERROR: {str(e)}")
        sys.exit(1)
