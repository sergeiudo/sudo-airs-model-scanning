from app.backend.codegen import render_python
from app.backend.sdk_proxy import SDKEvent


def _evt(method, kwargs):
    return SDKEvent(
        id="x", method=method, kwargs=kwargs,
        status="ok", started_at=0.0, duration_ms=10.0,
    )


def test_no_args():
    assert render_python(_evt("list_security_groups", {})) == "client.list_security_groups()"


def test_string_arg_quoted():
    out = render_python(_evt("get_model", {"model_id": "abc"}))
    assert out == "client.get_model(model_id='abc')"


def test_uuid_arg_wrapped():
    out = render_python(_evt("scan", {
        "security_group_uuid": "8f3ed1c3-d918-438b-a4c9-d729b1c4cfb2",
        "model_uri": "https://huggingface.co/openai-community/gpt2",
    }))
    assert "UUID('8f3ed1c3-d918-438b-a4c9-d729b1c4cfb2')" in out
    assert "model_uri='https://huggingface.co/openai-community/gpt2'" in out


def test_int_arg_unquoted():
    out = render_python(_evt("list_scans", {"limit": 25}))
    assert out == "client.list_scans(limit=25)"
