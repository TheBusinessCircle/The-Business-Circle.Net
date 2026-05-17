import { upsertDefaultFoundingAccessCode } from "@/server/invite-codes";

async function main() {
  const inviteCode = await upsertDefaultFoundingAccessCode({
    stripeCouponId: process.env.STRIPE_FOUNDING_ACCESS_COUPON_ID || null,
    stripePromotionCodeId: process.env.STRIPE_FOUNDING_ACCESS_PROMOTION_CODE_ID || null
  });

  console.log(
    `Founding Access Pass ready: ${inviteCode.code} (${inviteCode.successfulUses}/${inviteCode.maxRedemptions ?? "unlimited"} used, ${inviteCode.trialDays} trial days).`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
