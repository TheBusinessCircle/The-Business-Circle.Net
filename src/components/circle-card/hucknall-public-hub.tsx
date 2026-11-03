import type { ReactNode } from "react";
import { HucknallCircleHub } from "@/components/circle-card/hucknall-circle-hub";
import { HucknallAboutSummary } from "@/components/circle-card/hucknall-about";
import type { LocalHubBusiness } from "@/lib/circle-card/local-hubs";

export function HucknallPublicHub({ businesses, identity, actions, connection, feedback, trust, qr }: {
  businesses: LocalHubBusiness[];
  identity: ReactNode; actions: ReactNode; connection: ReactNode;
  feedback: ReactNode; trust: ReactNode; qr: ReactNode;
}) {
  return <>
    <HucknallCircleHub businesses={businesses} joinPath="/card/hucknall-circle-hub/join" proPath="/pro"
      nativeIdentity={identity} nativeActions={actions}
      nativeDetails={<>{feedback}{connection}</>} aboutContent={<HucknallAboutSummary />} />
    <div className="mx-auto grid max-w-6xl gap-6 px-4 pb-10 md:grid-cols-2">{trust}{qr}</div>
  </>;
}
