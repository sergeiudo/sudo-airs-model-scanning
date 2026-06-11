import { useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Card } from '@/components/ui/Card'
import { FAQ, type FaqItem } from '@/lib/faqData'

export function Faq() {
  const [q, setQ] = useState('')

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return FAQ
    return FAQ
      .map((g) => ({
        ...g,
        items: g.items.filter(
          (it) => it.q.toLowerCase().includes(needle) || it.a.toLowerCase().includes(needle),
        ),
      }))
      .filter((g) => g.items.length > 0)
  }, [q])

  const total = FAQ.reduce((n, g) => n + g.items.length, 0)
  const shown = groups.reduce((n, g) => n + g.items.length, 0)

  return (
    <div className="space-y-5 max-w-3xl">
      <SectionHeader
        title="Customer FAQ"
        subtitle="Straight answers to the questions customers actually ask — data handling, network, verdicts, limits, and positioning."
      />

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search questions and answers…"
        className="bg-bg-subtle border border-border rounded-md px-3 py-2 text-sm w-full"
      />

      {groups.map((g) => (
        <div key={g.theme} className="space-y-2">
          <h2 className="text-sm font-semibold text-fg-dim uppercase tracking-wide">{g.theme}</h2>
          <div className="space-y-2">
            {g.items.map((it) => <FaqRow key={it.q} item={it} defaultOpen={!!q} />)}
          </div>
        </div>
      ))}

      {shown === 0 && (
        <Card className="p-6 text-sm text-fg-faint">No questions match “{q}”.</Card>
      )}

      <div className="text-[11px] text-fg-faint">
        Showing {shown} of {total} questions. Account-specific answers (pricing, exact retention,
        regions) should be confirmed with your Palo Alto account team.
      </div>
    </div>
  )
}

function FaqRow({ item, defaultOpen }: { item: FaqItem; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-bg-subtle/40 transition-colors"
      >
        <span className="text-sm font-medium">{item.q}</span>
        <ChevronDown className={`w-4 h-4 shrink-0 text-fg-faint transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 -mt-1 text-sm text-fg-dim leading-relaxed">{item.a}</div>
      )}
    </Card>
  )
}
