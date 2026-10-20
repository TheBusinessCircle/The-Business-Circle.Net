import Link from "next/link";
import { notFound } from "next/navigation";
import { isBcnV2Enabled } from "@/lib/bcn-v2/flags";
import { PageHeading } from "@/components/bcn-v2/shell";
import { StartPlan } from "@/components/bcn-v2/start-plan";
import { createPageMetadata } from "@/lib/seo";
export const metadata = createPageMetadata({
  title: "Starting a business? Work through your first useful steps",
  description:
    "Test a business idea, understand costs and find practical help. Make a free starting plan without creating an account.",
  path: "/start",
});
export default function Start() {
  if (!isBcnV2Enabled()) notFound();
  return (
    <>
      <PageHeading
        eyebrow="STARTING A BUSINESS"
        title="You do not need every answer to take a useful first step."
      >
        <p>
          Whether it is a first business, a side project or a fresh direction,
          start with the person you want to help and one problem you can solve.
        </p>
      </PageHeading>
      <section className="v2-section">
        <div className="v2-wrap">
          <div className="v2-grid">
            {[
              [
                "1. Test the problem",
                "Talk to potential customers about what they do now, what is difficult and what they would change. Look for evidence before committing significant time or money.",
                "https://www.business.gov.uk/support/ideas-planning-strategy/testing-and-validating-your-business-idea/",
                "Read official guidance on testing an idea",
              ],
              [
                "2. Work out the numbers",
                "List one-off costs, ongoing costs and the time needed to deliver. Test a possible selling price and how much you would need to sell.",
                "/tools/profit-break-even-calculator",
                "Explore profit and break-even",
              ],
              [
                "3. Ask for a helping hand",
                "Ask for one achievable contribution: feedback, experience, a small piece of work or an introduction. Say whether you are looking for free, discounted or paid support.",
                "/ideas",
                "Build it together",
              ],
            ].map(([title, text, href, cta]) => (
              <article className="v2-card" key={title}>
                <h3>{title}</h3>
                <p>{text}</p>
                <Link className="v2-text-link" href={href}>
                  {cta} ↗
                </Link>
              </article>
            ))}
          </div>
          <div style={{ marginTop: 35 }}>
            <StartPlan />
          </div>
          <div className="v2-prose" style={{ marginTop: 35 }}>
            <h2>Check the practical requirements before you trade.</h2>
            <p>
              Business structure, registration, tax, insurance, licences and
              consumer obligations depend on what you do and where you operate.
              Use the current official guidance and take qualified advice where
              needed.
            </p>
            <ul>
              <li>
                <a href="https://www.gov.uk/set-up-business">
                  GOV.UK: setting up a business
                </a>
              </li>
              <li>
                <a href="https://www.gov.uk/write-business-plan">
                  GOV.UK: writing a business plan
                </a>
              </li>
              <li>
                <a href="https://www.startuploans.co.uk/support-and-guidance/business-guidance/planning-templates-and-guides">
                  Start Up Loans: free planning templates and guides
                </a>{" "}
                — linked for the templates; this is not a recommendation to
                borrow.
              </li>
            </ul>
            <p className="v2-note">
              Official sources checked 21 October 2026. BCN’s financial tools
              use UK assumptions; overseas businesses should check local
              requirements. No account is needed for the plan or public tools.
            </p>
            <Link className="v2-button" href="/ideas/new">
              Ask for help with your next step ↗
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
