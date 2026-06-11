#!/usr/bin/env python3
"""
List all available Model Security Groups

This script demonstrates how to:
- Initialize the Model Security client
- List all security groups
- Display group details including source types and rules
"""

from model_security_client.api import ModelSecurityAPIClient
import os

def main():
    # Initialize client (uses environment variables for auth)
    client = ModelSecurityAPIClient(
        base_url="https://api.sase.paloaltonetworks.com/aims"
    )

    print("=" * 80)
    print("MODEL SECURITY GROUPS")
    print("=" * 80)
    print()

    # List all security groups
    groups = client.list_security_groups()

    if not groups.security_groups:
        print("⚠ No security groups found")
        print()
        print("Security groups are created automatically for each source type.")
        print("Expected default groups:")
        print("  - Default LOCAL (for local storage)")
        print("  - Default HUGGING_FACE (for HuggingFace models)")
        print("  - Default S3 (for Amazon S3)")
        print("  - Default AZURE (for Azure Blob Storage)")
        print("  - Default GCS (for Google Cloud Storage)")
        return

    print(f"Found {len(groups.security_groups)} security group(s):\n")

    for i, group in enumerate(groups.security_groups, 1):
        print(f"{i}. {group.name}")
        print(f"   UUID: {group.uuid}")
        print(f"   Source Type: {group.source_type}")
        print(f"   Description: {group.description or 'N/A'}")

        # Get detailed group info including rules
        try:
            group_details = client.get_security_group(group.uuid)

            if hasattr(group_details, 'rules') and group_details.rules:
                print(f"   Active Rules: {len([r for r in group_details.rules if r.enabled])}")

                print(f"\n   Rules:")
                for rule in group_details.rules:
                    status = "✓ Enabled" if rule.enabled else "✗ Disabled"
                    blocking = "[BLOCKING]" if rule.blocking else "[NON-BLOCKING]"
                    print(f"     • {rule.name:<40} {status} {blocking}")

        except Exception as e:
            print(f"   Rules: Unable to fetch ({str(e)})")

        print()

    print("=" * 80)
    print()
    print("To scan a model:")
    print(f"  model-security scan \\")
    print(f"    --security-group-uuid \"{groups.security_groups[0].uuid}\" \\")
    print(f"    --model-uri \"https://huggingface.co/microsoft/DialoGPT-medium\"")
    print()

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"ERROR: {str(e)}")
        print()
        print("Make sure you have:")
        print("  1. Set MODEL_SECURITY_CLIENT_ID environment variable")
        print("  2. Set MODEL_SECURITY_CLIENT_SECRET environment variable")
        print("  3. Set TSG_ID environment variable")
        print()
        print("Run './setup-sdk.sh' if you haven't already")
        exit(1)
