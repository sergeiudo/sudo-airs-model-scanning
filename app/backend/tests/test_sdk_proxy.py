import asyncio
from unittest.mock import MagicMock
import pytest
from pydantic import BaseModel
from app.backend.sdk_proxy import SDKProxy, SDKEvent
from app.backend.ws_hub import WSHub


class FakeResp(BaseModel):
    name: str
    items: list[str]


@pytest.fixture
def fake_client():
    client = MagicMock()
    client.list_security_groups = MagicMock(
        return_value=FakeResp(name="r", items=["a", "b"])
    )
    return client


async def _drain(sub):
    events = []
    while True:
        try:
            events.append(await asyncio.wait_for(sub.get(), timeout=0.2))
        except asyncio.TimeoutError:
            return events


async def test_call_returns_response(fake_client):
    hub = WSHub()
    proxy = SDKProxy(fake_client, hub)
    result = proxy.call("list_security_groups")
    assert result.name == "r"


async def test_call_emits_pending_then_ok(fake_client):
    hub = WSHub()
    sub = hub.subscribe()
    proxy = SDKProxy(fake_client, hub)
    proxy.call("list_security_groups")
    await asyncio.sleep(0.05)  # let publish tasks finish
    events = await _drain(sub)
    assert len(events) == 2
    assert events[0]["status"] == "pending"
    assert events[1]["status"] == "ok"
    assert events[0]["method"] == "list_security_groups"
    assert events[1]["duration_ms"] is not None
    assert events[1]["response_full"]["items"] == ["a", "b"]


async def test_call_captures_error_and_reraises():
    client = MagicMock()
    client.broken = MagicMock(side_effect=RuntimeError("boom"))
    hub = WSHub()
    sub = hub.subscribe()
    proxy = SDKProxy(client, hub)
    with pytest.raises(RuntimeError, match="boom"):
        proxy.call("broken")
    await asyncio.sleep(0.05)
    events = await _drain(sub)
    assert events[-1]["status"] == "error"
    assert events[-1]["error"] == "boom"


async def test_kwargs_are_json_safe(fake_client):
    from uuid import UUID
    hub = WSHub()
    sub = hub.subscribe()
    proxy = SDKProxy(fake_client, hub)
    uid = UUID("00000000-0000-0000-0000-000000000001")
    proxy.call("list_security_groups", uuid=uid, count=3)
    await asyncio.sleep(0.05)
    events = await _drain(sub)
    # UUID rendered as string, not a UUID instance.
    assert events[0]["kwargs"] == {"uuid": str(uid), "count": 3}


async def test_call_with_none_response_emits_ok_with_null_payload():
    client = MagicMock()
    client.do_nothing = MagicMock(return_value=None)
    hub = WSHub()
    sub = hub.subscribe()
    proxy = SDKProxy(client, hub)
    result = proxy.call("do_nothing")
    assert result is None
    await asyncio.sleep(0.05)
    events = await _drain(sub)
    assert events[-1]["status"] == "ok"
    assert events[-1]["response_summary"] is None
    assert events[-1]["response_full"] is None


async def test_call_from_background_thread_publishes_via_bound_loop(fake_client):
    import threading
    hub = WSHub()
    hub.bind_loop(asyncio.get_running_loop())
    sub = hub.subscribe()
    proxy = SDKProxy(fake_client, hub)
    t = threading.Thread(target=lambda: proxy.call("list_security_groups"))
    t.start()
    t.join()
    await asyncio.sleep(0.05)
    events = await _drain(sub)
    assert [e["status"] for e in events] == ["pending", "ok"]


async def test_call_with_dict_response_serialised():
    client = MagicMock()
    client.raw = MagicMock(return_value={"items": [1, 2, 3], "n": 3})
    hub = WSHub()
    sub = hub.subscribe()
    proxy = SDKProxy(client, hub)
    proxy.call("raw")
    await asyncio.sleep(0.05)
    events = await _drain(sub)
    assert events[-1]["status"] == "ok"
    assert events[-1]["response_summary"] == "dict"
    assert events[-1]["response_full"] == {"items": [1, 2, 3], "n": 3}


async def test_call_forwards_positional_args(fake_client):
    fake_client.get_thing = lambda x: x * 2  # type: ignore[attr-defined]
    hub = WSHub()
    sub = hub.subscribe()
    proxy = SDKProxy(fake_client, hub)
    result = proxy.call("get_thing", 21)
    assert result == 42
    await asyncio.sleep(0.05)
    events = await _drain(sub)
    # Positional arg shows up in the log as arg0.
    assert events[0]["kwargs"] == {"arg0": 21}
