"""Deployment utilities. Never log API response bodies or process environments."""
import json
import os
import subprocess
import urllib.request
import urllib.error

PROJECT = 'vuibesuahnhlafsfraeo'
RAILWAY_PROJECT = 'c9d145ac-87ae-4aec-84d8-085cbc5b67eb'
RAILWAY_ENV = 'e9d871fd-c95e-4760-a672-31d67932eeac'
SERVICES = {'agent': ('efb7f933-21c3-4b64-8c61-59d917a31f04', 'apps/agent-mobile/railway-loader.ts'),
            'owner': ('74ada93b-7aea-4a8a-b54f-a71ab23df5ea', 'apps/owner-mobile/index.ts')}

def run(*args, cwd=None):
    # Capture output: CLI errors can include platform data. Emit command name only.
    result = subprocess.run(args, cwd=cwd, text=True, capture_output=True, timeout=180)
    if result.returncode:
        raise RuntimeError(f'{args[0]} failed (exit {result.returncode}); response suppressed')
    return result.stdout.strip()

def git(*args):
    return run('git', *args)

def api(path, data=None):
    body = None if data is None else json.dumps(data).encode()
    req = urllib.request.Request('https://api.github.com/repos/' + os.environ['GITHUB_REPOSITORY'] + path,
        data=body, headers={'Authorization': 'Bearer ' + os.environ['GH_TOKEN'],
        'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        raise RuntimeError(f'GitHub API request failed ({error.code}); body suppressed') from None

def pages(path):
    page = 1
    while True:
        rows = api(path + ('&' if '?' in path else '?') + f'per_page=100&page={page}')
        yield from rows
        if len(rows) < 100:
            return
        page += 1
