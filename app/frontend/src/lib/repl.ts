type Listener = (msg: { ok: boolean; more: boolean; output: string }) => void

const STORAGE_KEY = 'prisma-airs-repl-session'

function ensureSessionId(): string {
  let id = localStorage.getItem(STORAGE_KEY)
  if (!id) {
    id = `s-${Math.random().toString(36).slice(2, 10)}`
    localStorage.setItem(STORAGE_KEY, id)
  }
  return id
}

class ReplClient {
  private ws: WebSocket | null = null
  private listeners = new Set<Listener>()
  private queue: string[] = []
  private reconnectMs = 1000

  connect(): void {
    if (this.ws && this.ws.readyState <= 1) return
    const proto = location.protocol === 'https:' ? 'wss' : 'ws'
    const id = ensureSessionId()
    this.ws = new WebSocket(`${proto}://${location.host}/api/ws/repl?session_id=${encodeURIComponent(id)}`)
    this.ws.onopen = () => {
      const pending = this.queue.splice(0)
      pending.forEach((src) => this.ws?.send(JSON.stringify({ source: src })))
    }
    this.ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        this.listeners.forEach((l) => l(data))
      } catch {
        // ignore
      }
    }
    this.ws.onclose = () => {
      this.ws = null
      setTimeout(() => this.connect(), this.reconnectMs)
    }
    this.ws.onerror = () => this.ws?.close()
  }

  send(source: string): void {
    if (this.ws && this.ws.readyState === 1) {
      this.ws.send(JSON.stringify({ source }))
    } else {
      this.queue.push(source)
      this.connect()
    }
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }
}

export const repl = new ReplClient()
