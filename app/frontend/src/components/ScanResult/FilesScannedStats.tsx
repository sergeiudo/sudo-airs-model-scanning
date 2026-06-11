export function FilesScannedStats({
  scanned, skipped, scannerVersion,
}: { scanned?: number; skipped?: number; scannerVersion?: string }) {
  if (scanned == null && skipped == null && !scannerVersion) return null
  return (
    <div className="bg-bg-raised border border-border rounded-lg p-4 grid grid-cols-3 gap-3">
      <Cell k="Files scanned" v={scanned ?? '—'} />
      <Cell k="Files skipped" v={skipped ?? '—'} />
      <Cell k="Scanner version" v={scannerVersion ?? '—'} />
    </div>
  )
}

function Cell({ k, v }: { k: string; v: string | number }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-fg-faint">{k}</div>
      <div className="text-lg font-mono mt-0.5">{v}</div>
    </div>
  )
}
