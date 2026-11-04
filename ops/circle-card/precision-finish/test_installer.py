import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('precision_installer', Path(__file__).with_name('install.py'))
installer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(installer)


class InstallerTests(unittest.TestCase):
    def setUp(self):
        installer.OLD_PORT, installer.NEW_PORT = 3375, 3376

    def test_switches_only_circle_card_and_preserves_sibling_asset_routes(self):
        source = 'server {\n    server_name circlecard.co.uk;\n    location / {\n      proxy_pass http://127.0.0.1:3375;\n    }\n    location = /hucknall/photos/market.jpg {\n      alias /var/www/releases/old/public/hucknall/photos/market.jpg;\n    }\n}\n'
        actual = installer.rewrite_nginx(source, '/var/www/releases/old', '/var/www/releases/new')
        self.assertIn('proxy_pass http://127.0.0.1:3376;', actual)
        self.assertIn('alias /var/www/releases/new/public/hucknall/photos/market.jpg;', actual)
        self.assertIn('server_name circlecard.co.uk;', actual)
        self.assertEqual(actual.replace(':3376;', ':3375;').replace('/var/www/releases/new/', '/var/www/releases/old/'), source)
        with self.assertRaises(RuntimeError):
            installer.rewrite_nginx(source + '\nproxy_pass http://127.0.0.1:3375;', '/old', '/new')

    def test_preserves_unit_user_hardening_and_runtime_identity(self):
        source = '[Service]\nUser=circle-card-app\nGroup=circle-card-app\nNoNewPrivileges=true\nWorkingDirectory=/old\nExecStart=/usr/bin/node /old/launch.mjs\nEnvironment=PORT=3375\n'
        actual = installer.rewrite_unit(source, '/old', '/new', '/secure/override.env')
        for line in ['User=circle-card-app', 'Group=circle-card-app', 'NoNewPrivileges=true']:
            self.assertIn(line, actual)
        self.assertIn('WorkingDirectory=/new', actual)
        self.assertIn('Environment=PORT=3376', actual)
        self.assertIn('EnvironmentFile=/secure/override.env', actual)
        with self.assertRaises(RuntimeError):
            installer.rewrite_unit(source + 'ExecStop=/custom-stop\n', '/old', '/new', '/override')


if __name__ == '__main__':
    unittest.main()
