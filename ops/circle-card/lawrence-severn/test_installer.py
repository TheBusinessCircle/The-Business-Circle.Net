import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch
import tempfile
import json

spec = importlib.util.spec_from_file_location('installer', Path(__file__).with_name('install-account-preview.py'))
installer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(installer)


class DeploymentGuards(unittest.TestCase):
    def test_unit_changes_release_and_port_without_changing_secret_digits(self):
        source = '[Service]\nWorkingDirectory=/old\nExecStart=/usr/bin/node /old/server.js --port 3371\nEnvironment="PORT=3371" "SECRET=example3371value"\n'
        result = installer.rewrite_unit(source, '/old', '/new', '/private/override.env')
        self.assertIn('WorkingDirectory=/new', result)
        self.assertIn('/new/server.js --port 3372', result)
        self.assertIn('"PORT=3372" "SECRET=example3371value"', result)
        self.assertIn('EnvironmentFile=/private/override.env', result)

    def test_custom_stop_is_not_cloned(self):
        with self.assertRaises(RuntimeError):
            installer.rewrite_unit('[Service]\nWorkingDirectory=/old\nExecStop=/bin/kill 123\n', '/old', '/new', '/private/env')

    def test_nginx_changes_only_identified_target(self):
        source = ' proxy_pass http://127.0.0.1:3371;\n alias /old/public/;\n alias /var/www/brand-assets/logo.png;\n'
        result = installer.rewrite_nginx(source, '/old', '/new')
        self.assertIn('proxy_pass http://127.0.0.1:3372;', result)
        self.assertIn('alias /new/public/;', result)
        self.assertIn('alias /var/www/brand-assets/logo.png;', result)

    def test_ambiguous_proxy_is_rejected(self):
        with self.assertRaises(RuntimeError):
            installer.rewrite_nginx('proxy_pass http://127.0.0.1:3371;\nproxy_pass http://127.0.0.1:3371;\n', '/old', '/new')

    def test_payload_excludes_shared_renderer_and_database_code(self):
        self.assertTrue(installer.allowed_payload(installer.CUSTOM + 'lawrence-severn-prepared-card.tsx'))
        self.assertTrue(installer.allowed_payload(installer.ASSETS + 'shopfront.jpg'))
        for filename in ['src/components/circle-card/public-circle-card-profile.tsx', 'prisma/schema.prisma', installer.CUSTOM + 'content.test.ts']:
            self.assertFalse(installer.allowed_payload(filename))

    def test_launcher_preserves_identity_and_billing_checks(self):
        original = '/opt/thebusinesscircle/circle-card-launchers/0539b3999fa8d626805270633d8d393c309dcffb/launch-959.mjs'
        source = (
            "if(process.getuid()===0||process.env.USER!=='circle-card-app'||process.env.LOGNAME!=='circle-card-app'||realpathSync(process.cwd())!==\"" + str(installer.LIVE) + "\")throw Error('Exact Circle runtime identity required');"
            "const values=readEnvironmentJson('/etc/thebusinesscircle/circle-card/runtime.env.json');"
            "validateProtectedStandaloneBilling(values,{applicationSha:'0539b3999fa8d626805270633d8d393c309dcffb'});"
            "process.execve('/usr/bin/node',['/usr/bin/node','" + str(installer.LIVE) + "/node_modules/next/dist/bin/next','start','-p','3371'],{...values,PORT:'3371'});"
        )
        stage = Path('/var/www/releases/circle-card-lawrence-20261102-222341')
        with patch.object(Path, 'read_text', return_value=source):
            _, result, _ = installer.prepare_launcher('ExecStart=/usr/bin/node ' + original, stage)
        self.assertNotIn(str(installer.LIVE), result)
        self.assertIn(str(stage), result)
        self.assertIn("'-p','3372'", result)
        self.assertIn("PORT:'3372'", result)
        self.assertIn("process.getuid()===0||process.env.USER!=='circle-card-app'||process.env.LOGNAME!=='circle-card-app'", result)
        self.assertIn("validateProtectedStandaloneBilling(values,{applicationSha:'0539b3999fa8d626805270633d8d393c309dcffb'});", result)
        self.assertIn("readEnvironmentJson('/etc/thebusinesscircle/circle-card/runtime.env.json')", result)

    def test_unknown_launcher_is_rejected(self):
        with self.assertRaises(RuntimeError):
            installer.prepare_launcher('ExecStart=/usr/bin/node /unknown/launch.mjs', Path('/staged'))

    def test_custom_build_directory_is_resolved_from_manifest(self):
        with tempfile.TemporaryDirectory() as folder:
            stage = Path(folder)
            dist = stage / '.runtime/circle-card'
            page = dist / 'server/app/(member)/app/prepared/[preparedId]/preview/page.js'
            page.parent.mkdir(parents=True)
            page.write_text('compiled preview')
            (dist / 'BUILD_ID').write_text('new-build')
            (dist / 'server/app-paths-manifest.json').write_text(json.dumps({'/(member)/app/prepared/[preparedId]/preview/page': 'app/(member)/app/prepared/[preparedId]/preview/page.js'}))
            self.assertEqual(installer.compiled_preview(stage), dist)

    def test_missing_compiled_preview_is_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            with self.assertRaises(RuntimeError):
                installer.compiled_preview(Path(folder))

    def test_manifest_cannot_point_outside_build(self):
        with tempfile.TemporaryDirectory() as folder:
            stage = Path(folder)
            server = stage / '.runtime/circle-card/server'
            server.mkdir(parents=True)
            (server / 'app-paths-manifest.json').write_text(json.dumps({'/(member)/app/prepared/[preparedId]/preview/page': '../../outside.js'}))
            with self.assertRaises(RuntimeError):
                installer.compiled_preview(stage)

    def test_build_errors_redact_credentials(self):
        self.assertEqual(installer.redact('Failure: private-database-value', {'DATABASE_URL': 'private-database-value'}), 'Failure: [redacted]')


if __name__ == '__main__':
    unittest.main()
