"""Production deploy transaction; no migrations, variables, Vault or settings writes."""
import json
import os
from pathlib import Path, PurePosixPath
import re
import tempfile
import time
import urllib.request
import urllib.error
from common import PROJECT, RAILWAY_PROJECT, RAILWAY_ENV, SERVICES, api, pages, git, run

FUNCTIONS = 'supabase/functions/'

def files_at(sha):
    return git('ls-tree', '-r', '--name-only', sha).splitlines()

def function_names(files):
    return {p.split('/')[2] for p in files if p.startswith(FUNCTIONS)
            and len(p.split('/')) > 3 and p.split('/')[2] != '_shared'
            and p.endswith('/index.ts')}

def affected_functions(before, after, changed):
    """Walk relative import dependencies in BOTH trees (also catches removed imports).

    Unknown/dynamic local imports conservatively include that function for shared changes.
    """
    old_files, new_files = files_at(before), files_at(after)
    names = function_names(new_files)
    removed = function_names(old_files) - names
    if removed:
        raise ValueError('Function removal requires a separate reviewed manual release')
    if 'supabase/config.toml' in changed:
        return sorted(names)
    selected = {p.split('/')[2] for p in changed if p.startswith(FUNCTIONS)
                and len(p.split('/')) > 3 and p.split('/')[2] in names}
    shared = {p for p in changed if p.startswith(FUNCTIONS + '_shared/')}
    if not shared:
        return sorted(selected)
    for sha, files in [(before, old_files), (after, new_files)]:
        available = set(files)
        for name in names:
            seen, stack = set(), [p for p in files if p.startswith(FUNCTIONS + name + '/')]
            uncertain = False
            while stack:
                path = stack.pop()
                if path in seen:
                    continue
                seen.add(path)
                if not path.endswith(('.ts', '.js', '.mjs', '.json')):
                    continue
                text = git('show', sha + ':' + path)
                if re.search(r'import\s*\(\s*[^\s\'"]', text):
                    uncertain = True
                for relative in re.findall(r'''(?:from\s*|import\s*\(\s*|import\s*)["'](\.[^"']+)["']''', text):
                    import posixpath
                    dependency = posixpath.normpath(str(PurePosixPath(path).parent / relative))
                    candidates = [dependency, dependency + '.ts', dependency + '.js', dependency + '/index.ts']
                    found = next((p for p in candidates if p in available), None)
                    if found:
                        stack.append(found)
                    else:
                        uncertain = True
            if shared & seen or uncertain:
                selected.add(name)
    return sorted(selected)

def loader_info(root):
    text = (Path(root) / SERVICES['agent'][1]).read_text()
    return {key: re.search(r'const ' + key + r'="([^"\n]+)";', text)[1]
            for key in ('VERSION', 'BUNDLE_COMMIT', 'BUNDLE_SHA256')}

def request(url, method='GET'):
    req = urllib.request.Request(url, method=method,
        data=b'{}' if method == 'POST' else None,
        headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=20) as response:
            return response.status, response.read().decode()
    except urllib.error.HTTPError as error:
        return error.code, ''

def health(root, attempts=20, require_google=True):
    expected = loader_info(root)
    for attempt in range(attempts):
        try:
            status, body = request('https://agent-mobile-production.up.railway.app/health')
            agent = json.loads(body)
            assert status == 200 and agent.get('ok') is True
            assert agent.get('version') == expected['VERSION']
            assert agent.get('bundle') == expected['BUNDLE_COMMIT'][:8]
            status, body = request('https://owner-mobile-production.up.railway.app/health')
            assert status == 200 and json.loads(body).get('ok') is True
            for name in ('agent-session', 'owner-session', 'agent-ai'):
                assert request(f'https://{PROJECT}.supabase.co/functions/v1/{name}', 'POST')[0] == 401
            status, body = request('https://agent-mobile-production.up.railway.app/')
            assert status == 200
            if require_google:
                assert 'Continue with Google' in body
            return
        except (AssertionError, ValueError, OSError):
            if attempt + 1 == attempts:
                raise RuntimeError('Production smoke checks failed; response bodies suppressed') from None
            time.sleep(10)

def previous_release():
    for deployment in pages('/deployments?environment=production&task=production-auto-deploy'):
        statuses = api(f'/deployments/{deployment["id"]}/statuses?per_page=100')
        if statuses and statuses[0]['state'] == 'success':
            return deployment['sha']
    baseline = os.environ.get('BASELINE_SHA', '')
    if not re.fullmatch(r'[0-9a-f]{40}', baseline):
        raise ValueError('No successful release: manually dispatch with an owner-attested baseline_sha first')
    return baseline

def checkout_tree(sha, path):
    # Extract only tracked files, without executing code from the rollback revision.
    run('git', 'worktree', 'add', '--detach', str(path), sha)

def railway(*args, cwd):
    return run('railway', *args, cwd=cwd)

def railway_deploy(app, root):
    service, relative = SERVICES[app]
    railway('link', '--project', RAILWAY_PROJECT, '--environment', RAILWAY_ENV, '--service', service, cwd=root)
    railway('functions', '--environment', RAILWAY_ENV, 'link', '--function', service, '--path', relative, cwd=root)
    old = json.loads(railway('deployment', 'list', '--service', service, '--environment', RAILWAY_ENV, '--json', cwd=root))
    old_ids = {d['id'] for d in old}
    railway('functions', '--environment', RAILWAY_ENV, 'push', '--path', relative, '--watch=false', cwd=root)
    # functions push queues a deploy; it does NOT prove terminal SUCCESS.
    deadline = time.monotonic() + 600
    while time.monotonic() < deadline:
        deployments = json.loads(railway('deployment', 'list', '--service', service, '--environment', RAILWAY_ENV, '--json', cwd=root))
        new = [d for d in deployments if d['id'] not in old_ids]
        if new:
            status = new[0]['status']
            if status == 'SUCCESS':
                return
            if status not in ('INITIALIZING', 'QUEUED', 'BUILDING', 'DEPLOYING', 'WAITING'):
                raise RuntimeError(f'Railway {app} deployment ended in {status}')
        time.sleep(5)
    raise RuntimeError(f'Railway {app} deployment timed out')

def deploy_edge(name, root):
    run('supabase', 'functions', 'deploy', name, '--remote=' + PROJECT, '--no-verify-jwt', '--use-api', '--yes', cwd=root)

def preflight(root):
    for _, relative in SERVICES.values():
        size = (Path(root) / relative).stat().st_size
        # Official CLI caps the encoded start command, tighter than raw source 96KB.
        if len('./run.sh ') + 4 * ((size + 2) // 3) >= 96 * 1024:
            raise ValueError(f'Railway source too large: {relative}')
    info = loader_info(root)
    import hashlib
    # git helper strips whitespace; use subprocess bytes for the hash instead.
    import subprocess
    raw = subprocess.check_output(['git', 'show', f'{info["BUNDLE_COMMIT"]}:apps/agent-mobile/dist/railway-function.ts'])
    if hashlib.sha256(raw).hexdigest() != info['BUNDLE_SHA256']:
        raise ValueError('Rollback/release bundle hash does not match immutable file')


def main():
    if os.environ.get('GITHUB_REF') != 'refs/heads/main':
        raise ValueError('Production only accepts main')
    for key in ('SUPABASE_ACCESS_TOKEN', 'RAILWAY_TOKEN'):
        if not os.environ.get(key):
            raise ValueError(f'Missing production environment secret: {key}')
    target = git('rev-parse', 'HEAD')
    previous = previous_release()
    git('merge-base', '--is-ancestor', previous, target)
    # Shared changes since the last SUCCESS include commits skipped/coalesced by the queue.
    changed = git('diff', '--name-only', previous, target).splitlines()
    functions = affected_functions(previous, target, changed)
    apps = [app for app, (_, path) in SERVICES.items() if path in changed]
    if any(p.startswith('apps/agent-mobile/') for p in changed) and 'agent' not in apps:
        apps.append('agent')
    with tempfile.TemporaryDirectory(prefix='production-rollback-') as directory:
        rollback = Path(directory) / 'previous'
        checkout_tree(previous, rollback)
        try:
            preflight('.')
            preflight(rollback)
            # Validate CLI surfaces before any production mutation.
            run('supabase', 'functions', 'deploy', '--help')
            run('railway', 'functions', 'push', '--help')
            # Bootstrap attestation is additionally checked against the live release.
            if os.environ.get('BASELINE_SHA') == previous:
                health(rollback, attempts=1, require_google=False)
            deployment = api('/deployments', {'ref': target, 'environment': 'production',
                'task': 'production-auto-deploy', 'auto_merge': False, 'required_contexts': [],
                'description': f'Rollback baseline {previous}'})
            deployment_id = deployment['id']
            status_path = f'/deployments/{deployment_id}/statuses'
            api(status_path, {'state': 'in_progress', 'auto_inactive': False})
            attempted_functions, attempted_apps = [], []
            try:
                # Track BEFORE calling, because a failed CLI may have partially updated remote state.
                for name in functions:
                    attempted_functions.append(name)
                    deploy_edge(name, '.')
                for app in apps:
                    attempted_apps.append(app)
                    railway_deploy(app, '.')
                health('.')
                api(status_path, {'state': 'success', 'auto_inactive': False,
                    'description': f'All checks passed; baseline was {previous}'})
            except Exception:
                errors = []
                old_names = function_names(files_at(previous))
                for name in reversed(attempted_functions):
                    try:
                        if name in old_names:
                            deploy_edge(name, rollback)
                        else:
                            run('supabase', 'functions', 'delete', name, '--remote=' + PROJECT, '--yes', cwd=rollback)
                    except Exception:
                        errors.append('Edge ' + name)
                for app in reversed(attempted_apps):
                    try:
                        railway_deploy(app, rollback)
                    except Exception:
                        errors.append('Railway ' + app)
                try:
                    health(rollback, require_google=os.environ.get('BASELINE_SHA') != previous)
                except Exception:
                    errors.append('rollback health')
                message = ('Rollback FAILED: ' + ', '.join(errors)) if errors else 'Rollback verified'
                with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as summary:
                    summary.write(f'❌ Release `{target}` failed. {message}. Baseline `{previous}`.\n')
                api(status_path, {'state': 'failure', 'auto_inactive': False, 'description': message[:140]})
                raise RuntimeError('Production release failed; ' + message) from None
            with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as summary:
                summary.write(f'✅ Release `{target}` verified. Previous successful SHA: `{previous}`.\n'
                    f'Edge Functions: {", ".join(functions) or "unchanged"}; Railway: {", ".join(apps) or "unchanged"}.\n')
        finally:
            run('git', 'worktree', 'remove', '--force', str(rollback))

if __name__ == '__main__':
    main()
