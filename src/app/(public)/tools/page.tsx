import { notFound } from "next/navigation";
import { PageHeading } from "@/components/bcn-v2/shell";
import { ToolCards } from "@/components/bcn-v2/home";
import { isBcnV2Enabled } from "@/lib/bcn-v2/flags";
import { createPageMetadata } from "@/lib/seo";
export const metadata = createPageMetadata({
  title: "Free Business Tools for UK Owners",
  description:
    "Price jobs, calculate break-even, compare costs, review your website and create quotes. Free tools without an account.",
  path: "/tools",
});
export default function ToolsPage() {
  if (!isBcnV2Enabled()) notFound();
  return (
    <>
      <PageHeading
        eyebrow="FREE BUSINESS TOOLS"
        title="Less guesswork. Clearer decisions."
      >
        <p>
          Practical tools for the numbers, choices and jobs on your list. Use
          every tool without signing up.
        </p>
      </PageHeading>
      <section className="v2-section">
        <div className="v2-wrap">
          <ToolCards />
        </div>
      </section>
    </>
  );
}
