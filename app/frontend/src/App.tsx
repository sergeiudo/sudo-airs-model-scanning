import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { logBus } from '@/lib/ws'
import { AppShell } from '@/components/AppShell'
import { Dashboard } from '@/pages/Dashboard'
import { GetStarted } from '@/pages/GetStarted'
import { SetupGuide } from '@/pages/SetupGuide'
import { SdkCli } from '@/pages/SdkCli'
import { Scan } from '@/pages/Scan'
import { ScansList } from '@/pages/ScansList'
import { ScanDetail } from '@/pages/ScanDetail'
import { Compare } from '@/pages/Compare'
import { Groups } from '@/pages/Groups'
import { GroupDetail } from '@/pages/GroupDetail'
import { Rules } from '@/pages/Rules'
import { Models } from '@/pages/Models'
import { CicdGenerator } from '@/pages/CicdGenerator'
import { Environment } from '@/pages/Environment'
import { Sources } from '@/pages/Sources'
import { Threats } from '@/pages/Threats'
import { Faq } from '@/pages/Faq'
import { Policy } from '@/pages/Policy'
import { Resources } from '@/pages/Resources'

export default function App() {
  useEffect(() => { logBus.connect() }, [])
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/start" element={<GetStarted />} />
        <Route path="/guide" element={<SetupGuide />} />
        <Route path="/integrate" element={<SdkCli />} />
        <Route path="/scan" element={<Scan />} />
        <Route path="/scans" element={<ScansList />} />
        <Route path="/scans/:scanUuid" element={<ScanDetail />} />
        <Route path="/compare" element={<Compare />} />
        <Route path="/groups" element={<Groups />} />
        <Route path="/groups/:groupUuid" element={<GroupDetail />} />
        <Route path="/rules" element={<Rules />} />
        <Route path="/threats" element={<Threats />} />
        <Route path="/sources" element={<Sources />} />
        <Route path="/models" element={<Models />} />
        <Route path="/models/:modelUuid" element={<Models />} />
        <Route path="/models/:modelUuid/versions/:versionUuid" element={<Models />} />
        <Route path="/cicd" element={<CicdGenerator />} />
        <Route path="/policy" element={<Policy />} />
        <Route path="/faq" element={<Faq />} />
        <Route path="/resources" element={<Resources />} />
        <Route path="/environment" element={<Environment />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  )
}
