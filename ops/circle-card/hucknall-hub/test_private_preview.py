"""Portable contract checks; these do not contact or change the server."""
import ast
from pathlib import Path
import re
import unittest

SOURCE = Path(__file__).with_name('install-private-preview.py').read_text(encoding='utf-8')
PARSED = ast.parse(SOURCE)
FUNCTIONS = {'allowed_payload', 'build_heap_mib', 'patch_prepared_preview', 'rewrite_nginx', 'rewrite_unit'}
NS = {
    're': re, 'Path': Path, 'OLD_PORT': 3373, 'NEW_PORT': 3374,
    'DRAFT_ID': 'cmvzwzm3y000amkahigz25s8r',
    'DRAFT_SLUG': 'hucknall-circle-hub-40f0517a277b',
    'PAYLOAD_FILES': {'src/components/circle-card/hucknall-circle-hub.tsx',
                      'src/components/circle-card/hucknall-hub-draft-preview.tsx',
                      'src/lib/circle-card/local-hubs.ts'}
}
exec(compile(ast.Module(body=[node for node in PARSED.body if isinstance(node, ast.FunctionDef) and node.name in FUNCTIONS], type_ignores=[]), '<installer-pure-functions>', 'exec'), NS)


class PrivatePreviewContract(unittest.TestCase):
    def test_reported_server_memory_selects_smaller_heap(self):
        self.assertEqual(NS['build_heap_mib'](3866 * 1024), 2560)

    def test_original_budget_is_preserved_when_memory_allows(self):
        self.assertEqual(NS['build_heap_mib'](4096 * 1024), 3072)

    def test_smaller_budget_still_reserves_headroom(self):
        self.assertEqual(NS['build_heap_mib'](3584 * 1024), 2560)
        with self.assertRaisesRegex(RuntimeError, 'Live site unchanged'):
            NS['build_heap_mib'](3583 * 1024)

    def test_owner_lookup_precedes_special_render(self):
        original = 'export default async function Page() {\n  const row = await getOwnedPreparedCard(preparedId);\n  const card = buildPreparedCardPreview(row, plan);\n  return <Existing card={card} />;\n}'
        patched = NS['patch_prepared_preview'](original)
        self.assertLess(patched.index('await getOwnedPreparedCard'), patched.index('if (row.id'))
        self.assertIn("row.id === 'cmvzwzm3y000amkahigz25s8r' && row.slug === 'hucknall-circle-hub-40f0517a277b'", patched)
        self.assertIn('const card = buildPreparedCardPreview(row, plan);', patched)
        self.assertIn('return <Existing card={card} />;', patched)
        self.assertNotIn('\\n', patched)

    def test_second_install_is_refused(self):
        with self.assertRaises(RuntimeError):
            NS['patch_prepared_preview']('const row = await getOwnedPreparedCard(preparedId); // HucknallHubDraftPreview')

    def test_changed_auth_lookup_is_refused(self):
        with self.assertRaises(RuntimeError):
            NS['patch_prepared_preview']('const row = await getPreparedCard(preparedId);')

    def test_only_three_preview_files_are_allowed(self):
        for path in NS['PAYLOAD_FILES']:
            self.assertTrue(NS['allowed_payload'](path))
        for path in ['prisma/schema.prisma', 'src/actions/circle-card.actions.ts',
                     'src/app/(public)/card/hucknall-circle-hub/page.tsx',
                     'src/components/circle-card/public-circle-card-profile.tsx',
                     '../../etc/passwd', 'package.json']:
            self.assertFalse(NS['allowed_payload'](path))

    def test_proxy_rewrite_preserves_unrelated_content(self):
        old = 'server {\n  # current\n  proxy_pass http://127.0.0.1:3373;\n}\n'
        updated = NS['rewrite_nginx'](old, '/var/www/releases/old', '/var/www/releases/new')
        self.assertEqual(updated, old.replace(':3373;', ':3374;'))

    def test_ambiguous_proxy_is_refused(self):
        with self.assertRaises(RuntimeError):
            NS['rewrite_nginx']('proxy_pass http://127.0.0.1:3373;\nproxy_pass http://127.0.0.1:3373;', '/old', '/new')

    def test_service_keeps_runtime_identity(self):
        old = '[Service]\nUser=circle-card-app\nWorkingDirectory=/var/www/releases/old\nExecStart=/usr/bin/node /launch.mjs -p 3373\nEnvironment=PORT=3373\n'
        updated = NS['rewrite_unit'](old, '/var/www/releases/old', '/var/www/releases/new', '/private/override.env')
        self.assertIn('User=circle-card-app', updated)
        self.assertIn('WorkingDirectory=/var/www/releases/new', updated)
        self.assertIn('PORT=3374', updated)

    def test_custom_stop_handling_is_refused(self):
        with self.assertRaises(RuntimeError):
            NS['rewrite_unit']('[Service]\nWorkingDirectory=/old\nExecStop=/custom-stop\n', '/old', '/new', '/override')

    def test_deployment_keeps_protected_launcher_checks(self):
        self.assertIn('validateProtectedStandaloneBilling', SOURCE)
        self.assertIn('original_config.read_text() != original_text', SOURCE)
        self.assertIn("health('/prepared/' + DRAFT_SLUG, {404})", SOURCE)
        self.assertNotIn('ALTER TABLE', SOURCE)
        self.assertNotIn('INSERT INTO', SOURCE)


if __name__ == '__main__':
    unittest.main()
