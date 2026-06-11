"""Shared helpers used by multiple route modules."""
from uuid import UUID
from fastapi import HTTPException


def parse_uuid_or_400(raw: str, label: str = "uuid") -> UUID:
    """Parse `raw` as a UUID; raise 400 with a clear message if it isn't one."""
    try:
        return UUID(raw)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"invalid {label}: {exc}") from exc
