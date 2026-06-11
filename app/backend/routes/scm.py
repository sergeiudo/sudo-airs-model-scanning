"""Single source of truth for Strata Cloud Manager deep-link URLs.

The path pattern below is the user-facing UI route for an individual model-security
scan as of M2. If Palo Alto rearranges Strata, this is the only place to update."""

SCM_BASE = "https://strata.paloaltonetworks.com"
SCM_SCAN_PATH = "/dashboard/aims/insights/prisma-airs/model-security/scans/{uuid}"


def scm_scan_url(scan_uuid: str) -> str:
    if not scan_uuid:
        raise ValueError("scan_uuid is required")
    return SCM_BASE + SCM_SCAN_PATH.format(uuid=scan_uuid)
