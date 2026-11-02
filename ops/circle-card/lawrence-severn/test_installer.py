import importlib.util
from pathlib import Path
import unittest

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

    def test_build_errors_redact_credentials(self):
        self.assertEqual(installer.redact('Failure: private-database-value', {'DATABASE_URL': 'private-database-value'}), 'Failure: [redacted]')


if __name__ == '__main__':
    unittest.main()
