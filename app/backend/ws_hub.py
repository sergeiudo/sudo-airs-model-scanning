"""In-process pub/sub hub used to fan SDKEvent records out to WebSocket clients."""
import asyncio
from typing import Any


class WSHub:
    def __init__(self) -> None:
        self._subscribers: list[asyncio.Queue[Any]] = []
        self._loop: asyncio.AbstractEventLoop | None = None

    def bind_loop(self, loop: asyncio.AbstractEventLoop) -> None:
        self._loop = loop

    @property
    def loop(self) -> asyncio.AbstractEventLoop | None:
        return self._loop

    def subscribe(self) -> asyncio.Queue[Any]:
        q: asyncio.Queue[Any] = asyncio.Queue(maxsize=1000)
        self._subscribers.append(q)
        return q

    def unsubscribe(self, q: asyncio.Queue[Any]) -> None:
        if q in self._subscribers:
            self._subscribers.remove(q)

    async def publish(self, message: Any) -> None:
        for q in list(self._subscribers):
            try:
                q.put_nowait(message)
            except asyncio.QueueFull:
                # Slowest subscriber drops messages rather than blocking the publisher.
                pass
