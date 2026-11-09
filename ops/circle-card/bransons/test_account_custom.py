import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('account', Path(__file__).with_name('install-account-custom.py'))
account = importlib.util.module_from_spec(spec)
spec.loader.exec_module(account)

PREVIEW = '''import { LawrenceSevernPreparedCard } from "@/components/circle-card/lawrence-severn/lawrence-severn-prepared-card";
export default async function PreparedPreview() {
  const row = await getOwnedPreparedCard(preparedId);
  const plan = parsePreparedPlan(query.plan);
  const card = buildPreparedCardPreview(row, plan);
  const hasCustom = isLawrenceSevernCard(card);
  const custom = hasCustom && plan === "PRO" && query.presentation === "custom";
  return <div>{custom
      ? <LawrenceSevernPreparedCard card={card} publicUrl={publicUrl} contactDownloadHref={contactDownloadHref} galleryEnabled={plan === "PRO"} />
      : <PublicCircleCardProfile confirmAKillDraftPresentation={true} card={card} />
  }</div>;
}
'''


class AccountCustomTests(unittest.TestCase):
    def test_preview_keeps_ownership_and_other_custom_designs(self):
        after = account.patch_preview(PREVIEW)
        self.assertLess(after.index('await getOwnedPreparedCard'), after.index('const bransonsCustom'))
        self.assertIn('bransonsCustom || isLawrenceSevernCard(card)', after)
        self.assertIn('plan === "PRO" && query.presentation === "custom"', after)
        self.assertIn('row.presetKey === "BRANSONS_CUSTOM_SAMPLE"', after)
        self.assertIn('row.id === "' + account.CARD_ID + '"', after)
        self.assertIn('confirmAKillDraftPresentation={true}', after)
        self.assertIn(': <LawrenceSevernPreparedCard', after)

    def test_shelf_adds_custom_only_for_bransons_and_preserves_pro(self):
        for variable in ['row', 'card']:
            source = '<div><Link href={`/app/prepared/${' + variable + '.id}/preview?plan=free`}>Free</Link><Link className={buttonClass} href={`/app/prepared/${' + variable + '.id}/preview?plan=pro`}>Pro</Link></div>'
            after = account.patch_shelf(source)
            self.assertIn(variable + '.id === "' + account.CARD_ID + '"', after)
            self.assertIn('className={buttonClass}', after)
            self.assertIn('>Free</Link>', after)
            self.assertIn('>Pro</Link>', after)
            self.assertIn('presentation=custom`}>Custom</Link>', after)

    def test_unknown_source_and_rerun_stop_without_overwrite(self):
        with self.assertRaises(RuntimeError):
            account.patch_preview(PREVIEW.replace('getOwnedPreparedCard', 'differentOwnerCheck'))
        with self.assertRaises(RuntimeError):
            account.patch_preview(account.patch_preview(PREVIEW))
        for source in ['<div />', '<Link href="?plan=pro">Pro</Link>']:
            with self.assertRaises(RuntimeError):
                account.patch_shelf(source)

    def test_nginx_rewrite_keeps_public_sample_alias(self):
        config = 'proxy_pass http://127.0.0.1:3377;\nlocation = /samples/bransons.html { alias /var/www/circle-card-samples-bransons/file.html; }\n'
        result = account.rewrite_nginx(config, '/var/www/releases/old', '/var/www/releases/new', 3377, 3378)
        self.assertIn('http://127.0.0.1:3378', result)
        self.assertIn('alias /var/www/circle-card-samples-bransons/file.html;', result)


if __name__ == '__main__':
    unittest.main()
