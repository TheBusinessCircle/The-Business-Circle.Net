from pathlib import Path
import re

SHELL = 'src/components/circle-card/circle-experience-shell.tsx'
PRO = 'src/app/(public)/circle-card/pro/page.tsx'
PUBLIC = 'src/server/circle-card/public-card.service.ts'
WEBHOOK = 'src/app/api/stripe/webhook/route.ts'
POLICY = 'src/lib/circle-card/runtime-route-policy.ts'
SCHEMA = 'prisma/schema.prisma'
OWNER = 'src/app/(member)/app/owner/page.tsx'
PATHS = (SHELL, PRO, PUBLIC, WEBHOOK, POLICY, SCHEMA, OWNER)

def once(source, old, new):
    if source.count(old) != 1:
        raise RuntimeError('Expected one upgrade source anchor: ' + old[:100])
    return source.replace(old, new, 1)

def patch_shell(source):
    if '>Upgrades<' in source:
        raise RuntimeError('Upgrades menu is already installed.')
    pattern = r'(<Link\b[^>]*href=["\'])/pro(["\'][^>]*>)Your plan'
    if len(re.findall(pattern, source)) != 1:
        raise RuntimeError('Could not identify the existing plan menu link.')
    return re.sub(pattern, r'\1/pro?returnTo=%2Fapp%2Fupgrades%2Fcustom-build\2Upgrades', source)

def patch_pro(source):
    if '<CustomBuildOffer' in source:
        raise RuntimeError('Custom design offer is already installed.')
    source = 'import { CustomBuildOffer } from "@/components/circle-card/custom-build-offer";\n' + source
    source = once(source, '      {feedback ? (', '      <CustomBuildOffer />\n\n      {feedback ? (')
    return once(source, '      <section className="relative overflow-hidden', '      <section id="pro-checkout" className="relative overflow-hidden')

def patch_public(source):
    if 'customPresentationEnabled' in source:
        raise RuntimeError('Custom presentation gate is already installed.')
    if 'circleCardAccess.capabilities.circleStudio' not in source:
        raise RuntimeError('Existing Studio public entitlement gate changed.')
    source = source.replace('circleCardAccess.capabilities.circleStudio', 'customPresentationEnabled')
    source = once(source, '  const customLinks = (await Promise.all(', '''  const customPresentationEnabled = circleCardAccess.capabilities.circleStudio &&
    canShowPurchasedCustomDesign(
      await loadCustomBuildOrderForCard(card.userId, card.id), circleCardAccess
    );

  const customLinks = (await Promise.all(''')
    return '''import { canShowPurchasedCustomDesign } from "@/lib/circle-card/custom-build";
import { loadCustomBuildOrderForCard } from "@/server/circle-card/custom-build.service";
''' + source

def patch_webhook(source):
    if 'processCustomBuildStripeEvent' in source:
        raise RuntimeError('Custom design webhook handling is already installed.')
    pattern = r'(?m)^  try \{\n(?=    (?:if \(getRuntimeBrand|const handledByCircleCard))'
    if len(re.findall(pattern, source)) != 1:
        raise RuntimeError('Could not identify the verified Stripe processing boundary.')
    source = re.sub(pattern, '  try {\n    if (await processCustomBuildStripeEvent(event)) return new Response("ok", { status: 200 });\n', source)
    return 'import { processCustomBuildStripeEvent } from "@/server/circle-card/custom-build.service";\n' + source

def patch_policy(source):
    return once(source, '  "/api/stripe/circle-card/portal",', '  "/api/stripe/circle-card/portal",\n  "/api/stripe/circle-card/custom-build/checkout",')

def patch_schema(source):
    if 'model CircleCardCustomBuildOrder {' in source:
        raise RuntimeError('Custom design schema is already installed.')
    for model in ['User', 'CircleCard']:
        pattern = r'(?ms)^model ' + model + r' \{.*?^\}'
        matches = list(re.finditer(pattern, source))
        if len(matches) != 1:
            raise RuntimeError('Could not identify schema model ' + model)
        match = matches[0]
        block = match[0][:-1] + '  customBuildOrders CircleCardCustomBuildOrder[]\n}'
        source = source[:match.start()] + block + source[match.end():]
    return source + '''
model CircleCardCustomBuildOrder {
  id String @id @default(uuid())
  userId String
  cardId String
  customerId String
  amountPence Int @default(4999)
  currency String @default("gbp")
  checkoutSessionId String? @unique
  checkoutAttempt Int @default(0)
  paymentIntentId String? @unique
  paymentStatus String @default("PENDING")
  buildStatus String @default("AWAITING_PAYMENT")
  brief String
  termsVersion String
  termsAcceptedAt DateTime @default(now()) @db.Timestamp(3)
  paidAt DateTime? @db.Timestamp(3)
  createdAt DateTime @default(now()) @db.Timestamp(3)
  updatedAt DateTime @default(now()) @updatedAt @db.Timestamp(3)
  user User @relation(fields: [userId], references: [id], onDelete: Restrict)
  card CircleCard @relation(fields: [cardId], references: [id], onDelete: Restrict)
  @@unique([userId, cardId])
  @@index([paymentStatus, buildStatus, createdAt], map: "CircleCardCustomBuildOrder_queue_idx")
}
'''

def patch_owner(source):
    return once(source, 'Business demonstration</Link>', 'Business demonstration</Link><Link className={ownerButton} href="/app/owner/custom-builds">Custom design orders</Link>')

def patch_sources(sources):
    transforms = {SHELL: patch_shell, PRO: patch_pro, PUBLIC: patch_public, WEBHOOK: patch_webhook,
        POLICY: patch_policy, SCHEMA: patch_schema, OWNER: patch_owner}
    return {path: transforms[path](sources[path]) for path in PATHS}

def patch_directory(root):
    root = Path(root).resolve()
    sources = {}
    for relative in PATHS:
        path = root / relative
        if path.is_symlink() or not path.resolve().is_relative_to(root):
            raise RuntimeError('Upgrade source escapes the candidate release.')
        sources[relative] = path.read_text(encoding='utf-8')
    result = patch_sources(sources)
    for relative, content in result.items():
        (root / relative).write_text(content, encoding='utf-8')
    return result

if __name__ == '__main__':
    import sys
    patch_directory(sys.argv[1])
