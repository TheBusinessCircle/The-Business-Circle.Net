import type { Metadata } from "next";
import Link from "next/link";
import {
  BillingDiscountAppliesTo,
  BillingDiscountTag,
  BillingDiscountType,
  BillingInterval,
  BillingPriceBillingType,
  BillingProductCategory
} from "@prisma/client";
import { Briefcase, Crown, PoundSterling, RefreshCcw, Tags } from "lucide-react";
import {
  createBillingDiscountAction,
  syncBillingCatalogAction,
  updateBillingDiscountActiveAction,
  updateFounderControlAction,
  upsertBillingPriceAction,
  upsertBillingProductAction
} from "@/actions/admin/products-pricing.actions";
import { getMembershipTierLabel } from "@/config/membership";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createPageMetadata } from "@/lib/seo";
import { requireAdmin } from "@/lib/session";
import { formatCurrency } from "@/lib/utils";
import { listActiveFounderServices } from "@/server/founder";
import {
  listBillingCatalogDiscounts,
  listBillingCatalogProducts
} from "@/server/products-pricing";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = createPageMetadata({
  title: "Products & Pricing",
  description:
    "Manage products, prices, discounts, founder controls, and Stripe sync from one admin surface.",
  path: "/admin/products-pricing",
  noIndex: true
});

export const dynamic = "force-dynamic";

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function feedbackMessage(input: { notice: string; error: string }) {
  const noticeMap: Record<string, string> = {
    "product-saved": "Product details updated.",
    "price-saved": "Price saved. If the Stripe price needs updating, run sync now.",
    "discount-created": "Discount code created and linked to Stripe.",
    "discount-updated": "Discount status updated.",
    "founder-control-updated": "Founder availability control updated.",
    "stripe-sync-complete": "Stripe catalog sync completed."
  };
  const errorMap: Record<string, string> = {
    "product-invalid": "The product form was incomplete.",
    "product-save-failed": "Unable to save that product.",
    "price-invalid": "The price form was incomplete.",
    "price-save-failed": "Unable to save that price.",
    "discount-invalid": "The discount form was incomplete.",
    "discount-expiry-invalid": "Expiry dates must be in YYYY-MM-DD format.",
    "discount-value-invalid": "Discount values must be valid for the selected type.",
    "discount-duplicate": "That discount code already exists.",
    "discount-product-sync-failed": "Unable to sync Stripe products for this discount.",
    "discount-create-failed": "Unable to create that Stripe-backed discount code.",
    "discount-update-invalid": "The discount update request was invalid.",
    "discount-already-redeemed": "This discount was already redeemed and cannot be reactivated.",
    "discount-update-failed": "Unable to update that discount code.",
    "founder-control-invalid": "The founder control form was incomplete.",
    "founder-limit-below-claimed": "Founder limit cannot be set below the number already claimed.",
    "founder-control-failed": "Unable to update founder availability.",
    "stripe-sync-failed": "Unable to sync the billing catalog with Stripe."
  };

  if (input.notice && noticeMap[input.notice]) {
    return { type: "notice" as const, message: noticeMap[input.notice] };
  }

  if (input.error && errorMap[input.error]) {
    return { type: "error" as const, message: errorMap[input.error] };
  }

  return null;
}

function formatMinorCurrency(amount: number, currency = "GBP") {
  return formatCurrency(amount / 100, currency);
}

function formatCategoryLabel(value: BillingProductCategory) {
  return value === BillingProductCategory.MEMBERSHIP ? "Membership" : "Service";
}

function formatBillingTypeLabel(value: BillingPriceBillingType) {
  return value === BillingPriceBillingType.RECURRING ? "Recurring" : "One-time";
}

function formatIntervalLabel(value: BillingInterval | null) {
  if (value === BillingInterval.YEAR) {
    return "Year";
  }

  if (value === BillingInterval.MONTH) {
    return "Month";
  }

  return "None";
}

function formatAppliesToLabel(value: BillingDiscountAppliesTo) {
  return value.replaceAll("_", " ").toLowerCase();
}

function formatDiscountTagLabel(value: BillingDiscountTag) {
  return value.replaceAll("_", " ").toLowerCase();
}

function formatDiscountTypeLabel(value: BillingDiscountType) {
  return value === BillingDiscountType.PERCENTAGE ? "Percentage" : "Fixed";
}

function formatSyncStatusLabel(value: string) {
  return value.toLowerCase();
}

export default async function AdminProductsPricingPage({ searchParams }: PageProps) {
  await requireAdmin();
  const params = await searchParams;

  const [products, discounts, founderServices] = await Promise.all([
    listBillingCatalogProducts(),
    listBillingCatalogDiscounts(),
    listActiveFounderServices()
  ]);

  const feedback = feedbackMessage({
    notice: firstValue(params.notice),
    error: firstValue(params.error)
  });
  const priceCount = products.reduce((sum, product) => sum + product.prices.length, 0);
  const syncedProducts = products.filter((product) => product.syncStatus === "SYNCED").length;
  const founderControls = products.filter(
    (product) => product.category === BillingProductCategory.MEMBERSHIP && product.founderSettings
  );

  return (
    <div className="space-y-6">
      <Card className="border-gold/35 bg-gradient-to-br from-gold/12 via-card/82 to-card/68">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Badge variant="outline" className="border-gold/35 bg-gold/12 text-gold">
                <PoundSterling size={12} className="mr-1" />
                Products & Pricing
              </Badge>
              <CardTitle className="mt-3 font-display text-3xl">Single control layer for products, prices, and founder availability</CardTitle>
              <CardDescription className="mt-2 max-w-3xl text-base">
                Memberships, founder services, discounts, and Stripe sync stay managed here without rebuilding the live checkout paths.
              </CardDescription>
            </div>
            <form action={syncBillingCatalogAction}>
              <input type="hidden" name="returnPath" value="/admin/products-pricing" />
              <Button type="submit" variant="outline">
                <RefreshCcw size={14} className="mr-2" />
                Sync Stripe Catalog
              </Button>
            </form>
          </div>
        </CardHeader>
      </Card>

      {feedback ? (
        <Card className={feedback.type === "error" ? "border-red-500/35 bg-red-500/10" : "border-gold/30 bg-gold/10"}>
          <CardContent className="py-3">
            <p className={feedback.type === "error" ? "text-sm text-red-200" : "text-sm text-gold"}>
              {feedback.message}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Products" value={products.length.toString()} hint="Live catalog records managed in one place." />
        <MetricCard label="Prices" value={priceCount.toString()} hint="Active and historical Stripe-backed price records." />
        <MetricCard label="Discounts" value={discounts.length.toString()} hint="Promo codes for outreach, members, and manual deals." />
        <MetricCard label="Stripe Synced" value={`${syncedProducts}/${products.length}`} hint="Products with a confirmed Stripe product record." />
      </section>

      <div className="flex flex-wrap gap-2">
        <a href="#products"><Button variant="outline" size="sm">Products</Button></a>
        <a href="#prices"><Button variant="outline" size="sm">Prices</Button></a>
        <a href="#discounts"><Button variant="outline" size="sm">Discounts</Button></a>
        <a href="#founder-controls"><Button variant="outline" size="sm">Founder Controls</Button></a>
      </div>

      <section id="products" className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Create product</CardTitle>
            <CardDescription>Add a new product record to the catalog and link it to a membership tier or founder service when needed.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={upsertBillingProductAction} className="space-y-4">
              <input type="hidden" name="returnPath" value="/admin/products-pricing#products" />
              <div className="space-y-2"><Label htmlFor="product-name">Name</Label><Input id="product-name" name="name" required placeholder="Foundation Membership" /></div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="product-category">Category</Label><select id="product-category" name="category" className="flex h-10 w-full rounded-xl border border-border/80 bg-background/30 px-3 text-sm"><option value={BillingProductCategory.MEMBERSHIP}>Membership</option><option value={BillingProductCategory.SERVICE}>Service</option></select></div>
                <div className="space-y-2"><Label htmlFor="product-tier">Membership tier</Label><select id="product-tier" name="membershipTier" className="flex h-10 w-full rounded-xl border border-border/80 bg-background/30 px-3 text-sm"><option value="">No membership tier</option><option value="FOUNDATION">Foundation</option><option value="INNER_CIRCLE">Inner Circle</option><option value="CORE">Core</option></select></div>
              </div>
              <div className="space-y-2"><Label htmlFor="product-service">Founder service link</Label><select id="product-service" name="founderServiceId" className="flex h-10 w-full rounded-xl border border-border/80 bg-background/30 px-3 text-sm"><option value="">No founder service link</option>{founderServices.map((service) => <option key={service.id} value={service.id}>{service.title}</option>)}</select></div>
              <div className="space-y-2"><Label htmlFor="product-description">Description</Label><Textarea id="product-description" name="description" rows={4} placeholder="Short internal description for this product." /></div>
              <label className="flex items-center gap-2 text-sm text-muted"><input type="checkbox" name="active" defaultChecked className="h-4 w-4 rounded border-border bg-background" />Active</label>
              <Button type="submit">Save Product</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Product list</CardTitle>
            <CardDescription>The six core offers live here first, with Stripe state and product context visible at a glance.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {products.map((product) => (
              <div key={product.id} className="rounded-2xl border border-border/80 bg-background/20 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{product.name}</p>
                    <p className="mt-1 text-xs text-muted">{formatCategoryLabel(product.category)}{product.membershipTier ? ` · ${getMembershipTierLabel(product.membershipTier)}` : ""}{product.founderService ? ` · ${product.founderService.title}` : ""}</p>
                  </div>
                  <span className="rounded-full border border-border/80 bg-background/35 px-3 py-1 text-[11px] uppercase tracking-[0.08em] text-silver">{formatSyncStatusLabel(product.syncStatus)}</span>
                </div>
                <p className="mt-3 text-sm text-muted">{product.description || "No description set yet."}</p>
                <p className="mt-3 text-xs text-muted">Stripe product: {product.stripeProductId ?? "Not linked yet"}</p>
                <form action={upsertBillingProductAction} className="mt-4 grid gap-3">
                  <input type="hidden" name="productId" value={product.id} />
                  <input type="hidden" name="returnPath" value="/admin/products-pricing#products" />
                  <input type="hidden" name="category" value={product.category} />
                  <input type="hidden" name="membershipTier" value={product.membershipTier ?? ""} />
                  <input type="hidden" name="founderServiceId" value={product.founderServiceId ?? ""} />
                  <Input name="name" defaultValue={product.name} />
                  <Textarea name="description" rows={3} defaultValue={product.description} />
                  <label className="flex items-center gap-2 text-sm text-muted"><input type="checkbox" name="active" defaultChecked={product.active} className="h-4 w-4 rounded border-border bg-background" />Active</label>
                  <Button type="submit" variant="outline" size="sm">Update Product</Button>
                </form>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section id="prices" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Prices</CardTitle>
            <CardDescription>Each product can carry multiple live or historical prices. Membership amounts are stored in pence and founder pricing stays on separate price IDs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {products.map((product) => (
              <div key={product.id} className="rounded-2xl border border-border/80 bg-background/20 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">{product.name}</p>
                  <span className="text-xs text-muted">{product.prices.length} price record{product.prices.length === 1 ? "" : "s"}</span>
                </div>
                <div className="mt-4 space-y-3">
                  {product.prices.map((price) => (
                    <form key={price.id} action={upsertBillingPriceAction} className="grid gap-3 rounded-2xl border border-border/70 bg-background/30 p-4 md:grid-cols-6">
                      <input type="hidden" name="priceId" value={price.id} />
                      <input type="hidden" name="productId" value={product.id} />
                      <input type="hidden" name="returnPath" value="/admin/products-pricing#prices" />
                      <div className="space-y-1 md:col-span-2"><Label>Name</Label><Input name="name" defaultValue={price.name} /></div>
                      <div className="space-y-1"><Label>Amount (p)</Label><Input name="amount" type="number" min={0} defaultValue={price.amount} /></div>
                      <div className="space-y-1"><Label>Currency</Label><Input name="currency" defaultValue={price.currency} /></div>
                      <div className="space-y-1"><Label>Type</Label><select name="billingType" defaultValue={price.billingType} className="flex h-10 w-full rounded-xl border border-border/80 bg-background/30 px-3 text-sm"><option value={BillingPriceBillingType.ONE_TIME}>One-time</option><option value={BillingPriceBillingType.RECURRING}>Recurring</option></select></div>
                      <div className="space-y-1"><Label>Interval</Label><select name="interval" defaultValue={price.interval ?? ""} className="flex h-10 w-full rounded-xl border border-border/80 bg-background/30 px-3 text-sm"><option value="">None</option><option value={BillingInterval.MONTH}>Month</option><option value={BillingInterval.YEAR}>Year</option></select></div>
                      <label className="flex items-center gap-2 text-sm text-muted"><input type="checkbox" name="isFounderPrice" defaultChecked={price.isFounderPrice} className="h-4 w-4 rounded border-border bg-background" />Founder price</label>
                      <label className="flex items-center gap-2 text-sm text-muted"><input type="checkbox" name="active" defaultChecked={price.active} className="h-4 w-4 rounded border-border bg-background" />Active</label>
                      <div className="text-xs text-muted md:col-span-4">Live amount: {formatMinorCurrency(price.amount, price.currency)} · {formatBillingTypeLabel(price.billingType)} · {formatIntervalLabel(price.interval)} · Stripe: {price.stripePriceId ?? "Not linked"}</div>
                      <div className="md:col-span-2"><Button type="submit" variant="outline" size="sm" className="w-full">Save Price</Button></div>
                    </form>
                  ))}

                  <form action={upsertBillingPriceAction} className="grid gap-3 rounded-2xl border border-dashed border-gold/35 bg-gold/8 p-4 md:grid-cols-6">
                    <input type="hidden" name="productId" value={product.id} />
                    <input type="hidden" name="returnPath" value="/admin/products-pricing#prices" />
                    <div className="space-y-1 md:col-span-2"><Label>New price name</Label><Input name="name" placeholder="Monthly" /></div>
                    <div className="space-y-1"><Label>Amount (p)</Label><Input name="amount" type="number" min={0} placeholder="3000" /></div>
                    <div className="space-y-1"><Label>Currency</Label><Input name="currency" defaultValue="GBP" /></div>
                    <div className="space-y-1"><Label>Type</Label><select name="billingType" defaultValue={BillingPriceBillingType.RECURRING} className="flex h-10 w-full rounded-xl border border-border/80 bg-background/30 px-3 text-sm"><option value={BillingPriceBillingType.ONE_TIME}>One-time</option><option value={BillingPriceBillingType.RECURRING}>Recurring</option></select></div>
                    <div className="space-y-1"><Label>Interval</Label><select name="interval" defaultValue={BillingInterval.MONTH} className="flex h-10 w-full rounded-xl border border-border/80 bg-background/30 px-3 text-sm"><option value="">None</option><option value={BillingInterval.MONTH}>Month</option><option value={BillingInterval.YEAR}>Year</option></select></div>
                    <label className="flex items-center gap-2 text-sm text-muted"><input type="checkbox" name="isFounderPrice" className="h-4 w-4 rounded border-border bg-background" />Founder price</label>
                    <label className="flex items-center gap-2 text-sm text-muted"><input type="checkbox" name="active" defaultChecked className="h-4 w-4 rounded border-border bg-background" />Active</label>
                    <div className="md:col-span-2"><Button type="submit">Add Price</Button></div>
                  </form>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section id="discounts" className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
        <Card>
          <CardHeader>
            <CardTitle>Create discount</CardTitle>
            <CardDescription>Create Stripe-backed promo codes for local outreach, member offers, or manual deals.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createBillingDiscountAction} className="space-y-4">
              <input type="hidden" name="returnPath" value="/admin/products-pricing#discounts" />
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="discount-code">Code</Label><Input id="discount-code" name="code" required placeholder="LOCAL50" /></div>
                <div className="space-y-2"><Label htmlFor="discount-name">Name</Label><Input id="discount-name" name="name" placeholder="Local outreach offer" /></div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><Label>Type</Label><select name="type" className="flex h-10 w-full rounded-xl border border-border/80 bg-background/30 px-3 text-sm"><option value={BillingDiscountType.PERCENTAGE}>Percentage</option><option value={BillingDiscountType.FIXED}>Fixed</option></select></div>
                <div className="space-y-2"><Label>Value</Label><Input name="value" type="number" min={1} placeholder="50" /></div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><Label>Applies to</Label><select name="appliesTo" className="flex h-10 w-full rounded-xl border border-border/80 bg-background/30 px-3 text-sm"><option value={BillingDiscountAppliesTo.ALL_PRODUCTS}>All products</option><option value={BillingDiscountAppliesTo.MEMBERSHIPS}>Memberships</option><option value={BillingDiscountAppliesTo.SERVICES}>Services</option><option value={BillingDiscountAppliesTo.SPECIFIC_PRODUCT}>Specific product</option></select></div>
                <div className="space-y-2"><Label>Specific product</Label><select name="specificProductId" className="flex h-10 w-full rounded-xl border border-border/80 bg-background/30 px-3 text-sm"><option value="">No specific product</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2"><Label>Usage limit</Label><Input name="usageLimit" type="number" min={1} max={1} defaultValue={1} readOnly /></div>
                <div className="space-y-2"><Label>Expiry</Label><Input name="expiresAt" type="date" /></div>
                <div className="space-y-2"><Label>Tag</Label><select name="tag" className="flex h-10 w-full rounded-xl border border-border/80 bg-background/30 px-3 text-sm"><option value={BillingDiscountTag.LOCAL_OUTREACH}>Local outreach</option><option value={BillingDiscountTag.MEMBER_DISCOUNT}>Member discount</option><option value={BillingDiscountTag.MANUAL}>Manual</option></select></div>
              </div>
              <label className="flex items-center gap-2 text-sm text-muted"><input type="checkbox" name="active" defaultChecked className="h-4 w-4 rounded border-border bg-background" />Active</label>
              <Button type="submit">Create Discount</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Discount library</CardTitle>
            <CardDescription>Existing promotion codes with Stripe IDs, expiry, and usage.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {discounts.length ? discounts.map((discount) => (
              <div key={discount.id} className="rounded-2xl border border-border/80 bg-background/20 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{discount.code}</p>
                    <p className="mt-1 text-xs text-muted">{formatDiscountTypeLabel(discount.type)} · {formatAppliesToLabel(discount.appliesTo)} · {formatDiscountTagLabel(discount.tag)}</p>
                  </div>
                  <span className="rounded-full border border-border/80 bg-background/35 px-3 py-1 text-[11px] uppercase tracking-[0.08em] text-silver">{discount.active ? "active" : "inactive"}</span>
                </div>
                <p className="mt-3 text-sm text-muted">{discount.type === BillingDiscountType.PERCENTAGE ? `${discount.value}% off` : `${formatMinorCurrency(discount.value)} off`} · Used {discount.timesUsed}/{discount.usageLimit}{discount.expiresAt ? ` · Expires ${new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(discount.expiresAt)}` : ""}</p>
                {discount.redeemedAt ? (
                  <p className="mt-2 text-xs text-muted">Redeemed {new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(discount.redeemedAt)}{discount.redeemedBy ? ` by ${discount.redeemedBy.name || discount.redeemedBy.email}` : ""}</p>
                ) : null}
                <p className="mt-2 text-xs text-muted">Coupon: {discount.stripeCouponId ?? "Not linked"} · Promo code: {discount.stripePromotionCodeId ?? "Not linked"}</p>
                <form action={updateBillingDiscountActiveAction} className="mt-4 flex flex-wrap items-center gap-3">
                  <input type="hidden" name="discountId" value={discount.id} />
                  <input type="hidden" name="returnPath" value="/admin/products-pricing#discounts" />
                  <label className="flex items-center gap-2 text-sm text-muted"><input type="checkbox" name="active" defaultChecked={discount.active} className="h-4 w-4 rounded border-border bg-background" />Active</label>
                  <Button type="submit" variant="outline" size="sm">Update Status</Button>
                </form>
              </div>
            )) : <p className="text-sm text-muted">No discount codes have been created yet.</p>}
          </CardContent>
        </Card>
      </section>

      <section id="founder-controls" className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
        <Card>
          <CardHeader>
            <CardTitle>Founder controls</CardTitle>
            <CardDescription>These limits feed the live founder-rate availability logic on membership selection and checkout.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl border border-gold/30 bg-gold/10 p-4 text-sm text-muted">
              <p className="font-medium text-foreground">Automatic member discount rule</p>
              <p className="mt-2">Direct founder services still apply member pricing automatically: Inner Circle members receive 10% off and Core members receive 20% off. No code entry is required for that rule.</p>
            </div>
            {founderControls.map((product) => product.founderSettings ? (
              <form key={product.id} action={updateFounderControlAction} className="rounded-2xl border border-border/80 bg-background/20 p-4">
                <input type="hidden" name="productId" value={product.id} />
                <input type="hidden" name="returnPath" value="/admin/products-pricing#founder-controls" />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{product.name}</p>
                    <p className="mt-1 text-xs text-muted">Used {product.founderSettings.currentCount} · Remaining {product.founderSettings.remainingCount}</p>
                  </div>
                  <span className="rounded-full border border-border/80 bg-background/35 px-3 py-1 text-[11px] uppercase tracking-[0.08em] text-silver">{product.founderSettings.active ? "active" : "inactive"}</span>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="space-y-1"><Label>Founder limit</Label><Input name="founderLimit" type="number" min={0} defaultValue={product.founderSettings.founderLimit} /></div>
                  <label className="flex items-center gap-2 self-end text-sm text-muted"><input type="checkbox" name="active" defaultChecked={product.founderSettings.active} className="h-4 w-4 rounded border-border bg-background" />Founder pricing active</label>
                </div>
                <Button type="submit" variant="outline" size="sm" className="mt-4">Update Founder Control</Button>
              </form>
            ) : null)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Control summary</CardTitle>
            <CardDescription>Quick context for the current catalog shape and how it maps across the membership and founder offer stack.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <SummaryRow icon={Briefcase} label="Membership products" value={products.filter((product) => product.category === BillingProductCategory.MEMBERSHIP).length.toString()} copy="Foundation, Inner Circle, and Core stay aligned with founder allocations and Stripe IDs." />
            <SummaryRow icon={Tags} label="Discount coverage" value={discounts.length.toString()} copy="Promotion codes are kept central so outreach and manual deals stay traceable." />
            <SummaryRow icon={Crown} label="Founder-managed services" value={products.filter((product) => product.category === BillingProductCategory.SERVICE).length.toString()} copy="Clarity Audit, Strategy Session, and Growth Architect flow through the same pricing layer." />
            <div className="rounded-2xl border border-border/80 bg-background/20 p-4 text-sm text-muted">
              <p className="font-medium text-foreground">Related admin areas</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href="/admin/founding"><Button variant="outline" size="sm">Founding Launch</Button></Link>
                <Link href="/admin/founder-services"><Button variant="outline" size="sm">Founder Services</Button></Link>
                <Link href="/admin/revenue"><Button variant="outline" size="sm">Revenue</Button></Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card className="interactive-card">
      <CardHeader className="space-y-1 pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted">{hint}</p>
      </CardContent>
    </Card>
  );
}

function SummaryRow({
  icon: Icon,
  label,
  value,
  copy
}: {
  icon: typeof Briefcase;
  label: string;
  value: string;
  copy: string;
}) {
  return (
    <div className="rounded-2xl border border-border/80 bg-background/20 p-4">
      <p className="inline-flex items-center gap-2 text-sm font-medium text-foreground"><Icon size={16} className="text-gold" />{label}</p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
      <p className="mt-2 text-sm text-muted">{copy}</p>
    </div>
  );
}
