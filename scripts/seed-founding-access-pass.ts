import { upsertDefaultFoundingAccessCode } from "@/server/invite-codes";
import { logServerError } from "@/lib/security/logging";

async function main() {
  const inviteCode = await upsertDefaultFoundingAccessCode({
    stripeCouponId: process.env.STRIPE_FOUNDING_ACCESS_COUPON_ID || null,
    stripePromotionCodeId: process.env.STRIPE_FOUNDING_ACCESS_PROMOTION_CODE_ID || null
  });

  console.log(
    `Founding Access Pass ready (${inviteCode.successfulUses}/${inviteCode.maxRedemptions ?? "unlimited"} used, ${inviteCode.trialDays} trial days). The access code was not printed.`
  );
}

main().catch((error) => {
  logServerError("founding-access-pass-seed-failed", error);
  process.exit(1);
});
