import { describe, it, expect } from 'vitest'
import { renderPython } from '@/lib/codegen'

function evt(method: string, kwargs: Record<string, unknown>) {
  return {
    id: 'x', method, kwargs,
    status: 'ok' as const, started_at: 0, duration_ms: 10,
    response_summary: null, response_full: null, error: null,
  }
}

describe('renderPython', () => {
  it('no args', () => {
    expect(renderPython(evt('list_security_groups', {}))).toBe('client.list_security_groups()')
  })

  it('string arg quoted', () => {
    expect(renderPython(evt('get_model', { model_id: 'abc' })))
      .toBe("client.get_model(model_id='abc')")
  })

  it('uuid arg wrapped', () => {
    const out = renderPython(evt('scan', {
      security_group_uuid: '8f3ed1c3-d918-438b-a4c9-d729b1c4cfb2',
      model_uri: 'https://huggingface.co/openai-community/gpt2',
    }))
    expect(out).toContain("UUID('8f3ed1c3-d918-438b-a4c9-d729b1c4cfb2')")
    expect(out).toContain("model_uri='https://huggingface.co/openai-community/gpt2'")
  })

  it('int arg unquoted', () => {
    expect(renderPython(evt('list_scans', { limit: 25 })))
      .toBe('client.list_scans(limit=25)')
  })

  it('list arg', () => {
    expect(renderPython(evt('scan', { allow_patterns: ['*.bin', '*.json'] })))
      .toBe("client.scan(allow_patterns=['*.bin', '*.json'])")
  })

  it('positional arg encoded as arg0', () => {
    expect(renderPython(evt('get_scan', { arg0: 'd110c5a5-27a0-459e-9556-eda7196c6ac3' })))
      .toContain("UUID('d110c5a5-27a0-459e-9556-eda7196c6ac3')")
  })
})
