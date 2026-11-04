import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('confirm_patches', Path(__file__).with_name('patches.py'))
patches = importlib.util.module_from_spec(spec)
spec.loader.exec_module(patches)


class ConfirmDraftPatchTests(unittest.TestCase):
    def setUp(self):
        self.source = patches.PROPS + '};\n' + patches.FUNCTION + '}) {\n' + '\n'.join(['const spinToConnectProps = {};',
            'function renderWalletAction() {}', 'function renderConnectionAction() {}',
            'function renderTrustScoreCard() {}',
            '// CircleCardFramedImage CircleCardQrPanel CircleCardShareButton',
            'if (isHucknall) return <HucknallPublicHub />;', 'if (isPrecisionBusiness(card)) return <PrecisionBusinessCard />;', patches.MARKER, 'return <ExistingBusiness />;'])

    def test_preserves_existing_renderers_and_native_behaviour(self):
        actual = patches.patch_profile(self.source)
        self.assertEqual(actual.replace(patches.IMPORT, '', 1).replace(patches.BRANCH, '', 1).replace(patches.PROPERTY, '', 1).replace(patches.PARAMETER, '', 1), self.source)
        for token in ['renderWalletAction()', 'renderConnectionAction()', '...spinToConnectProps', 'CircleCardQrPanel']:
            self.assertIn(token, patches.BRANCH)
        self.assertEqual(patches.patch_profile(actual), actual)

    def test_upgrades_the_exact_previous_draft_selector(self):
        previous = patches.IMPORT + self.source.replace(patches.MARKER, patches.LEGACY_BRANCH + patches.MARKER)
        actual = patches.patch_profile(previous)
        self.assertIn(patches.BRANCH, actual)
        self.assertIn(patches.PROPERTY, actual)
        self.assertIn('return <PrecisionBusinessCard', actual)

    def test_uses_owned_row_and_selected_plan_without_changing_preview_authorization(self):
        source = 'const row = await getOwnedPreparedCard(preparedId);\nconst plan = parsePreparedPlan(query.plan);\nconst card = buildPreparedCardPreview(row, plan);\nreturn custom ? <ExistingCustomCard /> : <PublicCircleCardProfile card={card} />;'
        actual = patches.patch_preview_page(source)
        self.assertEqual(actual.replace(patches.PREVIEW_PROP, '', 1), source)
        self.assertIn('row.id === "cmw2jnnc6005xzfahkcfm7q39"', actual)
        self.assertIn('plan === "PRO"', actual)
        self.assertEqual(patches.patch_preview_page(actual), actual)
        with self.assertRaises(RuntimeError):
            patches.patch_preview_page(source.replace('getOwnedPreparedCard', 'getPublicPreparedCard'))

    def test_refuses_ambiguous_or_changed_live_source(self):
        for source in [self.source.replace(patches.MARKER, ''), self.source + '\n' + patches.MARKER,
                       self.source.replace('function renderWalletAction(', 'function anotherAction('),
                       self.source + '\nreturn <ConfirmAKillDraftCard />;']:
            with self.subTest(source=source):
                with self.assertRaises(RuntimeError):
                    patches.patch_profile(source)


if __name__ == '__main__':
    unittest.main()
