import { BUSINESS_DIRECTORY_CATEGORIES } from "@/lib/circle-card/local-hubs";

export function BusinessDirectoryFields({ postcode = "", category = "other", idPrefix = "business-directory" }: {
  postcode?: string | null;
  category?: string | null;
  idPrefix?: string;
}) {
  return <fieldset className="space-y-3 rounded-2xl border border-gold/25 bg-gold/5 p-4">
    <legend className="px-2 text-sm font-medium text-foreground">Your local business directory</legend>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="space-y-2 text-sm" htmlFor={`${idPrefix}-postcode`}>
        <span>Business postcode</span>
        <input id={`${idPrefix}-postcode`} name="businessPostcode" defaultValue={postcode ?? ""}
          maxLength={10} autoComplete="postal-code" placeholder="e.g. NG15 7AA"
          className="flex min-h-11 w-full rounded-xl border border-silver/25 bg-background px-3 text-foreground" />
      </label>
      <label className="space-y-2 text-sm" htmlFor={`${idPrefix}-category`}>
        <span>Directory section</span>
        <select id={`${idPrefix}-category`} name="businessCategory" defaultValue={category ?? "other"}
          className="flex min-h-11 w-full rounded-xl border border-silver/25 bg-background px-3 text-foreground">
          {BUSINESS_DIRECTORY_CATEGORIES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
      </label>
    </div>
    <p className="text-xs leading-relaxed text-muted">A postcode is required for new business cards. Publish a Business card and turn on Discover to join your local hub for free. NG15 businesses appear in Hucknall &amp; NG15. Your full postcode is used for matching and is not displayed in the directory.</p>
    <p className="text-xs text-muted">Pro and custom designs are optional. Purchases do not improve directory ranking.</p>
  </fieldset>;
}
