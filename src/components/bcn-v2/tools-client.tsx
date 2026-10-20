"use client";
import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import {
  breakEven,
  compareCosts,
  jobPrice,
  quoteTotals,
  type QuoteLine,
} from "@/lib/bcn-v2/calculations";
import type { ToolSlug } from "@/lib/bcn-v2/catalogue";
import {
  hasConsentForCategory,
  parseCookieConsentFromCookieString,
} from "@/lib/cookie-consent";
export const gbp = (n: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(
    n,
  );
const started = new Set<string>();
export function toolEvent(
  slug: string,
  event: "tool_started" | "tool_completed",
) {
  if (
    !hasConsentForCategory(
      parseCookieConsentFromCookieString(document.cookie),
      "analytics",
    )
  )
    return;
  if (event === "tool_started") {
    if (started.has(slug)) return;
    started.add(slug);
  }
  window.bcnAnalytics?.collect?.({
    eventName: event,
    metadata: { tool: slug },
  });
  window.bcnAnalytics?.track?.(event, { tool: slug });
}
function Field({
  label,
  name,
  value = 0,
  hint,
  max = 1000000000,
  step = "0.01",
  min = 0,
}: {
  label: string;
  name: string;
  value?: number;
  hint?: string;
  max?: number;
  min?: number;
  step?: string;
}) {
  return (
    <label className="v2-field">
      {label}
      <input
        type="number"
        inputMode="decimal"
        name={name}
        defaultValue={value}
        min={min}
        max={max}
        step={step}
        required
      />
      {hint && <small>{hint}</small>}
    </label>
  );
}
function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="v2-preview-row">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}
function Calculator({
  slug,
}: {
  slug: Exclude<ToolSlug, "quote-builder" | "website-health-checklist">;
}) {
  const [result, setResult] = useState<ReactNode>(null);
  const [error, setError] = useState("");
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const n = (k: string) => Number(data.get(k));
    setError("");
    try {
      if (slug === "job-pricing-calculator") {
        const r = jobPrice({
          hours: n("hours"),
          hourlyCost: n("hourlyCost"),
          materials: n("materials"),
          expenses: n("expenses"),
          overhead: n("overhead"),
          margin: n("margin"),
          vat: data.get("registered") ? n("vat") : 0,
        });
        setResult(
          <>
            <span>Suggested price before VAT</span>
            <strong className="v2-number">{gbp(r.net)}</strong>
            <ResultRow label="Total job cost" value={gbp(r.cost)} />
            <ResultRow
              label="Profit before business taxes"
              value={gbp(r.profit)}
            />
            <ResultRow label="VAT" value={gbp(r.tax)} />
            <ResultRow label="Customer total" value={gbp(r.total)} />
            <p>
              Margin = profit ÷ selling price. A 25% margin is different from
              adding 25% to costs.
            </p>
            <Link
              className="v2-button v2-button-light"
              href="/tools/quote-builder"
            >
              Now build your quote ↗
            </Link>
          </>,
        );
      } else if (slug === "profit-break-even-calculator") {
        const r = breakEven({
          fixed: n("fixed"),
          price: n("price"),
          variable: n("variable"),
          units: n("units"),
        });
        setResult(
          <>
            <span>Whole sales needed to break even</span>
            <strong className="v2-number">
              {r.unitsToBreakEven ?? "Not achievable"}
            </strong>
            <p>
              {r.unitsToBreakEven === null
                ? "Your selling price must exceed your variable cost to make a contribution to fixed costs."
                : "Rounded up to whole jobs or units in the period you chose."}
            </p>
            <ResultRow
              label="Contribution per sale"
              value={gbp(r.contribution)}
            />
            {r.revenueToBreakEven !== null && (
              <ResultRow
                label="Revenue at break-even sales"
                value={gbp(r.revenueToBreakEven)}
              />
            )}
            <ResultRow
              label="Revenue at your expected sales"
              value={gbp(r.revenue)}
            />
            <ResultRow
              label="Operating profit at expected sales"
              value={gbp(r.profit)}
            />
            <p>
              Before tax, interest and any costs you have left out. Use the same
              period for costs and sales.
            </p>
          </>,
        );
      } else {
        const r = compareCosts(
          { monthly: n("aMonthly"), setup: n("aSetup"), exit: n("aExit") },
          { monthly: n("bMonthly"), setup: n("bSetup"), exit: n("bExit") },
          n("months"),
        );
        setResult(
          <>
            <span>
              {r.difference === 0
                ? "Both options cost the same"
                : `Option ${r.difference > 0 ? "B" : "A"} costs less`}
            </span>
            <strong className="v2-number">{gbp(Math.abs(r.difference))}</strong>
            <ResultRow label="Option A total" value={gbp(r.costA)} />
            <ResultRow label="Option B total" value={gbp(r.costB)} />
            <p>
              Like-for-like cost difference over {n("months")} months. Compare
              service, contract terms, reliability and support as well as price.
            </p>
          </>,
        );
      }
      toolEvent(slug, "tool_completed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Check your figures.");
      setResult(null);
    }
  }
  return (
    <div className="v2-tool-layout">
      <form
        className="v2-card"
        onSubmit={submit}
        onFocusCapture={() => toolEvent(slug, "tool_started")}
        onChange={() => setResult(null)}
      >
        <div className="v2-form-grid">
          {slug === "job-pricing-calculator" ? (
            <>
              <Field label="Hours on the job" name="hours" value={8} />
              <Field
                label="Labour cost per hour (£)"
                name="hourlyCost"
                value={25}
                hint="Include your own time and employment costs."
              />
              <Field label="Materials (£)" name="materials" value={100} />
              <Field
                label="Travel & other expenses (£)"
                name="expenses"
                value={50}
              />
              <Field
                label="Allocated overhead for this job (£)"
                name="overhead"
                value={50}
                hint="A fair share of insurance, rent, tools and admin. Do not count it twice."
              />
              <Field
                label="Target profit margin (%)"
                name="margin"
                value={25}
                max={99.99}
              />
              <label className="v2-check v2-field-full">
                <input type="checkbox" name="registered" />I am VAT registered
                and this job is subject to VAT.
              </label>
              <Field
                label="VAT rate (%)"
                name="vat"
                value={20}
                max={100}
                hint="Ignored unless VAT is selected. Check the correct rate for the supply."
              />
            </>
          ) : slug === "profit-break-even-calculator" ? (
            <>
              <Field
                label="Fixed costs for the period (£)"
                name="fixed"
                value={1500}
              />
              <Field
                label="Selling price per job or unit (£)"
                name="price"
                value={150}
              />
              <Field
                label="Variable cost per job or unit (£)"
                name="variable"
                value={50}
              />
              <Field
                label="Expected sales in the period"
                name="units"
                value={20}
                step="1"
              />
            </>
          ) : (
            <>
              <Field
                label="Comparison period (months)"
                name="months"
                value={12}
                min={1}
                max={120}
                step="1"
              />
              {["A", "B"].map((x) => (
                <div className="v2-field-full v2-form-grid" key={x}>
                  <h3 className="v2-field-full">Option {x}</h3>
                  <Field
                    label="Monthly cost (£)"
                    name={`${x.toLowerCase()}Monthly`}
                    value={x === "A" ? 30 : 25}
                  />
                  <Field
                    label="Setup cost (£)"
                    name={`${x.toLowerCase()}Setup`}
                    value={x === "A" ? 0 : 100}
                  />
                  <Field
                    label="Exit / other one-off costs (£)"
                    name={`${x.toLowerCase()}Exit`}
                  />
                </div>
              ))}
            </>
          )}
        </div>
        <button className="v2-button" type="submit" style={{ marginTop: 24 }}>
          Calculate my result ↗
        </button>
        {error && (
          <p className="v2-error" role="alert">
            {error}
          </p>
        )}
        <p className="v2-note">
          Your figures stay in this page. Editing a figure clears the previous
          result.
        </p>
      </form>
      <aside className="v2-result" aria-live="polite">
        {result || (
          <>
            <p className="v2-eyebrow">YOUR NEXT CLEARER DECISION</p>
            <h2>Put your numbers to work.</h2>
            <p>
              Enter your figures and calculate to see your result, with the
              assumptions explained.
            </p>
          </>
        )}
      </aside>
    </div>
  );
}
const checks = [
  [
    "Your offer is clear",
    "Ask someone unfamiliar with your business to explain what you offer after seeing the top of your homepage.",
  ],
  [
    "Your area and audience are obvious",
    "Say who you help and where you work. Check this on a small phone screen.",
  ],
  [
    "There is one clear next step",
    "Make calling, enquiring or booking easy. Avoid competing buttons.",
  ],
  [
    "Your contact route works",
    "Send a real test enquiry and check it reaches the right inbox. Test phone and booking links.",
  ],
  [
    "Your pages are readable on mobile",
    "Check text size, menus and forms on an actual phone. Look for sideways scrolling.",
  ],
  [
    "Your pages load comfortably",
    "Try a mobile data connection. Use PageSpeed Insights for a measured performance report.",
  ],
  [
    "Your evidence is believable",
    "Use real work, accurate credentials and reviews you have permission to show.",
  ],
  [
    "People can use it with a keyboard",
    "Try Tab and Enter. Focus should be visible and fields should have useful labels.",
  ],
  [
    "Search engines can understand it",
    "Give important pages distinct titles and clear headings. Check index coverage in Search Console.",
  ],
  [
    "Your privacy information is clear",
    "Explain how enquiries are handled and provide suitable cookie choices for your tracking.",
  ],
  [
    "Your content is current",
    "Check opening hours, prices, service areas and broken links.",
  ],
  [
    "Customers understand the commitment",
    "Explain what happens after an enquiry and any important terms before booking or payment.",
  ],
];
function WebsiteChecklist() {
  const [done, setDone] = useState<number[]>([]);
  const [reviewed, setReviewed] = useState(false);
  return (
    <div className="v2-tool-layout">
      <div className="v2-card">
        <h2>Check it yourself, step by step.</h2>
        <p className="v2-note">
          This is a manual self-assessment. BCN is not crawling, scanning or
          testing your website.
        </p>
        {checks.map(([title, description], i) => (
          <label className="v2-check" key={title}>
            <input
              type="checkbox"
              checked={done.includes(i)}
              onChange={(e) => {
                setDone(
                  e.target.checked ? [...done, i] : done.filter((x) => x !== i),
                );
                setReviewed(false);
              }}
            />
            <span>
              <b>{title}</b>
              <small>{description}</small>
            </span>
          </label>
        ))}
        <button
          className="v2-button"
          onClick={() => {
            setReviewed(true);
            toolEvent("website-health-checklist", "tool_completed");
          }}
        >
          Show my next steps ↗
        </button>
      </div>
      <aside className="v2-result" aria-live="polite">
        <h2>Your practical progress</h2>
        <strong className="v2-number">
          {done.length} / {checks.length}
        </strong>
        <p>
          Checks you have marked complete. This is not an SEO, security or
          performance score.
        </p>
        {reviewed && (
          <>
            <h3>Start with these</h3>
            {checks
              .filter((_, i) => !done.includes(i))
              .slice(0, 3)
              .map(([t, d]) => (
                <p key={t}>
                  <b>{t}</b>
                  <br />
                  {d}
                </p>
              ))}
            {done.length === checks.length && (
              <p>
                Good progress. Repeat the checks with a real customer and
                measure whether enquiries improve.
              </p>
            )}
          </>
        )}
        <Link
          className="v2-button v2-button-light"
          href="/advice/improve-website-enquiries"
        >
          Read the website guide ↗
        </Link>
        <Link
          className="v2-button v2-button-light"
          href="/find-help?category=website"
        >
          Ask for website help ↗
        </Link>
      </aside>
    </div>
  );
}
const newLine = (): QuoteLine => ({
  description: "",
  quantity: 1,
  rate: 0,
  vat: 20,
});
function QuoteBuilder() {
  const [lines, setLines] = useState<QuoteLine[]>([newLine()]);
  const [registered, setRegistered] = useState(false);
  const [details, setDetails] = useState({
    business: "",
    businessAddress: "",
    contact: "",
    companyNumber: "",
    vatNumber: "",
    customer: "",
    customerAddress: "",
    reference: "Q-001",
    date: new Date().toISOString().slice(0, 10),
    validUntil: "",
    terms:
      "Scope: as described below. Any changes require written agreement.\nPayment terms: to be agreed before work begins.\nAcceptance: please confirm acceptance of this quote in writing.",
  });
  let totals: ReturnType<typeof quoteTotals> | null = null;
  let error = "";
  try {
    totals = quoteTotals(lines, registered);
  } catch (e) {
    error = e instanceof Error ? e.message : "Check your quote.";
  }
  function update(index: number, key: keyof QuoteLine, value: string) {
    setLines((old) =>
      old.map((l, i) =>
        i === index
          ? { ...l, [key]: key === "description" ? value : Number(value) }
          : l,
      ),
    );
  }
  const printable = Boolean(
    totals &&
    details.business.trim() &&
    details.businessAddress.trim() &&
    details.customer.trim() &&
    details.reference.trim() &&
    details.date &&
    lines.every((l) => l.description.trim() && l.quantity > 0) &&
    (!registered || details.vatNumber.trim()),
  );
  return (
    <>
      <div className="v2-card v2-no-print">
        <h2>Your business. Your quote.</h2>
        <p className="v2-note">
          Everything stays in this page. Nothing is automatically saved. This is
          a quote, not an invoice or proof of payment.
        </p>
        <div className="v2-form-grid">
          {Object.entries({
            business: "Your business / legal name",
            businessAddress: "Your business address",
            contact: "Contact details",
            companyNumber: "Company number (if applicable)",
            customer: "Customer name",
            customerAddress: "Customer address (optional)",
            reference: "Quote reference",
            date: "Quote date",
            validUntil: "Valid until (optional)",
          }).map(([key, label]) => (
            <label className="v2-field" key={key}>
              {label}
              <input
                type={key === "date" || key === "validUntil" ? "date" : "text"}
                value={details[key as keyof typeof details]}
                maxLength={500}
                onChange={(e) =>
                  setDetails({ ...details, [key]: e.target.value })
                }
              />
            </label>
          ))}
        </div>
        <label className="v2-check">
          <input
            type="checkbox"
            checked={registered}
            onChange={(e) => setRegistered(e.target.checked)}
          />
          I am VAT registered. Add VAT at each item’s applicable rate.
        </label>
        {registered && (
          <label className="v2-field">
            VAT registration number
            <input
              value={details.vatNumber}
              maxLength={50}
              onChange={(e) =>
                setDetails({ ...details, vatNumber: e.target.value })
              }
            />
          </label>
        )}
        {lines.map((line, i) => (
          <div className="v2-line-editor" key={i}>
            <label className="v2-field">
              Item {i + 1} description
              <input
                value={line.description}
                maxLength={500}
                onChange={(e) => update(i, "description", e.target.value)}
              />
            </label>
            {(
              ["quantity", "rate", ...(registered ? ["vat"] : [])] as (
                "quantity" | "rate" | "vat"
              )[]
            ).map((key) => (
              <label className="v2-field" key={key}>
                {key === "quantity"
                  ? "Quantity"
                  : key === "rate"
                    ? "Unit price (£)"
                    : "VAT (%)"}
                <input
                  type="number"
                  min="0"
                  max={key === "vat" ? 100 : 1000000000}
                  step="0.01"
                  value={line[key]}
                  onChange={(e) => update(i, key, e.target.value)}
                />
              </label>
            ))}
            <button
              type="button"
              aria-label={`Remove item ${i + 1}`}
              disabled={lines.length === 1}
              onClick={() => setLines(lines.filter((_, n) => n !== i))}
            >
              Remove
            </button>
          </div>
        ))}
        <button
          className="v2-button v2-button-outline"
          disabled={lines.length >= 50}
          onClick={() => setLines([...lines, newLine()])}
        >
          Add quote item +
        </button>
        <label className="v2-field" style={{ marginTop: 24 }}>
          Scope, exclusions, payment and acceptance terms
          <textarea
            maxLength={10000}
            value={details.terms}
            onChange={(e) => setDetails({ ...details, terms: e.target.value })}
          />
        </label>
        {error && (
          <p className="v2-error" role="alert">
            {error}
          </p>
        )}
        <div className="v2-actions">
          <button
            className="v2-button"
            disabled={!printable}
            onClick={() => {
              toolEvent("quote-builder", "tool_completed");
              window.print();
            }}
          >
            Print / save as PDF ↗
          </button>
        </div>
        <p className="v2-note">
          Complete the business name, address, customer, reference, date and
          item description with a positive quantity to print. Add your VAT
          number if registered. Check terms before sending; acceptance can
          create a contract. For mixed exempt or special VAT treatments, adapt
          the quote with your adviser.
        </p>
      </div>
      <section className="v2-quote" aria-label="Quote preview">
        <div className="v2-quote-head">
          <div>
            <h2>{details.business || "Your business name"}</h2>
            <pre>{details.businessAddress}</pre>
            <p>{details.contact}</p>
            {details.companyNumber && (
              <p>Company no. {details.companyNumber}</p>
            )}
            {registered && <p>VAT no. {details.vatNumber}</p>}
          </div>
          <div>
            <h2>QUOTE</h2>
            <p>
              {details.reference} · {details.date}
            </p>
            {details.validUntil && <p>Valid until: {details.validUntil}</p>}
            <p>Not an invoice</p>
          </div>
        </div>
        <h3>Prepared for {details.customer || "Customer name"}</h3>
        <pre>{details.customerAddress}</pre>
        <div className="v2-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Qty</th>
                <th>Unit price</th>
                <th>Net</th>
                {registered && <th>VAT</th>}
              </tr>
            </thead>
            <tbody>
              {totals?.rows.map((r, i) => (
                <tr key={i}>
                  <td>{r.description || "Item description"}</td>
                  <td>{r.quantity}</td>
                  <td>{gbp(r.rate)}</td>
                  <td>{gbp(r.amount)}</td>
                  {registered && (
                    <td>
                      {r.vat}% · {gbp(r.vatAmount)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totals && (
          <div style={{ maxWidth: 350, marginLeft: "auto", marginTop: 20 }}>
            <ResultRow label="Subtotal" value={gbp(totals.net)} />
            {registered && <ResultRow label="VAT" value={gbp(totals.tax)} />}
            <ResultRow label="Quote total" value={gbp(totals.total)} />
          </div>
        )}
        <h3 style={{ marginTop: 30 }}>Scope & terms</h3>
        <pre>{details.terms}</pre>
        {!registered && (
          <p>
            No VAT charged. Supplier has indicated they are not VAT registered.
          </p>
        )}
      </section>
    </>
  );
}
export function BusinessTool({ slug }: { slug: ToolSlug }) {
  return (
    <div onFocusCapture={() => toolEvent(slug, "tool_started")}>
      {slug === "quote-builder" ? (
        <QuoteBuilder />
      ) : slug === "website-health-checklist" ? (
        <WebsiteChecklist />
      ) : (
        <Calculator slug={slug} />
      )}
    </div>
  );
}
