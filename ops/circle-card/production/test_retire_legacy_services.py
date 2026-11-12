"""Unit checks for the guarded, stop-only retirement planner. No VPS access."""
from __future__ import annotations

import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch


script = Path(__file__).with_name("retire-legacy-services.py")
spec = importlib.util.spec_from_file_location("circle_card_retire", script)
assert spec is not None and spec.loader is not None
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ConnectionSafetyTests(unittest.TestCase):
    def test_allows_stale_close_wait_after_peer_closed(self):
        sample = (
            "CLOSE-WAIT 0 0 127.0.0.1:3383 127.0.0.1:56240 users:((\"next-server\",pid=1,fd=28))\n"
            "CLOSE-WAIT 0 0 127.0.0.1:3383 127.0.0.1:56278 users:((\"next-server\",pid=1,fd=29))\n"
            "TIME-WAIT 0 0 127.0.0.1:3383 127.0.0.1:56279\n"
        )
        with patch.object(module, "execute", return_value=sample):
            self.assertEqual(module.connections_to({3383}), {"CLOSE-WAIT": 2, "TIME-WAIT": 1})

    def test_aborts_on_established_connection(self):
        sample = "ESTAB 0 0 127.0.0.1:3383 127.0.0.1:56240\n"
        with patch.object(module, "execute", return_value=sample):
            with self.assertRaisesRegex(RuntimeError, "ESTAB"):
                module.connections_to({3383})

    def test_aborts_on_other_in_flight_states(self):
        for state in ("SYN-RECV", "FIN-WAIT-1", "LAST-ACK", "CLOSE"):
            with self.subTest(state=state), patch.object(
                module, "execute", return_value=f"{state} 0 0 127.0.0.1:3383 127.0.0.1:56240\n"
            ):
                with self.assertRaises(RuntimeError):
                    module.connections_to({3383})

    def test_ignores_unrelated_connections(self):
        sample = "ESTAB 0 0 127.0.0.1:3386 127.0.0.1:56000\n"
        with patch.object(module, "execute", return_value=sample):
            self.assertEqual(module.connections_to({3383}), {"CLOSE-WAIT": 0, "TIME-WAIT": 0})


class LiveHealthTests(unittest.TestCase):
    def test_checks_actual_loopback_release_without_disabling_certificate_validation(self):
        calls = []

        def fake_execute(arguments, timeout=30):
            calls.append(arguments)
            return "200"

        with patch.object(module, "execute", side_effect=fake_execute):
            module.verify_http()

        self.assertEqual(len(calls), 2)
        self.assertIn("http://127.0.0.1:3386/login", calls[0])
        self.assertIn("http://127.0.0.1:3386/card/hucknall-circle-hub", calls[1])
        for arguments in calls:
            self.assertIn("Host: circlecard.co.uk", arguments)
            self.assertIn("X-Forwarded-Proto: https", arguments)
            self.assertNotIn("--insecure", arguments)
            self.assertNotIn("-k", arguments)
            self.assertNotIn("--resolve", arguments)

    def test_aborts_when_the_live_app_fails_health_check(self):
        with patch.object(module, "execute", return_value="502"):
            with self.assertRaisesRegex(RuntimeError, "HTTP 502"):
                module.verify_http()


if __name__ == "__main__":
    unittest.main()
