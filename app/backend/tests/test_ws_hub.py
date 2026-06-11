import asyncio
import pytest
from app.backend.ws_hub import WSHub


@pytest.mark.asyncio
async def test_publish_delivers_to_subscriber():
    hub = WSHub()
    sub = hub.subscribe()
    await hub.publish({"hello": "world"})
    msg = await asyncio.wait_for(sub.get(), timeout=0.5)
    assert msg == {"hello": "world"}


@pytest.mark.asyncio
async def test_two_subscribers_both_receive():
    hub = WSHub()
    a = hub.subscribe()
    b = hub.subscribe()
    await hub.publish({"n": 1})
    assert (await asyncio.wait_for(a.get(), 0.5)) == {"n": 1}
    assert (await asyncio.wait_for(b.get(), 0.5)) == {"n": 1}


@pytest.mark.asyncio
async def test_unsubscribe_stops_delivery():
    hub = WSHub()
    sub = hub.subscribe()
    hub.unsubscribe(sub)
    await hub.publish({"n": 1})
    with pytest.raises(asyncio.TimeoutError):
        await asyncio.wait_for(sub.get(), timeout=0.1)
