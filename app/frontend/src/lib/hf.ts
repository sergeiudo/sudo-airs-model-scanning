// HF model URIs must include an org/author segment.
// Valid:   https://huggingface.co/openai-community/gpt2
// Invalid: https://huggingface.co/gpt2
const HF_RE = /^https:\/\/huggingface\.co\/([\w.\-]+)\/([\w.\-]+)\/?$/

export type HFValidation = { ok: true } | { ok: false; reason: string }

export function validateHuggingFaceUri(uri: string): HFValidation {
  if (!uri.startsWith('https://huggingface.co/')) {
    return { ok: false, reason: 'Must start with https://huggingface.co/' }
  }
  const tail = uri.slice('https://huggingface.co/'.length).replace(/\/$/, '')
  const parts = tail.split('/')
  if (parts.length < 2 || !parts[0] || !parts[1]) {
    return {
      ok: false,
      reason: 'Missing org/author segment. Use https://huggingface.co/<org>/<model> (e.g. openai-community/gpt2).',
    }
  }
  if (!HF_RE.test(uri.replace(/\/$/, ''))) {
    return { ok: false, reason: 'Unexpected characters in org or model name.' }
  }
  return { ok: true }
}
