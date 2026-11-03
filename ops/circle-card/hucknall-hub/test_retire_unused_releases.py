import importlib.util
from pathlib import Path
import unittest
from unittest.mock import MagicMock, patch

spec = importlib.util.spec_from_file_location('retire', Path(__file__).with_name('retire-unused-releases.py'))
retire = importlib.util.module_from_spec(spec)
spec.loader.exec_module(retire)


class RetirementSafety(unittest.TestCase):
    def test_health_checks_app_and_local_tls_with_real_hostname_validation(self):
        app, proxy = MagicMock(), MagicMock()
        app.getresponse.return_value.status = 200
        proxy.getresponse.return_value.status = 200
        with patch.object(retire.http.client, 'HTTPConnection', side_effect=[app, proxy]) as connection, patch.object(retire.socket, 'create_connection') as socket, patch.object(retire.ssl, 'create_default_context') as tls:
            retire.health(3374)
            self.assertEqual(connection.call_args_list[0].args, ('127.0.0.1', 3374))
            socket.assert_called_once_with(('127.0.0.1', 443), timeout=15)
            tls.assert_called_once_with()
            tls.return_value.wrap_socket.assert_called_once_with(socket.return_value, server_hostname='circlecard.co.uk')
            self.assertIs(proxy.sock, tls.return_value.wrap_socket.return_value)
            for client in [app, proxy]:
                client.request.assert_called_once_with('GET', '/login', headers={'Host': 'circlecard.co.uk', 'X-Forwarded-Proto': 'https'})
                client.close.assert_called_once()

    def test_failed_app_health_stops_before_tls(self):
        app = MagicMock()
        app.getresponse.return_value.status = 503
        with patch.object(retire.http.client, 'HTTPConnection', return_value=app), patch.object(retire.socket, 'create_connection') as socket:
            with self.assertRaisesRegex(RuntimeError, 'Live Circle Card.*503'):
                retire.health(3374)
            socket.assert_not_called()
            app.close.assert_called_once()

    def test_failed_nginx_tls_health_is_not_ignored(self):
        app, proxy = MagicMock(), MagicMock()
        app.getresponse.return_value.status = 200
        proxy.getresponse.return_value.status = 403
        with patch.object(retire.http.client, 'HTTPConnection', side_effect=[app, proxy]), patch.object(retire.socket, 'create_connection'), patch.object(retire.ssl, 'create_default_context'):
            with self.assertRaisesRegex(RuntimeError, 'Nginx Circle Card TLS.*403'):
                retire.health(3374)
            proxy.close.assert_called_once()

    def test_invalid_tls_certificate_still_stops_cleanup(self):
        app = MagicMock()
        app.getresponse.return_value.status = 200
        with patch.object(retire.http.client, 'HTTPConnection', return_value=app), patch.object(retire.socket, 'create_connection') as socket, patch.object(retire.ssl, 'create_default_context') as tls:
            tls.return_value.wrap_socket.side_effect = retire.ssl.SSLCertVerificationError('invalid certificate')
            with self.assertRaises(retire.ssl.SSLCertVerificationError):
                retire.health(3374)
            socket.return_value.close.assert_called_once()

    def test_all_nginx_ports_are_protected(self):
        config = '''proxy_pass http://127.0.0.1:3374;
proxy_pass http://127.0.0.1:3000;
proxy_pass http://127.0.0.1:8787;
upstream test { server localhost:3380; }
# proxy_pass http://127.0.0.1:9999;
'''
        self.assertEqual(retire.referenced_ports(config), {3374, 3000, 8787, 3380})

    def test_ambiguous_proxy_target_is_refused(self):
        for target in ['http://$backend', 'http://named_upstream', 'http://unix:/tmp/app.sock']:
            with self.subTest(target=target), self.assertRaises(RuntimeError):
                retire.referenced_ports('proxy_pass ' + target + ';')

    def test_named_livekit_upstream_protects_its_backend_ports(self):
        config = '''upstream livekit_signal {
          zone livekit 64k;
          server 127.0.0.1:7880;
          server [::1]:7881 backup;
          keepalive 32;
        }
        proxy_pass http://127.0.0.1:3374;
        proxy_pass http://127.0.0.1:8787;
        proxy_pass http://livekit_signal;
        proxy_pass http://127.0.0.1:3000;
        '''
        protected = retire.referenced_ports(config)
        self.assertEqual(protected, {3374, 8787, 3000, 7880, 7881})
        self.assertFalse(retire.may_retire('circle-card-release-0539b39-owned.service', {7880}, protected, set()))

    def test_named_upstream_with_an_unknown_backend_is_refused(self):
        for backend in ['unix:/tmp/livekit.sock', '$backend', 'otherhost:7880']:
            with self.subTest(backend=backend), self.assertRaises(RuntimeError):
                retire.referenced_ports('upstream livekit_signal { server ' + backend + '; } proxy_pass http://livekit_signal;')

    def test_empty_or_conflicting_upstream_is_refused(self):
        for blocks in ['upstream livekit_signal { keepalive 32; }',
                       'upstream livekit_signal { server 127.0.0.1:7880; } upstream livekit_signal { server unknown:7881; }']:
            with self.subTest(blocks=blocks), self.assertRaises(RuntimeError):
                retire.referenced_ports(blocks + ' proxy_pass http://livekit_signal;')

    def test_descendant_listeners_are_included(self):
        pids = retire.descendant_pids(20, '20 1\n21 20\n22 21\n30 1')
        self.assertEqual(pids, {20, 21, 22})
        sockets = 'LISTEN 0 511 127.0.0.1:3373 0.0.0.0:* users:(("node",pid=22,fd=9))\nLISTEN 0 511 *:3000 *:* users:(("node",pid=30,fd=9))'
        self.assertEqual(retire.listening_ports(pids, sockets), {3373})

    def test_live_rollback_and_referenced_ports_can_never_be_selected(self):
        live = 'circle-card-hucknall-20261103-000635.service'
        rollback = 'circle-card-lawrence-20261102-231225.service'
        old = 'circle-card-release-0539b39-owned.service'
        keep = {live, rollback}
        for unit, ports in [(live, {3374}), (rollback, {3373}), (old, {3000}), (old, {8787}), (old, {3301, 3000}), (old, set())]:
            with self.subTest(unit=unit, ports=ports):
                self.assertFalse(retire.may_retire(unit, ports, {3000, 8787, 3374}, keep))
        self.assertTrue(retire.may_retire(old, {3301}, {3000, 8787, 3374}, keep))

    def test_other_services_and_non_historical_circle_units_are_excluded(self):
        for unit in ['nginx.service', 'postgresql.service', 'radar.service', 'circle-card-new-worker.service']:
            self.assertFalse(retire.may_retire(unit, {3301}, {3374}, set()))


if __name__ == '__main__':
    unittest.main()
