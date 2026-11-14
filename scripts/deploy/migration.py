"""Preview or execute exactly ONE reviewed SQL file, without migration history repair."""
import hashlib
import json
import os
from pathlib import Path
import re
import sys
import urllib.request
import urllib.error
from common import PROJECT, api


def migration_file(name):
    if not re.fullmatch(r'[0-9]+_[A-Za-z0-9_-]+\.sql', name):
        raise ValueError('Use one migration basename, without directories')
    path = Path('supabase/migrations') / name
    if path.is_symlink() or not path.is_file():
        raise ValueError('Migration must be an existing regular file')
    sql = path.read_text()
    # Fail closed for sensitive or programmable SQL. This workflow is intentionally
    # unsuitable for arbitrary procedural migrations; those need a separate review.
    normalized = re.sub(r'["\s]+', '', sql).lower()
    forbidden = ('vault', 'app_settings', 'agent_kyc_required', 'gemini_api_key',
                 'dblink', 'http_', 'net.', 'pg_read', 'pg_write', 'pg_ls',
                 'secret', 'password', 'token', '\\', 'u&', 'chr(', 'decode(')
    if any(word in normalized for word in forbidden):
        raise ValueError('Sensitive SQL is forbidden in this workflow; SQL not printed')
    if re.search(r'\b(do|execute|call|copy|prepare|commit|rollback|begin|start\s+transaction|create\s+(?:or\s+replace\s+)?(?:function|procedure)|alter\s+system)\b', sql, re.I):
        raise ValueError('Procedural/external/transaction-control SQL requires separate manual review; SQL not printed')
    return path, sql


def main():
    path, sql = migration_file(os.environ['MIGRATION_FILE'])
    digest = hashlib.sha256(sql.encode()).hexdigest()
    if sys.argv[1] == 'preview':
        print(f'DRY-RUN / SQL preview only; no database connection. File: {path}; SHA256: {digest}')
        print(sql)
        with open(os.environ['GITHUB_OUTPUT'], 'a') as output:
            output.write(f'digest={digest}\n')
        with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as summary:
            summary.write(f'待审核：`{path}`，SHA256 `{digest}`。请先查看 preview job 的完整 SQL，再核准 production-db。此预览没有连接数据库、没有验证 SQL 可执行性。\n')
        environment = api('/environments/production-db')
        rules = environment.get('protection_rules', [])
        if not any(rule.get('type') == 'required_reviewers' and rule.get('reviewers') for rule in rules):
            raise ValueError('production-db must have required reviewers configured before SQL can proceed')
        return
    if sys.argv[1] != 'apply' or os.environ.get('GITHUB_REF') != 'refs/heads/main':
        raise ValueError('Only apply from main is supported')
    if digest != os.environ['EXPECTED_DIGEST']:
        raise ValueError('SQL changed after review')
    token = os.environ.get('SUPABASE_ACCESS_TOKEN')
    if not token:
        raise ValueError('Missing SUPABASE_ACCESS_TOKEN')
    # One explicit transaction, one selected file. Never db push / migration up.
    payload = json.dumps({'query': 'BEGIN;\n' + sql + '\nCOMMIT;', 'read_only': False}).encode()
    req = urllib.request.Request(f'https://api.supabase.com/v1/projects/{PROJECT}/database/query',
        data=payload, headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=120) as response:
            # Do NOT print returned rows (they may contain private data).
            if response.status not in (200, 201):
                raise RuntimeError('Migration request failed; response suppressed')
    except (urllib.error.URLError, TimeoutError):
        raise RuntimeError('Migration request failed or timed out; result unknown. Inspect database before retry; response suppressed') from None
    with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as summary:
        summary.write(f'已执行一个文件 `{path}`，SHA256 `{digest}`。未读取或修复 migration history。\n')

if __name__ == '__main__':
    main()
