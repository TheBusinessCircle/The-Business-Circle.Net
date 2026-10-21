import { notFound } from "next/navigation";
import { PageHeading } from "@/components/bcn-v2/shell";
import { HelpForm } from "@/components/bcn-v2/forms";
import { isBcnV2Enabled } from "@/lib/bcn-v2/flags";
import { createPageMetadata } from "@/lib/seo";
export const metadata = createPageMetadata({
  title: "Find Business Help",
  description:
    "Ask BCN to review your business problem and suggest a relevant provider. Free requests, with permission before sharing your details.",
  path: "/find-help",
});
export default async function FindHelp({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  if (!isBcnV2Enabled()) notFound();
  const p = await searchParams;
  return (
    <>
      <PageHeading
        eyebrow="FIND BUSINESS HELP"
        title="Tell us what you are trying to sort out."
      >
        <p>
          Start with the problem. BCN reviews your request, looks for a relevant
          provider and asks your permission before an introduction.
        </p>
      </PageHeading>
      <section className="v2-section">
        <div className="v2-wrap v2-tool-layout">
          <HelpForm category={p.category} />
          <aside className="v2-card">
            <h2 style={{ fontSize: 26 }}>You choose the next step.</h2>
            {[
              [
                "01",
                "Your request stays private",
                "BCN reviews it. It is not posted publicly or sold to a list of companies.",
              ],
              [
                "02",
                "We suggest a named provider",
                "You see the business, any referral fee and what information would be shared.",
              ],
              [
                "03",
                "You give separate permission",
                "Only then can BCN share your request with that provider.",
              ],
            ].map(([n, t, d]) => (
              <div className="v2-step" key={n}>
                <span>{n}</span>
                <div>
                  <h3>{t}</h3>
                  <p className="v2-note">{d}</p>
                </div>
              </div>
            ))}
            <p className="v2-note">
              Providers agree their own scope and prices with you. This is not
              an emergency service or personalised regulated financial advice.
            </p>
          </aside>
        </div>
      </section>
    </>
  );
}
