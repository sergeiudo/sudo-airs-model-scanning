import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { VerdictCard } from '@/components/ScanResult/VerdictCard'

describe('VerdictCard', () => {
  it('renders ALLOWED with a positive label', () => {
    render(<VerdictCard outcome="ALLOWED" />)
    expect(screen.getByText(/allowed/i)).toBeInTheDocument()
  })

  it('renders BLOCKED with a negative label', () => {
    render(<VerdictCard outcome="BLOCKED" />)
    expect(screen.getByText(/blocked/i)).toBeInTheDocument()
  })

  it('shows the headline if provided', () => {
    render(<VerdictCard outcome="ALLOWED" headline="microsoft/DialoGPT-medium" />)
    expect(screen.getByText('microsoft/DialoGPT-medium')).toBeInTheDocument()
  })

  it('falls back gracefully on unknown outcomes', () => {
    render(<VerdictCard outcome="UNKNOWN_STATE" />)
    expect(screen.getByText(/unknown_state/i)).toBeInTheDocument()
  })
})
