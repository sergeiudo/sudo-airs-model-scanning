import pytest
from uuid import UUID
from fastapi import HTTPException
from app.backend._common import parse_uuid_or_400


def test_parses_valid_uuid():
    parsed = parse_uuid_or_400("d110c5a5-27a0-459e-9556-eda7196c6ac3")
    assert isinstance(parsed, UUID)
    assert str(parsed) == "d110c5a5-27a0-459e-9556-eda7196c6ac3"


def test_raises_400_on_invalid():
    with pytest.raises(HTTPException) as exc_info:
        parse_uuid_or_400("not-a-uuid")
    assert exc_info.value.status_code == 400
    assert "invalid uuid" in exc_info.value.detail


def test_label_appears_in_error_message():
    with pytest.raises(HTTPException) as exc_info:
        parse_uuid_or_400("not-a-uuid", label="scan uuid")
    assert "scan uuid" in exc_info.value.detail
