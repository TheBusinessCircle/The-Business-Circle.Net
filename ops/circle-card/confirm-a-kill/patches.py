"""Apply the Confirm A Kill private draft presentation to the current release using checked anchors."""

IMPORT = 'import { ConfirmAKillDraftCard, isConfirmAKillDraft } from "@/components/circle-card/confirm-a-kill/confirm-draft-card";\n'
MARKER = '  const businessHeroImageUrl = card.businessLogoUrl || card.profileImageUrl;'
BRANCH = '''  if (isConfirmAKillDraft(card, publicUrl)) {
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


def patch_profile(source):
    if 'return <ConfirmAKillDraftCard' in source:
        if source.count(IMPORT) == 1 and source.count(BRANCH) == 1:
            return source
        raise RuntimeError('A different Confirm A Kill draft presentation is already installed.')
    if source.count(MARKER) != 1:
        raise RuntimeError('The current business renderer entry point needs review.')
    for anchor in ['const spinToConnectProps =', 'function renderWalletAction(',
                   'function renderConnectionAction(', 'function renderTrustScoreCard(',
                   'CircleCardFramedImage', 'CircleCardQrPanel', 'CircleCardShareButton']:
        if anchor not in source:
            raise RuntimeError('A native card capability changed: ' + anchor)
    return IMPORT + source.replace(MARKER, BRANCH + MARKER)
