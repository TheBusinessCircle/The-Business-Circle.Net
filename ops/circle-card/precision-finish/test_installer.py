import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch
import tempfile
import symtable
import builtins

spec = importlib.util.spec_from_file_location('precision_installer', Path(__file__).with_name('install.py'))
installer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(installer)


class InstallerTests(unittest.TestCase):
    def setUp(self):
        installer.OLD_PORT, installer.NEW_PORT = 3375, 3376

    def test_startup_reads_current_service_and_stops_before_any_write_on_wrong_user(self):
        with tempfile.TemporaryDirectory() as folder:
            config = Path(folder) / 'circlecard.conf'
            config.write_text('proxy_pass http://127.0.0.1:3375;')
            values = {'MainPID': '123\n', 'User': 'root\n'}
            def systemctl(args, **kwargs):
                self.assertEqual(args[:3], ['systemctl', 'show', 'circle-card-current.service'])
                return values[args[-1]]
            with patch.object(installer, 'NGINX', config), \
                 patch.object(installer.sys, 'argv', ['install.py', '--ref', 'a' * 40]), \
                 patch.object(installer.os, 'geteuid', return_value=0), \
                 patch.object(installer, 'discover_live', return_value=(Path(folder), 'circle-card-current.service', 3375, 3376)), \
                 patch.object(installer.subprocess, 'check_output', side_effect=systemctl) as read, \
                 patch.object(installer.subprocess, 'run') as mutate:
                with self.assertRaisesRegex(RuntimeError, 'runtime user changed'):
                    installer.main()
                self.assertEqual(read.call_count, 2)
                mutate.assert_not_called()
                self.assertEqual(config.read_text(), 'proxy_pass http://127.0.0.1:3375;')

    def test_every_referenced_global_helper_is_defined(self):
        table = symtable.symtable(Path(installer.__file__).read_text(), installer.__file__, 'exec')
        defined = set(table.get_identifiers()) | set(dir(builtins)) | {'__name__', '__file__'}
        def inspect(scope):
            for symbol in scope.get_symbols():
                if symbol.is_referenced() and symbol.is_global():
                    self.assertIn(symbol.get_name(), defined, 'Undefined installer helper: ' + symbol.get_name())
            for child in scope.get_children():
                inspect(child)
        for scope in table.get_children():
            inspect(scope)

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
