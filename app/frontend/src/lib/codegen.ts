import type { SDKEvent } from './types'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

function reprArg(value: unknown): string {
  if (typeof value === 'string') {
    return UUID_RE.test(value) ? `UUID('${value}')` : `'${value.replace(/'/g, "\\'")}'`
  }
  if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
    return value === null ? 'None' : value === true ? 'True' : value === false ? 'False' : String(value)
  }
  if (Array.isArray(value)) {
    return '[' + value.map(reprArg).join(', ') + ']'
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => `${reprArg(k)}: ${reprArg(v)}`)
    return '{' + entries.join(', ') + '}'
  }
  return String(value)
}

/** Render an SDK event as the equivalent client.method(...) call. */
export function renderPython(event: SDKEvent): string {
  const args = Object.entries(event.kwargs)
  if (args.length === 0) return `client.${event.method}()`
  const parts = args.map(([k, v]) => {
    // Positional args from SDKProxy.call(*args) are recorded as arg0, arg1, …
    // Render those without the keyword prefix to match Python call shape.
    if (/^arg\d+$/.test(k)) return reprArg(v)
    return `${k}=${reprArg(v)}`
  })
  return `client.${event.method}(${parts.join(', ')})`
}
