import { useEffect, useMemo, useState } from 'react'
import type { GroupsList, SecurityGroup } from '@/lib/types'
import { api } from '@/lib/api'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Field, Select, Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { CodeBlock } from '@/components/ui/CodeBlock'
import { Callout } from '@/components/ui/Callout'

type Platform = 'github' | 'gitlab' | 'jenkins' | 'azure' | 'circleci' | 'shell'

const PLATFORMS: { id: Platform; label: string; file: string }[] = [
  { id: 'github', label: 'GitHub Actions', file: '.github/workflows/model-scan.yml' },
  { id: 'gitlab', label: 'GitLab CI', file: '.gitlab-ci.yml' },
  { id: 'jenkins', label: 'Jenkins', file: 'Jenkinsfile' },
  { id: 'azure', label: 'Azure DevOps', file: 'azure-pipelines.yml' },
  { id: 'circleci', label: 'CircleCI', file: '.circleci/config.yml' },
  { id: 'shell', label: 'Plain shell (bash)', file: 'scripts/scan-model.sh' },
]

export function CicdGenerator() {
  const [groups, setGroups] = useState<SecurityGroup[]>([])
  const [groupUuid, setGroupUuid] = useState<string>('')
  const [modelUri, setModelUri] = useState<string>('https://huggingface.co/openai-community/gpt2')
  const [platform, setPlatform] = useState<Platform>('github')

  useEffect(() => {
    api.groups().then((r: GroupsList) => {
      setGroups(r.security_groups)
      if (r.security_groups.length > 0) setGroupUuid(r.security_groups[0].uuid)
    })
  }, [])

  const yaml = useMemo(() => renderWorkflow(platform, groupUuid, modelUri), [platform, groupUuid, modelUri])
  const file = PLATFORMS.find((p) => p.id === platform)!.file

  return (
    <div className="space-y-4 max-w-4xl">
      <SectionHeader
        title="CI/CD generator"
        subtitle="Pick a platform, security group, and model URI. The scan's exit code is the gate — non-zero blocks the build."
      />

      <Card className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Platform">
          <Select value={platform} onChange={(e) => setPlatform(e.target.value as Platform)}>
            {PLATFORMS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </Select>
        </Field>
        <Field label="Security group">
          <Select value={groupUuid} onChange={(e) => setGroupUuid(e.target.value)}>
            {groups.map((g) => <option key={g.uuid} value={g.uuid}>{g.name} ({g.source_type})</option>)}
          </Select>
        </Field>
        <Field label="Model URI">
          <Input value={modelUri} onChange={(e) => setModelUri(e.target.value)} className="font-mono" />
        </Field>
      </Card>

      <CodeBlock label={file} code={yaml} />

      <Callout tone="warn" title="Secrets vs variables">
        Store <span className="font-mono text-fg">MODEL_SECURITY_CLIENT_ID</span>,{' '}
        <span className="font-mono text-fg">MODEL_SECURITY_CLIENT_SECRET</span>, and{' '}
        <span className="font-mono text-fg">TSG_ID</span> as <span className="text-fg">masked secrets</span>.
        The security group UUID is <span className="text-fg">not sensitive</span> — keep it as a plain
        CI variable. Vendor <span className="font-mono text-fg">get-pypi-url.sh</span> into your repo so
        the build can authenticate to the private PyPI.
      </Callout>
    </div>
  )
}

function renderWorkflow(platform: Platform, groupUuid: string, modelUri: string): string {
  const g = groupUuid || '<security-group-uuid>'
  const m = modelUri || 'https://huggingface.co/openai-community/gpt2'
  switch (platform) {
    case 'github':
      return `name: model-scan
on:
  pull_request:
  workflow_dispatch:

jobs:
  scan:
    runs-on: ubuntu-latest
    env:
      MODEL_SECURITY_CLIENT_ID: \${{ secrets.MODEL_SECURITY_CLIENT_ID }}
      MODEL_SECURITY_CLIENT_SECRET: \${{ secrets.MODEL_SECURITY_CLIENT_SECRET }}
      TSG_ID: \${{ secrets.TSG_ID }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.12' }
      - name: Install jq + AIRS Model Security SDK/CLI
        run: |
          sudo apt-get update && sudo apt-get install -y jq
          PYPI_URL=$(./scripts/get-pypi-url.sh)
          pip install model-security-client --extra-index-url "$PYPI_URL"
      - name: Scan — fail build on BLOCKED or scan error
        run: |
          model-security scan \\
            --security-group-uuid "${g}" \\
            --model-uri "${m}" \\
            --poll-timeout-secs 900 \\
            --block-on-errors
`
    case 'gitlab':
      return `stages: [scan]

model-security-scan:
  stage: scan
  image: python:3.12
  variables:
    MODEL_SECURITY_CLIENT_ID: $MODEL_SECURITY_CLIENT_ID
    MODEL_SECURITY_CLIENT_SECRET: $MODEL_SECURITY_CLIENT_SECRET
    TSG_ID: $TSG_ID
  before_script:
    - apt-get update && apt-get install -y jq
    - PYPI_URL=$(./scripts/get-pypi-url.sh)
    - pip install model-security-client --extra-index-url "$PYPI_URL"
  script:
    - >
      model-security scan
      --security-group-uuid "${g}"
      --model-uri "${m}"
      --poll-timeout-secs 900
      --block-on-errors
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_PIPELINE_SOURCE == "schedule"
`
    case 'jenkins':
      return `pipeline {
  agent any
  environment {
    MODEL_SECURITY_CLIENT_ID = credentials('MODEL_SECURITY_CLIENT_ID')
    MODEL_SECURITY_CLIENT_SECRET = credentials('MODEL_SECURITY_CLIENT_SECRET')
    TSG_ID = credentials('TSG_ID')
  }
  stages {
    stage('Install') {
      steps {
        sh '''
          apt-get update && apt-get install -y jq
          PYPI_URL=$(./scripts/get-pypi-url.sh)
          pip install model-security-client --extra-index-url "$PYPI_URL"
        '''
      }
    }
    stage('Scan') {
      steps {
        sh '''
          model-security scan \\
            --security-group-uuid "${g}" \\
            --model-uri "${m}" \\
            --poll-timeout-secs 900 \\
            --block-on-errors
        '''
      }
    }
  }
}
`
    case 'azure':
      return `trigger: [main]

pool:
  vmImage: 'ubuntu-latest'

variables:
  MODEL_SECURITY_CLIENT_ID: $(MODEL_SECURITY_CLIENT_ID)
  MODEL_SECURITY_CLIENT_SECRET: $(MODEL_SECURITY_CLIENT_SECRET)
  TSG_ID: $(TSG_ID)

steps:
  - task: UsePythonVersion@0
    inputs: { versionSpec: '3.12' }
  - script: |
      sudo apt-get update && sudo apt-get install -y jq
      PYPI_URL=$(./scripts/get-pypi-url.sh)
      pip install model-security-client --extra-index-url "$PYPI_URL"
    displayName: Install SDK/CLI
  - script: |
      model-security scan \\
        --security-group-uuid "${g}" \\
        --model-uri "${m}" \\
        --poll-timeout-secs 900 \\
        --block-on-errors
    displayName: Scan model
`
    case 'circleci':
      return `version: 2.1

jobs:
  scan:
    docker:
      - image: cimg/python:3.12
    environment:
      MODEL_SECURITY_CLIENT_ID: $MODEL_SECURITY_CLIENT_ID
      MODEL_SECURITY_CLIENT_SECRET: $MODEL_SECURITY_CLIENT_SECRET
      TSG_ID: $TSG_ID
    steps:
      - checkout
      - run: |
          sudo apt-get update && sudo apt-get install -y jq
          PYPI_URL=$(./scripts/get-pypi-url.sh)
          pip install model-security-client --extra-index-url "$PYPI_URL"
      - run: |
          model-security scan \\
            --security-group-uuid "${g}" \\
            --model-uri "${m}" \\
            --poll-timeout-secs 900 \\
            --block-on-errors

workflows:
  version: 2
  build_and_scan:
    jobs: [scan]
`
    case 'shell':
      return `#!/usr/bin/env bash
# Set these as exported env vars or fetch from a secret manager:
#   MODEL_SECURITY_CLIENT_ID, MODEL_SECURITY_CLIENT_SECRET, TSG_ID
set -euo pipefail

# Authenticate to the private PyPI and install the SDK/CLI.
apt-get install -y jq 2>/dev/null || brew install jq
PYPI_URL=$(./scripts/get-pypi-url.sh)
pip install model-security-client --extra-index-url "$PYPI_URL"

model-security scan \\
  --security-group-uuid "${g}" \\
  --model-uri "${m}" \\
  --poll-timeout-secs 900 \\
  --block-on-errors

# Exit code is the gate: 0 = ALLOWED, non-zero = BLOCKED or scan ERROR.
`
  }
}
