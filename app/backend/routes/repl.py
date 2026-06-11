"""WS /api/ws/repl?session_id=X — bidirectional REPL stream.

Client sends JSON: {"source": "1 + 2"}
Server replies: {"ok": true, "more": false, "output": "3\\n"}"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from app.backend.deps import get_hub, get_proxy
from app.backend.sdk_proxy import SDKProxy
from app.backend.repl import ReplRegistry

router = APIRouter()

# Process-wide registry mapping. Key is SDKProxy identity; value is the registry.
# We can't use a single global ReplRegistry because tests override get_proxy(),
# so we need one registry per proxy instance.
_REGISTRIES: dict[int, ReplRegistry] = {}


def _registry_for(proxy: SDKProxy) -> ReplRegistry:
    """Return the ReplRegistry for the given proxy, creating one if needed."""
    key = id(proxy)
    if key not in _REGISTRIES:
        _REGISTRIES[key] = ReplRegistry(proxy=proxy)
    return _REGISTRIES[key]


@router.websocket("/api/ws/repl")
async def ws_repl(
    ws: WebSocket,
    session_id: str = "default",
    proxy: SDKProxy = Depends(get_proxy)
) -> None:
    await ws.accept()
    registry = _registry_for(proxy)
    session = registry.session_for(session_id)
    try:
        while True:
            msg = await ws.receive_json()
            source = msg.get("source", "")
            result = session.execute(source)
            await ws.send_json({
                "ok": result.ok,
                "more": result.more,
                "output": result.output,
            })
    except WebSocketDisconnect:
        pass

    # Note on hub: the REPL doesn't subscribe to the WSHub directly because
    # the REPL's `client` is the same SDKProxy that publishes to the hub —
    # so REPL calls automatically show up in the Log tab.
    _ = get_hub
