"""Render an SDKEvent as the equivalent `client.<method>(...)` Python call."""
import re
from app.backend.sdk_proxy import SDKEvent

_UUID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")


def _repr_arg(value: object) -> str:
    if isinstance(value, str):
        if _UUID_RE.match(value):
            return f"UUID('{value}')"
        return repr(value)
    if isinstance(value, (int, float, bool)) or value is None:
        return repr(value)
    if isinstance(value, list):
        return "[" + ", ".join(_repr_arg(v) for v in value) + "]"
    if isinstance(value, dict):
        return "{" + ", ".join(f"{_repr_arg(k)}: {_repr_arg(v)}" for k, v in value.items()) + "}"
    return repr(value)


def render_python(event: SDKEvent) -> str:
    if not event.kwargs:
        return f"client.{event.method}()"
    parts = [f"{k}={_repr_arg(v)}" for k, v in event.kwargs.items()]
    return f"client.{event.method}({', '.join(parts)})"
