"""Scoped transformations applied to the identified current release, never old whole files."""
import re

HUB_ID = 'cmvzwzm3y000amkahigz25s8r'


def patch_profile(source):
    if 'HucknallPublicHub' in source:
        return source
    for required in ['const spinToConnectProps =', 'function renderWalletAction(',
                     'function renderConnectionAction(', 'function renderTrustScoreCard(',
                     'CircleCardSpinToConnect', 'CircleCardQrPanel', 'CircleCardShareButton']:
        if required not in source:
            raise RuntimeError('Native public-card capability changed: ' + required)
    marker = '  const businessHeroImageUrl = card.businessLogoUrl || card.profileImageUrl;'
    if source.count(marker) != 1:
        raise RuntimeError('Expected one business renderer entry point.')
    branch = '''  if (card.id === "cmvzwzm3y000amkahigz25s8r" && card.slug === "hucknall-circle-hub" && !card.isDemo) {
    return <HucknallPublicHub
      identity={<CircleCardSpinToConnect {...spinToConnectProps} className="h-24 w-24 shrink-0" showAmbientRing={true}><CircleCardLogoMark className="h-full w-full" /></CircleCardSpinToConnect>}
      actions={<>{renderWalletAction()}<CircleCardShareButton title="Hucknall Circle Hub" publicUrl={publicUrl} cardId={analyticsCardId} label="Share Hucknall" /><a href={`${new URL(publicUrl).pathname}/vcard`} className="inline-flex min-h-11 items-center rounded-full border border-gold/30 px-5 text-sm text-gold">Save contact</a></>}
      connection={renderConnectionAction()}
      feedback={noticeMessage || errorMessage ? <p role="status" className="rounded-xl border border-gold/30 p-4 text-sm">{errorMessage || noticeMessage}</p> : null}
      trust={renderTrustScoreCard()}
      qr={<CircleCardQrPanel publicUrl={publicUrl} slug={card.slug} label="Save Hucknall Circle Hub" />}
    />;
  }

'''
    return 'import { HucknallPublicHub } from "@/components/circle-card/hucknall-public-hub";\n' + source.replace(marker, branch + marker)


def patch_plan_policy(source):
    if 'HUCKNALL_HUB_CARD_ID' in source:
        return source
    marker = 'return [...cards].sort(compareCircleCardsForPlan).slice(0, Math.max(0, limit));'
    if source.count(marker) != 1:
        raise RuntimeError('Card allowance selection changed; review the hub allowance.')
    replacement = '''const ordered = [...cards].sort(compareCircleCardsForPlan);
  const ordinary = ordered.filter(card => card.id !== HUCKNALL_HUB_CARD_ID).slice(0, Math.max(0, limit));
  const allowed = new Set(ordinary.map(card => card.id));
  return ordered.filter(card => card.id === HUCKNALL_HUB_CARD_ID || allowed.has(card.id));'''
    return 'import { HUCKNALL_HUB_CARD_ID } from "@/lib/circle-card/hucknall-content";\n' + source.replace(marker, replacement)


def patch_schema(source):
    match = re.search(r'model CircleCard \{.*?\n\}', source, re.S)
    if not match:
        raise RuntimeError('Native CircleCard schema model was not found.')
    block = match.group()
    for field, length in [('businessPostcode', 10), ('businessCategory', 40)]:
        if not re.search(r'\b' + field + r'\s', block):
            block = block[:-2] + f'\n  {field} String? @db.VarChar({length})\n' + block[-2:]
        elif not re.search(r'\b' + field + rf'\s+String\?\s+@db.VarChar\({length}\)', block):
            raise RuntimeError('Unexpected existing directory field: ' + field)
    if '@@index([businessPostcode' not in block:
        block = block[:-2] + '\n  @@index([businessPostcode, cardType, showInDiscover, isPublished], map: "CircleCard_local_hub_visibility_idx")\n' + block[-2:]
    return source[:match.start()] + block + source[match.end():]


def patch_robots(source):
    if 'hucknallHubRobots' in source:
        return source
    pattern = r'export default (async\s+)?function robots\s*\('
    match = re.search(pattern, source)
    if not match:
        raise RuntimeError('The current robots metadata entry point changed.')
    source = source[:match.start()] + (match.group(1) or '') + 'function existingRobots(' + source[match.end():]
    wrapper = '''
// hucknallHubRobots: preserve existing private exclusions and other runtime rules.
export default async function robots(): Promise<HubMetadataRoute.Robots> {
  const original = await existingRobots();
  const rules = Array.isArray(original.rules) ? original.rules : [original.rules];
  const maps = original.sitemap ? (Array.isArray(original.sitemap) ? original.sitemap : [original.sitemap]) : [];
  return { ...original, rules: rules.map(rule => ({ ...rule, userAgent: rule.userAgent ?? "*",
    allow: [...new Set([...(Array.isArray(rule.allow) ? rule.allow : rule.allow ? [rule.allow] : []),
      "/card/hucknall-circle-hub", "/card/hucknall-circle-hub/about", "/card/hucknall-circle-hub/sitemap.xml"])],
    disallow: [...new Set([...(Array.isArray(rule.disallow) ? rule.disallow : rule.disallow ? [rule.disallow] : []),
      "/card/hucknall-circle-hub/join"])]
  })), sitemap: [...new Set([...maps, "https://circlecard.co.uk/card/hucknall-circle-hub/sitemap.xml"])] };
}
'''
    if not match.group(1):
        wrapper = wrapper.replace('export default async function robots(): Promise<HubMetadataRoute.Robots>', 'export default function robots(): HubMetadataRoute.Robots').replace('await existingRobots()', 'existingRobots()')
    return 'import type { MetadataRoute as HubMetadataRoute } from "next";\n' + source + wrapper
