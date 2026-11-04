import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('precision_patches', Path(__file__).with_name('patches.py'))
patches = importlib.util.module_from_spec(spec)
spec.loader.exec_module(patches)


class PrecisionPatchTests(unittest.TestCase):
    def setUp(self):
        self.source = '\n'.join(['const spinToConnectProps = {};',
            'function renderWalletAction() {}', 'function renderConnectionAction() {}',
            'function renderTrustScoreCard() {}',
            '// CircleCardFramedImage CircleCardQrPanel CircleCardShareButton',
            'if (isHucknall) return <HucknallPublicHub />;', patches.MARKER, 'return <ExistingBusiness />;'])

    def test_preserves_existing_renderers_and_native_behaviour(self):
        actual = patches.patch_profile(self.source)
        self.assertEqual(actual.replace(patches.IMPORT, '', 1).replace(patches.BRANCH, '', 1), self.source)
        for token in ['renderWalletAction()', 'renderConnectionAction()', '...spinToConnectProps', 'CircleCardQrPanel']:
            self.assertIn(token, patches.BRANCH)
        self.assertEqual(patches.patch_profile(actual), actual)

    def test_refuses_ambiguous_or_changed_live_source(self):
        for source in [self.source.replace(patches.MARKER, ''), self.source + '\n' + patches.MARKER,
                       self.source.replace('function renderWalletAction(', 'function anotherAction('),
                       self.source + '\nreturn <PrecisionBusinessCard />;']:
            with self.subTest(source=source):
                with self.assertRaises(RuntimeError):
                    patches.patch_profile(source)


if __name__ == '__main__':
    unittest.main()
