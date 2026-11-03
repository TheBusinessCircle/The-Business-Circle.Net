import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('photos', Path(__file__).with_name('repair-photo-routes.py'))
photos = importlib.util.module_from_spec(spec)
spec.loader.exec_module(photos)


class PhotoRoutes(unittest.TestCase):
    def test_only_the_current_server_gets_four_exact_public_photo_routes(self):
        other = 'server {\n listen 443;\n location / { proxy_pass http://127.0.0.1:3000; }\n}\n'
        current = 'server {\n listen 443 ssl;\n server_name circlecard.co.uk;\n location / { proxy_pass http://127.0.0.1:3376; }\n}\n'
        result = photos.patch_config(other + current, 3376)
        self.assertTrue(result.startswith(other))
        self.assertEqual(result.count('location = /hucknall/photos/'), 4)
        self.assertIn('proxy_pass http://127.0.0.1:3376;', result)
        for name in photos.FILES:
            self.assertIn('alias /var/www/circle-card-hucknall-photos/' + name + ';', result)
        self.assertNotIn('location /hucknall', result)

    def test_quoted_braces_comments_and_escapes_do_not_break_server_boundaries(self):
        source = 'server {\n # } ignored\n set $value "{brace} and \\"quote";\n location / { proxy_pass http://127.0.0.1:3376; }\n}\n'
        result = photos.patch_config(source, 3376)
        self.assertTrue(result.endswith('}\n'))
        self.assertEqual(result.count(photos.MARKER), 1)

    def test_duplicate_or_unknown_targets_are_refused(self):
        current = 'server {\n location / { proxy_pass http://127.0.0.1:3376; }\n}\n'
        for source in [current + current, 'server { listen 80; }', photos.patch_config(current, 3376)]:
            with self.subTest(source=source), self.assertRaises(RuntimeError):
                photos.patch_config(source, 3376)

    def test_an_existing_photo_route_is_not_overwritten(self):
        source = 'server {\n location = /hucknall/photos/st-mary.jpg { return 404; }\n location / { proxy_pass http://127.0.0.1:3376; }\n}\n'
        with self.assertRaises(RuntimeError):
            photos.patch_config(source, 3376)


if __name__ == '__main__':
    unittest.main()
