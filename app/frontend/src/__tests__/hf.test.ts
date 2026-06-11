import { describe, it, expect } from 'vitest'
import { validateHuggingFaceUri } from '@/lib/hf'

describe('validateHuggingFaceUri', () => {
  it('accepts an org/model URI', () => {
    expect(validateHuggingFaceUri('https://huggingface.co/openai-community/gpt2')).toEqual({ ok: true })
  })
  it('accepts trailing slash', () => {
    expect(validateHuggingFaceUri('https://huggingface.co/openai-community/gpt2/')).toEqual({ ok: true })
  })
  it('rejects single-segment (no org)', () => {
    const r = validateHuggingFaceUri('https://huggingface.co/gpt2')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toMatch(/org\/author/)
  })
  it('rejects non-huggingface host', () => {
    const r = validateHuggingFaceUri('https://example.com/foo/bar')
    expect(r.ok).toBe(false)
  })
})
