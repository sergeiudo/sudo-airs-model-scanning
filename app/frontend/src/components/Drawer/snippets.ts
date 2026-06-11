export const SNIPPETS: { label: string; code: string }[] = [
  {
    label: 'list_security_groups',
    code: 'r = client.call("list_security_groups")\npprint.pprint(r.model_dump(mode="json"))',
  },
  {
    label: 'scan a HuggingFace model',
    code: [
      'groups = client.call("list_security_groups").security_groups',
      'hf = next(g for g in groups if "HUGGING_FACE" in str(g.source_type))',
      'r = client.call("scan",',
      '    security_group_uuid=hf.uuid,',
      '    model_uri="https://huggingface.co/microsoft/DialoGPT-medium")',
      'print(r.eval_outcome)',
    ].join('\n'),
  },
  {
    label: 'recent scans',
    code: 'for s in client.call("list_scans", limit=5).scans:\n    print(s.eval_outcome, s.model_uri)',
  },
  {
    label: 'inspect a violation',
    code: [
      'scan = client.call("list_scans", limit=20).scans[0]',
      'vs = client.call("get_scan_violations", UUID(scan.uuid)).violations',
      'pprint.pprint([v.model_dump() for v in vs])',
    ].join('\n'),
  },
]
