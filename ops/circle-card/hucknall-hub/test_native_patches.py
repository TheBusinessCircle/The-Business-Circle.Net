import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('native_patches', Path(__file__).with_name('native-patches.py'))
patches = importlib.util.module_from_spec(spec)
spec.loader.exec_module(patches)


class NativeHubPatches(unittest.TestCase):
    def test_membership_covers_every_presentation_through_the_canonical_route(self):
        original = '''const card = await getPublicCircleCard(slug);
      {card.localHubPath ? <div>old badge</div> : null}
      <PublicCircleCardProfile
        card={card}
        savedContact={savedContact}
      />'''
        result = patches.patch_public_card_route(original)
        self.assertNotIn('old badge', result)
        self.assertIn('<LocalHubMembership cardId={card.id} isDemo={card.isDemo} />', result)
        self.assertIn('savedContact={savedContact}', result)
        self.assertIn('await getHucknallHubBusinesses()', result)
        self.assertIn('localHubBusinesses={card.id ===', result)
        self.assertEqual(result.count('<PublicCircleCardProfile'), 1)
        self.assertEqual(patches.patch_public_card_route(result), result)

    def test_membership_refuses_an_unknown_route(self):
        with self.assertRaises(RuntimeError):
            patches.patch_public_card_route('return <DifferentCard />;')

    def test_schema_is_additive_and_idempotent(self):
        original = 'model User {\n id String @id\n}\nmodel CircleCard {\n id String @id\n businessName String?\n}'
        updated = patches.patch_schema(original)
        self.assertIn('model User {\n id String @id\n}', updated)
        self.assertEqual(updated.count('businessPostcode String?'), 1)
        self.assertIn('CircleCard_local_hub_visibility_idx', updated)
        self.assertEqual(patches.patch_schema(updated), updated)

    def test_schema_refuses_unknown_existing_column_type(self):
        with self.assertRaises(RuntimeError):
            patches.patch_schema('model CircleCard {\n businessPostcode Int\n}')

    def test_native_profile_reuses_wallet_connection_spin_and_qr(self):
        fixture = '''type PublicCircleCardProfileProps = {};
export function PublicCircleCardProfile({
}: PublicCircleCardProfileProps) {
const spinToConnectProps = {};
function renderWalletAction() {} function renderConnectionAction() {} function renderTrustScoreCard() {}
// CircleCardSpinToConnect CircleCardQrPanel CircleCardShareButton
  const businessHeroImageUrl = card.businessLogoUrl || card.profileImageUrl;
return <Existing />; }'''
        result = patches.patch_profile(fixture)
        for token in ['renderWalletAction()', 'renderConnectionAction()', 'renderTrustScoreCard()', '{...spinToConnectProps}', 'CircleCardQrPanel', '!card.isDemo', 'card.id === "cmvzwzm3y000amkahigz25s8r"']:
            self.assertIn(token, result)
        self.assertIn('return <Existing />;', result)
        self.assertIn('businesses={localHubBusinesses}', result)
        self.assertNotIn('@/server/', result)
        self.assertEqual(patches.patch_profile(result), result)

    def test_unknown_native_profile_shape_is_refused(self):
        with self.assertRaises(RuntimeError):
            patches.patch_profile('return <Unknown />;')

    def test_robots_preserves_existing_private_rules(self):
        original = 'export default function robots() { return { rules: { userAgent: "*", disallow: ["/app", "/api"] } }; }'
        result = patches.patch_robots(original)
        self.assertIn('disallow: ["/app", "/api"]', result)
        self.assertIn('const original = existingRobots()', result)
        self.assertIn('/card/hucknall-circle-hub/join', result)
        self.assertIn('/card/hucknall-circle-hub/sitemap.xml', result)
        self.assertEqual(patches.patch_robots(result), result)

    def test_allowance_patch_is_limited_to_a_single_immutable_identity(self):
        original = 'return [...cards].sort(compareCircleCardsForPlan).slice(0, Math.max(0, limit));'
        result = patches.patch_plan_policy(original)
        self.assertIn('card.id === HUCKNALL_HUB_CARD_ID', result)
        self.assertIn('slice(0, Math.max(0, limit))', result)
        self.assertNotIn('limit +', result)


if __name__ == '__main__':
    unittest.main()
