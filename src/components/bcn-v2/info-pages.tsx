import Link from "next/link";
import { PageHeading } from "./shell";
export function Connections() {
  return (
    <>
      <PageHeading
        eyebrow="FREE BUSINESS CONNECTIONS"
        title="The right people. A useful reason to connect."
      >
        <p>
          Create a business profile, discover participating businesses or ask
          BCN to review a specific problem.
        </p>
      </PageHeading>
      <section className="v2-section">
        <div className="v2-wrap v2-grid">
          {[
            [
              "Be clear about how you help",
              "Create an optional free profile and choose whether it should be visible. Publication needs moderation and email verification.",
              "/register",
              "Create a free account",
            ],
            [
              "Find a relevant business",
              "Search by the work businesses do and the area they serve. Contact a listed business through its own website.",
              "/business-directory",
              "Explore the directory",
            ],
            [
              "Ask for a considered introduction",
              "Tell BCN what you need privately. We propose a named provider and ask before sharing your details.",
              "/find-help",
              "Request business help",
            ],
          ].map(([t, d, h, c]) => (
            <Link key={h} href={h} className="v2-card v2-card-link">
              <h2 style={{ fontSize: 25 }}>{t}</h2>
              <p>{d}</p>
              <span className="v2-text-link">{c} ↗</span>
            </Link>
          ))}
        </div>
        <div className="v2-wrap v2-prose" style={{ marginTop: 35 }}>
          <h2>Existing BCN members</h2>
          <p>
            Your account and current contracted member services are preserved.{" "}
            <Link href="/login">Sign in</Link> to use your existing services.
            New tools, guides, profile creation and help requests are free.
          </p>
          <p>
            Member messaging, rooms and events remain existing member services
            during the transition. We are reviewing how to make broader
            connections useful and safe before expanding them.
          </p>
        </div>
      </section>
    </>
  );
}
export function Opportunities() {
  return (
    <>
      <PageHeading
        eyebrow="FUTURE AREA · NOT OPEN FOR LISTINGS"
        title="Good opportunities need a little care."
      >
        <p>
          Collaborations, supplier requests and useful business opportunities
          are planned for a later release.
        </p>
      </PageHeading>
      <section className="v2-section">
        <div className="v2-wrap v2-prose">
          <h2>We are starting with useful help.</h2>
          <p>
            An opportunity board needs active businesses, moderation, clear
            expiry dates and a way to report misleading listings. It is not
            accepting or displaying submissions yet.
          </p>
          <p>
            For a specific need today,{" "}
            <Link href="/find-help">request business help</Link> or{" "}
            <Link href="/business-directory">explore the directory</Link>.
          </p>
        </div>
      </section>
    </>
  );
}
export function HowWeWork() {
  return (
    <>
      <PageHeading
        eyebrow="TRANSPARENCY"
        title="Free help. Clear commercial choices."
      >
        <p>
          BCN exists to help owners solve problems. Here is how we keep that
          useful and sustainable.
        </p>
      </PageHeading>
      <section className="v2-section">
        <div className="v2-wrap v2-prose">
          <h2>What is free</h2>
          <p>
            Every public calculator, checklist, quote builder and guide is free
            without an account. Creating a business profile, browsing the
            directory and requesting an introduction are free too. A provider
            can charge for work you separately choose to commission.
          </p>
          <h2>Provider introductions</h2>
          <p>
            BCN may agree a referral fee with a provider. The potential fee and
            any related-business connection are disclosed when we propose a
            named provider. Your contact details and request are shared only
            after your separate permission. Providers agree scope, terms and
            prices directly with you.
          </p>
          <h2>Software recommendations</h2>
          <p>
            Only approved commercial links may be published as affiliate
            recommendations. They will be clearly labelled as advertising,
            explain BCN’s possible commission and link to an appropriate option
            for the problem. No affiliate partnerships or commission rates are
            claimed on this page.
          </p>
          <h2>Optional extras, later</h2>
          <p>
            Practical downloadable packs, clearly labelled sponsorship and
            optional promoted listings may support BCN in future. No paid
            downloads or sponsored listings are on sale in this release. Core
            tools are not withheld to force a purchase.
          </p>
          <h2>How listings are handled</h2>
          <p>
            Directory entries need permission and moderation. Review is a basic
            suitability check, not professional certification. Businesses cannot
            buy a trusted status. Contact BCN if a listing is inaccurate, unsafe
            or misleading.
          </p>
          <h2>Existing memberships</h2>
          <p>
            Existing subscriptions, account records and member rights are
            preserved. Public free features do not automatically cancel a
            subscription or change an existing agreement. Any proposed
            transition will be communicated directly before changes.
          </p>
          <h2>Separate businesses</h2>
          <p>
            Service providers retain their own accounts, customer records and
            payments. BCN does not silently merge their information or revenue.
            We count BCN revenue only when an evidenced payment is received,
            after recording any reversals.
          </p>
          <p>
            <Link href="/contact">
              Contact BCN with a question or complaint
            </Link>
            .
          </p>
        </div>
      </section>
    </>
  );
}
export function AboutV2() {
  return (
    <>
      <PageHeading
        eyebrow="ABOUT THE BUSINESS CIRCLE"
        title="Built around the work of running a business."
      >
        <p>
          Real help for real business owners. Free tools, practical guidance and
          useful connections, starting with UK sole traders and small service
          businesses.
        </p>
      </PageHeading>
      <section className="v2-section">
        <div className="v2-wrap v2-prose">
          <h2>A reason to visit before a reason to join.</h2>
          <p>
            The Business Circle is changing from a membership-led network to a
            place where an owner can solve a practical problem first. Work
            through a price, understand your costs or make a clearer quote
            without creating an account.
          </p>
          <h2>Founded by Trev Newton</h2>
          <p>
            BCN’s ambition is to become a place business owners use, return to
            and recommend because it helps them move work forward. The starting
            point is focused: useful tools and careful, permission-based
            introductions.
          </p>
          <p>
            THE BUSINESS CIRCLE NETWORK LTD · Company number 17135876 ·
            Registered in England and Wales.
          </p>
          <p>
            <Link href="/how-we-work">Read how BCN works and earns</Link> or{" "}
            <Link href="/tools">try a free business tool</Link>.
          </p>
        </div>
      </section>
    </>
  );
}
export function MembershipV2() {
  return (
    <>
      <PageHeading
        eyebrow="BCN IS BECOMING FREE FIRST"
        title="Useful help, without a membership paywall."
      >
        <p>
          Use the tools and guides freely. Create an optional free account for a
          business profile. No paid membership is required for the new public
          features.
        </p>
      </PageHeading>
      <section className="v2-section">
        <div className="v2-wrap v2-prose">
          <h2>Already a member?</h2>
          <p>
            Your account, payment records and existing contracted access are
            preserved. This redesign has not cancelled or changed your
            subscription. Sign in to access your existing services or contact
            BCN about your membership.
          </p>
          <div className="v2-actions">
            <Link href="/tools" className="v2-button">
              Use a free tool
            </Link>
            <Link href="/login" className="v2-text-link">
              Existing member sign-in
            </Link>
            <Link href="/contact" className="v2-text-link">
              Membership support
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
export function FaqV2() {
  return (
    <>
      <PageHeading eyebrow="COMMON QUESTIONS" title="A few useful answers.">
        <p>
          What is free, how introductions work and what happens to existing
          memberships.
        </p>
      </PageHeading>
      <section className="v2-section">
        <div className="v2-wrap v2-prose">
          {[
            [
              "Do I need an account?",
              "No. Public tools, guides, directory browsing and help requests work without one. An optional free account lets you create a business profile.",
            ],
            [
              "Is everything free?",
              "Core public help is free. Providers charge separately for commissioned work. Optional paid extras may be added later with clear prices and commercial disclosures.",
            ],
            [
              "Will you send my request to companies?",
              "Only after you approve a named provider. BCN reviews requests privately and records your separate permission before sharing.",
            ],
            [
              "Does the checklist scan my site?",
              "No. It helps you perform manual checks. It is not an SEO, speed or security scan.",
            ],
            [
              "Will my quote be saved?",
              "The builder keeps the details on the current page only. Use your browser to print or save the quote as PDF before leaving.",
            ],
            [
              "What happens to my existing membership?",
              "Your existing record, subscription and contracted access remain. Sign in with your existing details or contact BCN for help.",
            ],
            [
              "Are directory listings a guarantee?",
              "No. Listings need permission and moderation, but this does not certify qualifications or guarantee quality. Carry out relevant checks before buying work.",
            ],
          ].map(([q, a]) => (
            <details key={q} className="v2-card" style={{ marginBottom: 12 }}>
              <summary style={{ cursor: "pointer", fontWeight: 800 }}>
                {q}
              </summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}

export function ContactV2() {
  return (
    <>
      <PageHeading
        eyebrow="CONTACT THE BUSINESS CIRCLE"
        title="A useful conversation starts here."
      >
        <p>
          For support, existing memberships, privacy questions, partnerships or
          feedback about BCN.
        </p>
      </PageHeading>
      <section className="v2-section">
        <div className="v2-wrap v2-grid-two v2-grid">
          <div className="v2-card">
            <h2 style={{ fontSize: 26 }}>Need business help?</h2>
            <p>
              Tell us the problem using the private help request form. We review
              it before proposing a relevant provider.
            </p>
            <Link className="v2-button" href="/find-help">
              Request business help ↗
            </Link>
          </div>
          <div className="v2-card">
            <h2 style={{ fontSize: 26 }}>Contact BCN directly</h2>
            <p>
              <a
                className="v2-text-link"
                href="mailto:contact@thebusinesscircle.net"
              >
                contact@thebusinesscircle.net
              </a>
            </p>
            <p>
              Include enough context for us to help. Never send passwords or
              payment details. Existing members can use this address for
              questions about their current access or billing.
            </p>
            <p>
              THE BUSINESS CIRCLE NETWORK LTD · Company no. 17135876 ·
              Registered in England and Wales.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
