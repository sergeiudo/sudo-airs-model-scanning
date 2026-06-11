"""SDK call interception. Every SDK call goes through SDKProxy.call() so the
frontend can stream live events to the persistent drawer."""
from __future__ import annotations
import asyncio
import time
import uuid as _uuid
from typing import Any, Literal
from pydantic import BaseModel


class SDKEvent(BaseModel):
    id: str
    method: str
    kwargs: dict[str, Any]
    status: Literal["pending", "ok", "error"]
    started_at: float
    duration_ms: float | None = None
    response_summary: str | None = None
    response_full: dict[str, Any] | list[Any] | None = None
    error: str | None = None


def _json_safe(value: Any) -> Any:
    """Coerce non-JSON-native values (UUID, Pydantic models, sets) to JSON-safe forms."""
    if isinstance(value, _uuid.UUID):
        return str(value)
    if isinstance(value, BaseModel):
        return value.model_dump(mode="json")
    if isinstance(value, (list, tuple, set)):
        return [_json_safe(v) for v in value]
    if isinstance(value, dict):
        return {k: _json_safe(v) for k, v in value.items()}
    return value


def _serialise_response(response: Any) -> tuple[str | None, dict[str, Any] | list[Any] | None]:
    if response is None:
        return None, None
    if isinstance(response, BaseModel):
        dumped = response.model_dump(mode="json")
        summary = type(response).__name__
        return summary, dumped
    if isinstance(response, (list, dict)):
        return type(response).__name__, _json_safe(response)
    return repr(response), None


class SDKProxy:
    """Wraps a model_security_client instance. Every call publishes pending/ok/error
    SDKEvents to the WSHub for live UI streaming."""

    def __init__(self, client: Any, hub: "WSHub") -> None:  # type: ignore[name-defined]
        self._client = client
        self._hub = hub

    def call(self, method: str, *args: Any, **kwargs: Any) -> Any:
        event_id = _uuid.uuid4().hex[:12]
        safe_kwargs = {k: _json_safe(v) for k, v in kwargs.items()}
        # Positional args are folded into kwargs as arg0, arg1, … for log/codegen visibility.
        for i, a in enumerate(args):
            safe_kwargs.setdefault(f"arg{i}", _json_safe(a))
        started = time.time()

        pending = SDKEvent(
            id=event_id, method=method, kwargs=safe_kwargs,
            status="pending", started_at=started,
        )
        self._publish(pending)

        try:
            result = getattr(self._client, method)(*args, **kwargs)
        except Exception as exc:
            duration_ms = (time.time() - started) * 1000
            err = SDKEvent(
                id=event_id, method=method, kwargs=safe_kwargs,
                status="error", started_at=started, duration_ms=duration_ms,
                error=str(exc),
            )
            self._publish(err)
            raise

        duration_ms = (time.time() - started) * 1000
        summary, full = _serialise_response(result)
        ok = SDKEvent(
            id=event_id, method=method, kwargs=safe_kwargs,
            status="ok", started_at=started, duration_ms=duration_ms,
            response_summary=summary, response_full=full,
        )
        self._publish(ok)
        return result

    def _publish(self, event: SDKEvent) -> None:
        payload = event.model_dump(mode="json")
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            # Background thread (e.g. scan worker) — hand off to the main loop.
            loop = self._hub.loop
            if loop is None:
                return
            asyncio.run_coroutine_threadsafe(self._hub.publish(payload), loop)
            return
        loop.create_task(self._hub.publish(payload))
