import importlib.util
import io
from contextlib import redirect_stdout
from pathlib import Path
import subprocess
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('bransons_installer', Path(__file__).with_name('install-sample.py'))
installer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(installer)


class InstallationTests(unittest.TestCase):
    config = '''server {
    listen 443 ssl;
    location = /samples/strelley-hall.html {
        alias /var/www/circle-card-samples-669c/strelley-hall.html;
    }
    location / { proxy_pass http://127.0.0.1:3377; }
}
'''

    def test_existing_sample_and_app_routes_preserved_and_rerun_idempotent(self):
        result = installer.patch_nginx(self.config)
        self.assertIn('alias /var/www/circle-card-samples-669c/strelley-hall.html;', result)
        self.assertIn('location / { proxy_pass http://127.0.0.1:3377; }', result)
        self.assertEqual(result, installer.patch_nginx(result))
        self.assertEqual(result.count('location = /samples/bransons.html'), 1)

    def test_unrecognised_and_duplicate_routes_stop(self):
        for config in ['', self.config + self.config, self.config + '\nlocation = /samples/bransons.html {}']:
            with self.assertRaises(RuntimeError):
                installer.patch_nginx(config)

    def test_altered_existing_install_stops(self):
        config = installer.patch_nginx(self.config).replace('/bransons.html;', '/other.html;')
        with self.assertRaises(RuntimeError):
            installer.patch_nginx(config)

    def test_route_check_uses_bytes_and_checks_content(self):
        with patch.object(installer.subprocess, 'run', return_value=subprocess.CompletedProcess([], 0, b'checked')) as mocked:
            installer.check_route('/samples/bransons.html', b'checked')
            self.assertFalse(mocked.call_args.kwargs['text'])
            command = mocked.call_args.args[0]
            self.assertNotIn('--resolve', command)
            self.assertNotIn('--insecure', command)
            self.assertNotIn('-k', command)
            self.assertTrue(command[-1].startswith('https://circlecard.co.uk/samples/bransons.html?bransons_check='))
        with patch.object(installer.subprocess, 'run', return_value=subprocess.CompletedProcess([], 0, b'wrong')):
            with self.assertRaises(RuntimeError):
                installer.check_route('/samples/bransons.html', b'checked')

    def test_binary_curl_error_reports_without_traceback(self):
        output = io.StringIO()
        with redirect_stdout(output):
            installer.report_command_failure(subprocess.CalledProcessError(60, ['curl'], stderr=b'curl: certificate verification failed'))
        self.assertIn('command exit 60', output.getvalue())
        self.assertIn('certificate verification failed', output.getvalue())


if __name__ == '__main__':
    unittest.main()
