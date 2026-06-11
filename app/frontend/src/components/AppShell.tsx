import { useState } from 'react'
import type { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { Drawer } from './Drawer/Drawer'
import { SetupStatusProvider } from '@/lib/setupStatus'

export function AppShell({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(true)
  return (
    <SetupStatusProvider>
      <div className="h-full flex flex-col">
        <div className="flex-1 flex min-h-0">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <Header />
            <main className="flex-1 overflow-auto">
              <div className="max-w-6xl mx-auto px-8 py-6">{children}</div>
            </main>
          </div>
        </div>
        <Drawer open={drawerOpen} onToggle={() => setDrawerOpen((v) => !v)} />
      </div>
    </SetupStatusProvider>
  )
}
