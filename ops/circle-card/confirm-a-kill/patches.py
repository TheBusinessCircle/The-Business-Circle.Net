"""Apply the Confirm A Kill private draft presentation to the current release using checked anchors."""
import re

IMPORT = 'import { ConfirmAKillDraftCard, isConfirmAKillDraft } from "@/components/circle-card/confirm-a-kill/confirm-draft-card";\n'
MARKER = '  const businessHeroImageUrl = card.businessLogoUrl || card.profileImageUrl;'
BRANCH = '''  if (isConfirmAKillDraft(card, publicUrl, confirmAKillDraftPresentation)) {
    return <ConfirmAKillDraftCard
      card={card}
      analyticsCardId={analyticsCardId}
      contactDownloadHref={`${new URL(publicUrl).pathname}/vcard`}
      identity={<CircleCardSpinToConnect {...spinToConnectProps} className="h-24 w-24 shrink-0" showAmbientRing={true}><CircleCardFramedImage src={card.businessLogoUrl || card.profileImageUrl} alt={`${card.fullName} logo`} positionX={card.businessLogoPositionX} positionY={card.businessLogoPositionY} scale={card.businessLogoScale} className="h-full w-full rounded-full" /></CircleCardSpinToConnect>}
      actions={<>{renderWalletAction()}<CircleCardShareButton title={card.fullName} publicUrl={publicUrl} cardId={analyticsCardId} label="Share Confirm A Kill" /></>}
      connection={renderConnectionAction()}
      feedback={noticeMessage || errorMessage ? <p role="status" className="p-4 text-sm">{errorMessage || noticeMessage}</p> : null}
      trust={renderTrustScoreCard()}
      qr={<CircleCardQrPanel publicUrl={publicUrl} slug={card.slug} label="Save Confirm A Kill" analytics={analyticsCardId ? {cardId:analyticsCardId,source:"public_card"} : undefined} />}
    />;
  }

'''
PROPS = 'type PublicCircleCardProfileProps = {\n'
FUNCTION = 'export function PublicCircleCardProfile({\n'
PROPERTY = '  confirmAKillDraftPresentation?: boolean;\n'
PARAMETER = '  confirmAKillDraftPresentation = false,\n'
PREVIEW_PROP = ' confirmAKillDraftPresentation={row.id === "cmw2jnnc6005xzfahkcfm7q39" && row.slug === "confirm-a-kill-73f64ae9cc20" && plan === "PRO"}'
LEGACY_BRANCH = BRANCH.replace(', confirmAKillDraftPresentation)', ')')


def patch_profile(source):
    if 'return <ConfirmAKillDraftCard' in source:
        if source.count(IMPORT) == 1 and source.count(BRANCH) == 1 and source.count(PROPERTY) == 1 and source.count(PARAMETER) == 1:
            return source
        if source.count(IMPORT) == 1 and source.count(LEGACY_BRANCH) == 1 and PROPERTY not in source and PARAMETER not in source:
            source = source.replace(IMPORT, '', 1).replace(LEGACY_BRANCH, '', 1)
        else:
            raise RuntimeError('A different Confirm A Kill draft presentation is already installed.')
    if source.count(MARKER) != 1:
        raise RuntimeError('The current business renderer entry point needs review.')
    for anchor in ['const spinToConnectProps =', 'function renderWalletAction(',
                   'function renderConnectionAction(', 'function renderTrustScoreCard(',
                   'CircleCardFramedImage', 'CircleCardQrPanel', 'CircleCardShareButton']:
        if anchor not in source:
            raise RuntimeError('A native card capability changed: ' + anchor)
    if source.count(PROPS) != 1 or source.count(FUNCTION) != 1 or PROPERTY in source or PARAMETER in source:
        raise RuntimeError('The public-profile props boundary changed.')
    return IMPORT + source.replace(PROPS, PROPS + PROPERTY, 1).replace(FUNCTION, FUNCTION + PARAMETER, 1).replace(MARKER, BRANCH + MARKER)


def patch_preview_page(source):
    compact = re.sub(r'\s+', '', source)
    for token in ['getOwnedPreparedCard(preparedId)', 'buildPreparedCardPreview(row,plan)', 'parsePreparedPlan(query.plan)']:
        if token not in compact:
            raise RuntimeError('The authenticated prepared-preview boundary changed: ' + token)
    if source.count('<PublicCircleCardProfile') != 1:
        raise RuntimeError('Expected one standard prepared-profile renderer.')
    if 'confirmAKillDraftPresentation=' in source:
        if source.count(PREVIEW_PROP) == 1:
            return source
        raise RuntimeError('A different Confirm A Kill prepared selector already exists.')
    return source.replace('<PublicCircleCardProfile', '<PublicCircleCardProfile' + PREVIEW_PROP, 1)
