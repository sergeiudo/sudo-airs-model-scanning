"""WebSocket route that streams SDK events to a connected client."""
import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.backend.deps import get_hub

router = APIRouter()


@router.websocket("/api/ws/log")
async def ws_log(ws: WebSocket) -> None:
    await ws.accept()
    hub = get_hub()
    sub = hub.subscribe()
    try:
        while True:
            try:
                msg = await asyncio.wait_for(sub.get(), timeout=30.0)
                await ws.send_json(msg)
            except asyncio.TimeoutError:
                # Heartbeat so proxies don't kill idle connections.
                await ws.send_json({"type": "ping"})
    except WebSocketDisconnect:
        pass
    finally:
        hub.unsubscribe(sub)
