import Link from "next/link";
import {
  ArrowUpRight,
  Calculator,
  ChartNoAxesCombined,
  Columns2,
  FileText,
  MonitorCheck,
  Handshake,
} from "lucide-react";
import { tools } from "@/lib/bcn-v2/catalogue";
const icons = {
  calculator: Calculator,
  chart: ChartNoAxesCombined,
  compare: Columns2,
  website: MonitorCheck,
  document: FileText,
};
export function ToolCards() {
  return (
    <div className="v2-grid">
      {tools.map((tool) => {
        const Icon = icons[tool.icon];
        return (
          <Link
            className="v2-card v2-card-link"
            key={tool.slug}
            href={`/tools/${tool.slug}`}
          >
            <div className="v2-card-icon">
              <Icon size={23} />
            </div>
            <span className="v2-tag">{tool.tag} · FREE TOOL</span>
            <h3>{tool.title}</h3>
            <p>{tool.description}</p>
            <span className="v2-text-link">
              Use the tool <span aria-hidden="true">↗</span>
            </span>
          </Link>
        );
      })}
      <Link className="v2-card v2-card-link" href="/find-help">
        <div className="v2-card-icon">
          <Handshake size={23} />
        </div>
        <span className="v2-tag">A HUMAN NEXT STEP</span>
        <h3>Need someone to help?</h3>
        <p>
          Tell us what you are trying to sort out. We will review your request
          before suggesting a connection.
        </p>
        <span className="v2-text-link">Ask for business help ↗</span>
      </Link>
    </div>
  );
}
export function BcnHome() {
  return (
    <>
      <section className="v2-hero">
        <div className="v2-wrap v2-hero-grid">
          <div>
            <p className="v2-eyebrow">FOR THE PEOPLE RUNNING THE BUSINESS</p>
            <h1>
              Real help for
              <br />
              <span>real business owners.</span>
            </h1>
            <p className="v2-intro">
              Price the job. Work out the numbers. Find the right help. Free
              practical tools and useful connections for your next business
              decision.
            </p>
            <div className="v2-actions">
              <Link className="v2-button v2-button-light" href="/tools">
                Find your free tool <ArrowUpRight size={17} />
              </Link>
              <Link className="v2-button v2-button-outline" href="/find-help">
                Find business help
              </Link>
            </div>
            <p className="v2-note">
              Free to use. No account needed for tools. No membership paywall.
            </p>
          </div>
          <div className="v2-preview" aria-label="Worked pricing example">
            <div className="v2-preview-top">
              <span>A CLEARER PRICE. A BETTER DECISION.</span>
              <Calculator size={17} />
            </div>
            <div className="v2-preview-body">
              <span className="v2-tag">JOB PRICING · WORKED EXAMPLE</span>
              <h3>Is this job worth your time?</h3>
              <div className="v2-preview-row">
                <span>Labour: 8 hours × £25</span>
                <b>£200.00</b>
              </div>
              <div className="v2-preview-row">
                <span>Materials & expenses</span>
                <b>£150.00</b>
              </div>
              <div className="v2-preview-row">
                <span>Job overheads</span>
                <b>£50.00</b>
              </div>
              <div className="v2-preview-total">
                <span>PRICE FOR A 25% PROFIT MARGIN</span>
                <strong>£533.33</strong>
                <span>£133.33 profit · before VAT, if applicable</span>
              </div>
              <p className="v2-note">Include every cost. Know what is left.</p>
            </div>
          </div>
        </div>
      </section>
      <div className="v2-strip">
        <div className="v2-wrap">
          <span>✓ PRACTICAL TOOLS, FREE RESULTS</span>
          <span>✓ MADE FOR UK SMALL BUSINESSES</span>
          <span>✓ CONNECTIONS WITH YOUR PERMISSION</span>
        </div>
      </div>
      <section className="v2-section">
        <div className="v2-wrap">
          <div className="v2-section-head">
            <div>
              <p className="v2-eyebrow">WHAT DO YOU NEED TO SORT OUT?</p>
              <h2>A little clarity goes a long way.</h2>
            </div>
            <span className="v2-note">Start with one useful next step.</span>
          </div>
          <ToolCards />
        </div>
      </section>
      <section className="v2-section v2-section-white">
        <div className="v2-wrap">
          <div className="v2-band">
            <div>
              <p className="v2-eyebrow">WORK IT OUT. THEN MOVE IT FORWARD.</p>
              <h2>
                You do not have to figure
                <br />
                everything out alone.
              </h2>
              <p>
                Running a business means making decisions outside your day job.
                BCN brings the tools, guidance and people together, so you can
                get on with the work.
              </p>
              <Link className="v2-button" href="/connections">
                Explore business connections ↗
              </Link>
            </div>
            <div>
              {[
                [
                  "01",
                  "Start with your problem",
                  "Choose a tool or a practical guide.",
                ],
                [
                  "02",
                  "Get a useful result",
                  "See the numbers, assumptions and next steps.",
                ],
                [
                  "03",
                  "Choose what happens next",
                  "Do it yourself or ask us to help find someone.",
                ],
              ].map(([n, t, d]) => (
                <div className="v2-step" key={n}>
                  <span>{n}</span>
                  <div>
                    <h3>{t}</h3>
                    <p>{d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <section className="v2-section">
        <div className="v2-wrap">
          <div className="v2-section-head">
            <div>
              <p className="v2-eyebrow">
                LESS GUESSWORK. MORE GETTING IT DONE.
              </p>
              <h2>Advice you can put to work.</h2>
            </div>
            <Link className="v2-text-link" href="/advice">
              Explore practical guides ↗
            </Link>
          </div>
          <div className="v2-grid">
            {[
              [
                "pricing-a-service-job",
                "Price your work without guessing",
                "Understand the difference between a markup and a margin.",
              ],
              [
                "improve-website-enquiries",
                "Help your website turn visits into enquiries",
                "Start with clarity, trust and one easy way to get in touch.",
              ],
              [
                "choosing-business-software",
                "Choose software for the job you need done",
                "Compare real costs and an exit plan before committing.",
              ],
            ].map(([slug, t, d]) => (
              <Link
                key={slug}
                className="v2-card v2-card-link"
                href={`/advice/${slug}`}
              >
                <span className="v2-tag">PRACTICAL GUIDE</span>
                <h3>{t}</h3>
                <p>{d}</p>
                <span className="v2-text-link">Read the guide ↗</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
