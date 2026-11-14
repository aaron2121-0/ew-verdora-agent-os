"""Wait for the existing bundle builder, pin its bytes, commit only the loader."""
import hashlib
import json
import os
from pathlib import Path
import re
import time
from common import api, git

BUNDLE = 'apps/agent-mobile/dist/railway-function.ts'
LOADER = 'apps/agent-mobile/railway-loader.ts'
BUILD_INPUTS = ['apps/agent-mobile/public', 'apps/agent-mobile/vendor',
                'content/handbook', 'content/onboarding/kyc_copy.json', 'apps/agent-mobile/build-railway-function.mjs',
                'apps/agent-mobile/package.json', 'package.json', 'package-lock.json',
                '.github/workflows/phase1-build-bundle.yml']

def update_loader(text, commit, digest, version):
    if not re.fullmatch(r'[0-9a-f]{40}', commit) or not re.fullmatch(r'[0-9a-f]{64}', digest):
        raise ValueError('Invalid bundle pin')
    if not isinstance(version, str) or not re.fullmatch(r'\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?', version):
        raise ValueError('Agent package.json must contain a valid version')
    for key, value in [('BUNDLE_COMMIT', commit), ('BUNDLE_SHA256', digest), ('VERSION', version)]:
        text, count = re.subn(r'const ' + key + r'="[^"\n]*";', f'const {key}={json.dumps(value)};', text)
        if count != 1:
            raise ValueError(f'Expected exactly one {key}')
    if len(text.encode()) > 96 * 1024:
        raise ValueError('Loader exceeds 96KB')
    return text

def main():
    git('fetch', 'origin', 'main')
    target = git('rev-parse', 'origin/main')
    git('checkout', '--detach', target)
    # The queue may coalesce pending pushes. Always release latest main, while
    # refusing to combine a bundle with different source inputs.
    deadline = time.monotonic() + 1200
    while True:
        git('fetch', 'origin', 'main')
        head = git('rev-parse', 'origin/main')
        if git('diff', '--name-only', target, head, '--', *BUILD_INPUTS):
            raise RuntimeError('Build inputs advanced; a newer production run must release them')
        git('checkout', '--detach', head)
        provenance_path = Path('apps/agent-mobile/dist/build-provenance.json')
        if provenance_path.exists():
            provenance = json.loads(provenance_path.read_text())
            source = provenance['source_sha']
            if not re.fullmatch(r'[0-9a-f]{40}', source):
                raise ValueError('Invalid provenance SHA')
            if not git('diff', '--name-only', source, head, '--', *BUILD_INPUTS):
                runs = api('/actions/workflows/phase1-build-bundle.yml/runs?branch=main&head_sha=' + source)['workflow_runs']
                if any(r['conclusion'] == 'success' for r in runs):
                    break
        if time.monotonic() >= deadline:
            raise RuntimeError('No matching successful bundle build; run Phase 1 Build Railway Bundle on main first')
        time.sleep(10)
    bundle_commit = git('log', '-1', '--format=%H', '--', 'apps/agent-mobile/dist/build-provenance.json')
    git('merge-base', '--is-ancestor', source, bundle_commit)
    if git('diff', '--name-only', bundle_commit, head, '--', *BUILD_INPUTS):
        raise RuntimeError('Bundle does not match current build inputs')
    # Read exact bytes at immutable SHA, never a mutable raw/main URL.
    digest = hashlib.sha256(Path(BUNDLE).read_bytes()).hexdigest()
    if digest != provenance['sha256']:
        raise RuntimeError('Bundle provenance digest mismatch')
    version = json.loads(Path('apps/agent-mobile/package.json').read_text())['version']
    loader = Path(LOADER)
    loader.write_text(update_loader(loader.read_text(), bundle_commit, digest, version))
    git('config', 'user.name', 'github-actions[bot]')
    git('config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com')
    if git('diff', '--name-only'):
        git('add', LOADER)
        git('commit', '-m', 'chore: pin production loader [production-loader]')
        # Never rebase a prepared release or force push. A concurrent writer wins.
        git('push', 'origin', 'HEAD:main')
    sha = git('rev-parse', 'HEAD')
    with open(os.environ['GITHUB_OUTPUT'], 'a') as output:
        output.write(f'sha={sha}\n')
    with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as summary:
        summary.write(f'Prepared immutable release `{sha}`; bundle `{bundle_commit}`, SHA256 `{digest}`, version `{version}`.\n')

if __name__ == '__main__':
    main()
