import { spinToConnectCircleCardAction } from "@/actions/circle-card.actions";
import { CircleCardFramedImage } from "@/components/circle-card/circle-card-framed-image";
import { CircleCardQrPanel } from "@/components/circle-card/circle-card-qr-panel";
import { CircleCardShareButton } from "@/components/circle-card/circle-card-share-button";
import { CircleCardSpinToConnect } from "@/components/circle-card/circle-card-spin-to-connect";
import type { PublicCircleCard } from "@/server/circle-card";
import { isLawrenceSevernCard } from "./content";
import { LawrenceSevernCard } from "./lawrence-severn-card";
import { LawrenceSevernLogoFace } from "./lawrence-severn-logo";

/** Adapter for the existing authenticated prepared-preview route. No shared renderer replacement. */
export function LawrenceSevernPreparedCard({ card, publicUrl, contactDownloadHref, galleryEnabled }: {
  card: PublicCircleCard;
  publicUrl: string;
  contactDownloadHref: string;
  galleryEnabled: boolean;
}) {
  if (!isLawrenceSevernCard(card) || !card.isDemo) {
    throw new Error("This presentation requires the approved prepared demo card");
  }
  return <LawrenceSevernCard
    name={card.businessName || card.fullName}
    phone={card.phone}
    location={card.location}
    isDemo
    galleryEnabled={galleryEnabled}
    heroImageUrl={card.profileImageUrl}
    galleryItems={card.galleryItems}
    contactHref={contactDownloadHref}
    share={<CircleCardShareButton title={`${card.fullName} | Circle Card`} publicUrl={publicUrl} label="Share" hideStatus size="sm" />}
    qr={<CircleCardQrPanel publicUrl={publicUrl} slug={card.slug} label="Scan this Circle Card" />}
    spin={<CircleCardSpinToConnect
      cardId={card.id} cardSlug={card.slug} cardName={card.fullName}
      publicPath={`/prepared/${card.slug}`} isDemo isAuthenticated viewerIsOwner
      viewerHasCircleCard={false} isConnected={false} initialState={null}
      connectAction={spinToConnectCircleCardAction} className="h-full w-full" showAmbientRing={false}
    >
      <div className="h-full w-full overflow-hidden rounded-full border border-[#b38a4b]">
        {card.businessLogoUrl
          ? <CircleCardFramedImage src={card.businessLogoUrl} alt={`${card.fullName} logo`} positionX={card.businessLogoPositionX} positionY={card.businessLogoPositionY} scale={card.businessLogoScale}><LawrenceSevernLogoFace /></CircleCardFramedImage>
          : <LawrenceSevernLogoFace />}
      </div>
    </CircleCardSpinToConnect>}
  />;
}
