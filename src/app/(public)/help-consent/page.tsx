import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isBcnV2Enabled } from "@/lib/bcn-v2/flags";
import { tokenHash } from "@/lib/bcn-v2/http";
import { ConsentChoice } from "@/components/bcn-v2/forms";
import { PageHeading } from "@/components/bcn-v2/shell";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Your introduction permission",
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
  alternates: { canonical: "/help-consent" },
};
export default async function HelpConsent({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  if (!isBcnV2Enabled()) notFound();
  const { token } = await searchParams;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) notFound();
  const r = await prisma.bcnHelpRequest.findUnique({
    where: { consentTokenHash: tokenHash(token) },
    include: { provider: true },
  });
  if (
    !r ||
    r.status !== "AWAITING_CONSENT" ||
    !r.consentExpiresAt ||
    r.consentExpiresAt < new Date() ||
    !r.provider?.approved
  )
    notFound();
  return (
    <>
      <PageHeading
        eyebrow="YOUR CHOICE, FOR THIS PROVIDER ONLY"
        title={`May we introduce you to ${r.provider.name}?`}
      >
        <p>No information is shared with the provider by opening this page.</p>
      </PageHeading>
      <section className="v2-section">
        <div className="v2-wrap v2-prose">
          <h2>{r.provider.name}</h2>
          <p>{r.provider.description}</p>
          <p>{r.provider.location}</p>
          {r.provider.website && (
            <p>
              <a href={r.provider.website} rel="noreferrer">
                Provider website
              </a>
            </p>
          )}
          <h2>What you would agree to</h2>
          <p>
            Allow The Business Circle to send this provider your name, email
            address, business name, help category and the description of your
            request, so they can contact you about this work. This does not give
            permission for unrelated marketing.
          </p>
          <p>
            BCN’s potential agreed referral fee:{" "}
            {r.agreedFeePence
              ? new Intl.NumberFormat("en-GB", {
                  style: "currency",
                  currency: "GBP",
                }).format(r.agreedFeePence / 100)
              : "No referral fee recorded"}
            . The provider must explain their own charges before you commit to
            work.
          </p>
          {r.provider.relatedBusinessDisclosure && (
            <p>Business relationship: {r.provider.relatedBusinessDisclosure}</p>
          )}
          <p>
            You can decline, or withdraw before an introduction by contacting
            contact@thebusinesscircle.net. After sharing, the provider handles
            the information under its own privacy obligations.
          </p>
          <ConsentChoice token={token} />
        </div>
      </section>
    </>
  );
}
