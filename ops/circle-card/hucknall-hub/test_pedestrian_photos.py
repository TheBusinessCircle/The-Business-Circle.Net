"""Check exact image routing during the isolated release switch."""
import ast
from pathlib import Path
import unittest

source = Path(__file__).with_name('install-native-hub.py').read_text(encoding='utf-8')
namespace = {'re': __import__('re'), 'Path': Path, 'OLD_PORT': 3376, 'NEW_PORT': 3377}
names = {'pedestrian_photo_routes', 'rewrite_nginx'}
exec(compile(ast.Module(body=[node for node in ast.parse(source).body if isinstance(node, ast.FunctionDef) and node.name in names], type_ignores=[]), '<photo-routing>', 'exec'), namespace)
rewrite = namespace['rewrite_nginx']
old = '/var/www/releases/circle-card-hucknall-20261103-121602'
new = '/var/www/releases/circle-card-hucknall-20261103-140000'
host = 'server {\n    # Hucknall public town photographs\n    location / {\n        proxy_pass http://127.0.0.1:3376;\n    }\n}\n'
sibling = 'server {\n    server_name other.example;\n    location / { proxy_pass http://127.0.0.1:3000; }\n}\n'

class PedestrianPhotos(unittest.TestCase):
    def test_switch_adds_both_routes_and_preserves_sibling(self):
        result = rewrite(host + sibling, old, new)
        self.assertTrue(result.endswith(sibling))
        self.assertIn('proxy_pass http://127.0.0.1:3377;', result)
        for name in ['hucknall-market.jpg', 'pedestrian-high-street.jpg']:
            self.assertIn('location = /hucknall/photos/' + name + ' {', result)
            self.assertIn('alias ' + new + '/public/hucknall/photos/' + name + ';', result)

    def test_existing_routes_follow_next_release_without_duplicates(self):
        first = rewrite(host, old, new)
        second = namespace['pedestrian_photo_routes'](first.replace(new, new + '-next'), new + '-next')
        self.assertEqual(second.count('location = /hucknall/photos/hucknall-market.jpg {'), 1)

    def test_missing_or_duplicate_verified_block_stops(self):
        for text in [host.replace('# Hucknall public town photographs', ''), host.replace('# Hucknall public town photographs', '# Hucknall public town photographs\n# Hucknall public town photographs')]:
            with self.assertRaises(RuntimeError):
                rewrite(text, old, new)

    def test_conflicting_existing_route_stops(self):
        with self.assertRaises(RuntimeError):
            rewrite(host.replace('location / {', 'location = /hucknall/photos/hucknall-market.jpg {'), old, new)

if __name__ == '__main__':
    unittest.main()
