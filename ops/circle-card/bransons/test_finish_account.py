import importlib.util
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('finish',Path(__file__).with_name('finish-account-custom.py'))
finish = importlib.util.module_from_spec(spec)
spec.loader.exec_module(finish)


class FinishTests(unittest.TestCase):
    def test_origin_probe_retains_certificate_and_hostname_verification(self):
        with patch.object(finish.subprocess,'run',return_value=subprocess.CompletedProcess([],0,b'Circle Card',b'')) as run:
            finish.origin_probe('/login',Path('/checked/cert.pem'),b'Circle Card')
        command = run.call_args.args[0]
        self.assertIn('--cacert',command)
        self.assertIn('/checked/cert.pem',command)
        self.assertIn('circlecard.co.uk:443:127.0.0.1',command)
        self.assertNotIn('--insecure',command)
        self.assertNotIn('-k',command)

    def test_failed_probe_and_wrong_page_stop(self):
        for result in [subprocess.CompletedProcess([],60,b'',b'certificate failed'),subprocess.CompletedProcess([],0,b'Unexpected page',b'')]:
            with patch.object(finish.subprocess,'run',return_value=result):
                with self.assertRaises(RuntimeError):
                    finish.origin_probe('/login',Path('/checked/cert.pem'),b'Circle Card')

    def test_only_the_configured_public_certificate_is_loaded(self):
        with tempfile.TemporaryDirectory() as folder:
            cert = Path(folder)/'origin.pem'
            cert.write_bytes(b'-----BEGIN CERTIFICATE-----\nexample\n-----END CERTIFICATE-----')
            self.assertIn(b'BEGIN CERTIFICATE',finish.certificate_bundle(f'ssl_certificate {cert};\n'))
            cert.write_bytes(b'-----BEGIN PRIVATE KEY-----')
            with self.assertRaises(RuntimeError):
                finish.certificate_bundle(f'ssl_certificate {cert};\n')
        with self.assertRaises(RuntimeError):
            finish.certificate_bundle('server {}')


if __name__ == '__main__':
    unittest.main()
