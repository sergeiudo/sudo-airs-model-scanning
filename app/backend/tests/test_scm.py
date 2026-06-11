from app.backend.routes.scm import scm_scan_url, SCM_BASE


def test_base_is_strata_paloalto():
    assert SCM_BASE.startswith("https://strata.paloaltonetworks.com")


def test_scan_url_includes_uuid_and_base():
    url = scm_scan_url("d110c5a5-27a0-459e-9556-eda7196c6ac3")
    assert url.startswith(SCM_BASE)
    assert "d110c5a5-27a0-459e-9556-eda7196c6ac3" in url


def test_scan_url_rejects_empty():
    import pytest
    with pytest.raises(ValueError):
        scm_scan_url("")
