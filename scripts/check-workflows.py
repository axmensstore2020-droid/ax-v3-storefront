"""Validate every workflow's YAML and embedded Bash before deployment."""
from pathlib import Path
import subprocess
import yaml

for path in sorted(Path('.github/workflows').glob('*.yml')):
    workflow = yaml.safe_load(path.read_text())
    assert isinstance(workflow.get('jobs'), dict), f'{path}: missing jobs'
    for job in workflow['jobs'].values():
        for step in job.get('steps', []):
            if 'run' in step and step.get('shell', 'bash') == 'bash':
                subprocess.run(['bash', '-n'], input=step['run'], text=True, check=True)
    print(f'PASS {path}: YAML and shell syntax')
