import type { SDKEvent } from './types'

type Listener = (event: SDKEvent | { type: 'ping' }) => void

class LogBus {
  private listeners = new Set<Listener>()
  private ws: WebSocket | null = null
  private reconnectMs = 1000

  connect(): void {
    if (this.ws && this.ws.readyState <= 1) return
    const proto = location.protocol === 'https:' ? 'wss' : 'ws'
    this.ws = new WebSocket(`${proto}://${location.host}/api/ws/log`)
    this.ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        this.listeners.forEach((l) => l(data))
      } catch {
        // ignore malformed frames
      }
    }
    this.ws.onclose = () => {
      this.ws = null
      setTimeout(() => this.connect(), this.reconnectMs)
    }
    this.ws.onerror = () => this.ws?.close()
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }
}

export const logBus = new LogBus()
