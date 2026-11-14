"""Offline safety regression tests: no production network or credentials."""
import hashlib
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).parent))
import prepare
import release
import migration

class DeployTests(unittest.TestCase):
    def test_supabase_v3_deploy_disables_gateway_jwt_and_targets_exact_project(self):
        with patch.object(release,'run') as run:
            release.deploy_edge('agent-ai','.')
            run.assert_called_once_with('supabase','functions','deploy','agent-ai',
                '--remote='+release.PROJECT,'--no-verify-jwt','--use-api','--yes',cwd='.')

    def test_loader_pin_and_version_reject_injection(self):
        text = 'const BUNDLE_COMMIT="old";\nconst BUNDLE_SHA256="old";\nconst VERSION="old";\n'
        result = prepare.update_loader(text, 'a'*40, 'b'*64, '1.2.3')
        self.assertIn('const VERSION="1.2.3";', result)
        self.assertIn('a'*40, result)
        for version in ('', '";evil()', None):
            with self.assertRaises(ValueError):
                prepare.update_loader(text, 'a'*40, 'b'*64, version)
        with self.assertRaises(ValueError):
            prepare.update_loader(text + text, 'a'*40, 'b'*64, '1.2.3')

    def select(self, old, new, changed):
        def fake_git(command, *args):
            if command == 'ls-tree':
                return '\n'.join((old if args[-1] == 'old' else new).keys())
            if command == 'show':
                sha, path = args[0].split(':', 1)
                return (old if sha == 'old' else new)[path]
            raise AssertionError(command)
        with patch.object(release, 'git', side_effect=fake_git):
            return release.affected_functions('old', 'new', changed)

    def test_shared_transitive_and_removed_dependency(self):
        old = {'supabase/functions/a/index.ts': 'import "../_shared/middle.ts";',
               'supabase/functions/b/index.ts': 'export default {};',
               'supabase/functions/_shared/middle.ts': 'export {x} from "./leaf.ts";',
               'supabase/functions/_shared/leaf.ts': 'export const x=1;'}
        new = dict(old)
        new['supabase/functions/a/index.ts'] = 'export default {};'
        self.assertEqual(self.select(old,new,['supabase/functions/_shared/leaf.ts']), ['a'])
        self.assertEqual(self.select(old,old,['supabase/functions/b/index.ts']), ['b'])
        self.assertEqual(self.select(old,old,['supabase/config.toml']), ['a','b'])

    def test_deleted_function_is_rejected_before_deploy(self):
        with self.assertRaises(ValueError):
            self.select({'supabase/functions/a/index.ts':''}, {}, ['supabase/functions/a/index.ts'])

    def test_missing_baseline_fails_closed(self):
        with patch.object(release, 'pages', return_value=[]), patch.dict(os.environ, {'BASELINE_SHA':''}):
            with self.assertRaises(ValueError):
                release.previous_release()

    def test_failed_deployment_is_not_a_baseline(self):
        with patch.object(release, 'pages', return_value=[{'id':2,'sha':'bad'}, {'id':1,'sha':'good'}]), patch.object(release, 'api', side_effect=[[{'state':'failure'}], [{'state':'success'}]]):
            self.assertEqual(release.previous_release(), 'good')

    def test_health_requires_exact_401_version_bundle_and_agent_homepage(self):
        info = {'VERSION':'1.2.3', 'BUNDLE_COMMIT':'a'*40}
        def fake_request(url, method='GET'):
            if '/functions/' in url:
                return 401, ''
            if 'agent-mobile' in url and url.endswith('/health'):
                return 200, json.dumps({'ok':True,'version':'1.2.3','bundle':'a'*8})
            if url.endswith('/health'):
                return 200, '{"ok":true}'
            return 200, 'Continue with Google'
        with patch.object(release,'loader_info',return_value=info), patch.object(release,'request',side_effect=fake_request):
            release.health('.',attempts=1)
        def forbidden(url, method='GET'):
            if '/functions/' in url:
                return 403, ''
            return fake_request(url,method)
        with patch.object(release,'loader_info',return_value=info), patch.object(release,'request',side_effect=forbidden):
            with self.assertRaises(RuntimeError):
                release.health('.',attempts=1)

    def test_migration_filename_and_sensitive_sql_rejected(self):
        with self.assertRaises(ValueError):
            migration.migration_file('../escape.sql')
        with tempfile.TemporaryDirectory() as directory:
            old = os.getcwd()
            try:
                os.chdir(directory)
                Path('supabase/migrations').mkdir(parents=True)
                p = Path('supabase/migrations/123_test.sql')
                for sql in ('select * from vault.decrypted_secrets;',
                            'update private.app_settings set value=true;',
                            'DO $$ BEGIN EXECUTE x; END $$;',
                            'ALTER ROLE postgres PASSWORD \'x\';'):
                    p.write_text(sql)
                    with self.assertRaises(ValueError):
                        migration.migration_file(p.name)
                p.write_text('ALTER TABLE public.test ADD COLUMN title text;')
                self.assertEqual(migration.migration_file(p.name)[1], p.read_text())
            finally:
                os.chdir(old)

    def test_prepare_real_git_immutable_bundle_and_bot_commit(self):
        import subprocess
        with tempfile.TemporaryDirectory() as directory:
            old = os.getcwd()
            try:
                os.chdir(directory)
                def g(*args):
                    return subprocess.check_output(['git', *args], text=True, stderr=subprocess.DEVNULL).strip()
                g('init', '-b', 'main')
                g('config','user.name','fixture')
                g('config','user.email','fixture@example.invalid')
                Path('apps/agent-mobile/dist').mkdir(parents=True)
                Path(prepare.LOADER).write_text('const BUNDLE_COMMIT="old";\nconst BUNDLE_SHA256="old";\nconst VERSION="old";\n')
                Path('apps/agent-mobile/package.json').write_text('{"version":"1.2.3"}')
                g('add','.'); g('commit','-m','source')
                source=g('rev-parse','HEAD')
                data=b'exact bundle bytes\n'
                Path(prepare.BUNDLE).write_bytes(data)
                Path('apps/agent-mobile/dist/build-provenance.json').write_text(json.dumps({'source_sha':source,'sha256':hashlib.sha256(data).hexdigest()}))
                g('add','.');g('commit','-m','build')
                bundle_commit=g('rev-parse','HEAD')
                g('update-ref','refs/remotes/origin/main',bundle_commit)
                calls=[]
                def mock_git(*args):
                    calls.append(args)
                    if args[0] in ('fetch','push'): return ''
                    return g(*args)
                with patch.object(prepare,'git',side_effect=mock_git), patch.object(prepare,'api',return_value={'workflow_runs':[{'conclusion':'success'}]}), patch.dict(os.environ,{'GITHUB_OUTPUT':str(Path(directory)/'output'),'GITHUB_STEP_SUMMARY':str(Path(directory)/'summary')}):
                    prepare.main()
                text=Path(prepare.LOADER).read_text()
                self.assertIn(bundle_commit,text)
                self.assertIn(hashlib.sha256(data).hexdigest(),text)
                self.assertEqual(g('show','--format=%an','--no-patch','HEAD'),'github-actions[bot]')
                self.assertEqual(g('diff-tree','--no-commit-id','--name-only','-r','HEAD'),prepare.LOADER)
                self.assertEqual([x for x in calls if x[0]=='push'],[('push','origin','HEAD:main')])
            finally:
                os.chdir(old)

    def test_health_rejects_wrong_version_and_missing_google_html(self):
        expected={'VERSION':'1.2.3','BUNDLE_COMMIT':'a'*40}
        for wrong_version, html in [('old','Continue with Google'),('1.2.3','empty')]:
            def request(url, method='GET'):
                if '/functions/' in url: return 401,''
                if url.endswith('/health'):
                    return 200,json.dumps({'ok':True,'version':wrong_version,'bundle':'a'*8})
                return 200,html
            with patch.object(release,'loader_info',return_value=expected), patch.object(release,'request',side_effect=request):
                with self.assertRaises(RuntimeError): release.health('.',attempts=1)

    def test_migration_preview_cannot_proceed_without_required_reviewer(self):
        with tempfile.TemporaryDirectory() as directory:
            output=str(Path(directory)/'output'); summary=str(Path(directory)/'summary')
            with patch.dict(os.environ,{'MIGRATION_FILE':'123_test.sql','GITHUB_OUTPUT':output,'GITHUB_STEP_SUMMARY':summary}), patch.object(migration,'migration_file',return_value=(Path('123_test.sql'),'SELECT 1;')), patch.object(migration,'api',return_value={'protection_rules':[]}), patch.object(sys,'argv',['migration.py','preview']), patch('builtins.print'):
                with self.assertRaisesRegex(ValueError,'required reviewers'): migration.main()

    def test_migration_apply_uses_one_transaction_and_suppresses_rows(self):
        from unittest.mock import MagicMock
        sql='ALTER TABLE public.test ADD COLUMN title text;'
        response=MagicMock();response.__enter__.return_value.status=201
        with tempfile.TemporaryDirectory() as directory:
            with patch.dict(os.environ,{'MIGRATION_FILE':'123_test.sql','GITHUB_REF':'refs/heads/main','EXPECTED_DIGEST':hashlib.sha256(sql.encode()).hexdigest(),'SUPABASE_ACCESS_TOKEN':'fake','GITHUB_STEP_SUMMARY':str(Path(directory)/'summary')}), patch.object(migration,'migration_file',return_value=(Path('123_test.sql'),sql)), patch.object(sys,'argv',['migration.py','apply']), patch.object(migration.urllib.request,'urlopen',return_value=response) as call:
                migration.main()
                payload=json.loads(call.call_args.args[0].data)
                self.assertEqual(payload['query'],'BEGIN;\n'+sql+'\nCOMMIT;')
                response.read.assert_not_called()

    def test_partial_failure_rolls_back_every_attempted_resource(self):
        # Execute orchestration using fake CLIs/API. Simulates a queued Railway
        # push failing after the Edge update has already reached production.
        with tempfile.TemporaryDirectory() as directory:
            summary = Path(directory)/'summary'
            events=[]
            def git(command,*args):
                if command=='rev-parse': return 'a'*40
                if command=='diff': return 'supabase/functions/agent-ai/index.ts\napps/agent-mobile/railway-loader.ts'
                if command=='ls-tree': return 'supabase/functions/agent-ai/index.ts'
                return ''
            def railway(app,root):
                events.append(('railway',app,str(root)))
                if str(root)=='.': raise RuntimeError('push failed after mutation')
            def edge(name,root): events.append(('edge',name,str(root)))
            with patch.dict(os.environ, {'GITHUB_REF':'refs/heads/main','SUPABASE_ACCESS_TOKEN':'fake','RAILWAY_TOKEN':'fake','GITHUB_STEP_SUMMARY':str(summary),'BASELINE_SHA':''}), patch.object(release,'git',side_effect=git), patch.object(release,'previous_release',return_value='b'*40), patch.object(release,'checkout_tree'), patch.object(release,'preflight'), patch.object(release,'run'), patch.object(release,'api',return_value={'id':1}), patch.object(release,'railway_deploy',side_effect=railway), patch.object(release,'deploy_edge',side_effect=edge), patch.object(release,'health'):
                with self.assertRaisesRegex(RuntimeError,'Rollback verified'):
                    release.main()
            self.assertEqual([e[:2] for e in events], [('edge','agent-ai'),('railway','agent'),('edge','agent-ai'),('railway','agent')])
            self.assertIn('Rollback verified',summary.read_text())

if __name__=='__main__':
    unittest.main()
