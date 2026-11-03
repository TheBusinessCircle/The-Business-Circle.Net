import Link from "next/link";
import { HucknallCircleHub } from "@/components/circle-card/hucknall-circle-hub";
import { BUSINESS_DIRECTORY_CATEGORIES, type LocalHubBusiness } from "@/lib/circle-card/local-hubs";

export const HUCKNALL_PREPARED_ID = "cmvzwzm3y000amkahigz25s8r";
export const HUCKNALL_PREPARED_SLUG = "hucknall-circle-hub-40f0517a277b";

const EXAMPLE_NAMES = ["Example butcher shop", "Example independent shop", "Example local tradesperson",
  "Example salon", "Example business adviser", "Example local garage", "Example activity club",
  "Example community group", "Example local business"];

export const HUCKNALL_PREVIEW_BUSINESSES: LocalHubBusiness[] = BUSINESS_DIRECTORY_CATEGORIES.map(([category, label], index) => ({
  id: `hucknall-example-${index}`, slug: `hucknall-example-${index}`, name: EXAMPLE_NAMES[index],
  category, description: `Illustrative ${label.toLowerCase()} listing showing where an opted-in NG15 business will appear.`,
  trustScore: 0, verifiedTestimonials: 0
}));

export function HucknallHubDraftPreview() {
  return <div className="space-y-3">
    <nav aria-label="Hub draft navigation" className="flex flex-wrap gap-4 px-4 text-sm text-gold">
      <Link className="inline-flex min-h-11 items-center" href="/app">Back to my drafts</Link>
      <Link className="inline-flex min-h-11 items-center" href={`/app/prepared/${HUCKNALL_PREPARED_ID}`}>Edit draft details</Link>
      <Link className="inline-flex min-h-11 items-center" href="/card/hucknall-circle-hub">Open public hub</Link>
    </nav>
    <HucknallCircleHub businesses={HUCKNALL_PREVIEW_BUSINESSES} joinPath="" proPath="" previewMode />
  </div>;
}
