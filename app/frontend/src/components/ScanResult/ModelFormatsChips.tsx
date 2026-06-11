export function ModelFormatsChips({ formats }: { formats?: string[] }) {
  if (!formats || formats.length === 0) return null
  return (
    <div className="bg-bg-raised border border-border rounded-lg p-4">
      <div className="text-xs uppercase tracking-wide text-fg-faint mb-2">Model formats detected</div>
      <div className="flex flex-wrap gap-1.5">
        {formats.map((f, i) => (
          <span key={`${i}-${f}`} className="px-2 py-0.5 rounded bg-bg-subtle text-fg-dim text-[11px] font-mono border border-border">
            {f}
          </span>
        ))}
      </div>
    </div>
  )
}
