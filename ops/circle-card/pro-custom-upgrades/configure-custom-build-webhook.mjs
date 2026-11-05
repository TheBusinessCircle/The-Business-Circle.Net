import {createRequire} from "node:module";
import {resolve} from "node:path";
const require=createRequire(resolve(process.cwd(),"package.json"));
const Stripe=require("stripe");
if(process.env.APP_BRAND!=="circle-card")throw new Error("Expected the isolated Circle Card runtime.");
const secret=process.env.STRIPE_SECRET_KEY?.trim()||"";
const live=/^(?:sk|rk)_live_/.test(secret);
if(!live&&!/^(?:sk|rk)_test_/.test(secret))throw new Error("Stripe credentials are not configured.");
const stripe=new Stripe(secret,{apiVersion:"2025-02-24.acacia"});
const endpoints=await stripe.webhookEndpoints.list({limit:100});
if(endpoints.has_more)throw new Error("Webhook inventory requires review before making changes.");
const candidates=endpoints.data.filter(e=>e.url==="https://circlecard.co.uk/api/stripe/webhook"&&e.status==="enabled"&&e.livemode===live);
if(candidates.length!==1)throw new Error("Expected exactly one active Circle Card webhook.");
const endpoint=candidates[0];
const required=["checkout.session.completed","checkout.session.expired","checkout.session.async_payment_succeeded","checkout.session.async_payment_failed",
  "charge.refunded","refund.created","refund.updated","refund.failed","charge.dispute.created","charge.dispute.updated","charge.dispute.closed","charge.dispute.funds_withdrawn","charge.dispute.funds_reinstated"];
const next=endpoint.enabled_events.includes("*")?endpoint.enabled_events:[...new Set([...endpoint.enabled_events,...required])];
if(next.length!==endpoint.enabled_events.length){
  await stripe.webhookEndpoints.update(endpoint.id,{enabled_events:next});
}
const verified=await stripe.webhookEndpoints.retrieve(endpoint.id);
if(verified.url!==endpoint.url||verified.status!=="enabled"||(!verified.enabled_events.includes("*")&&!required.every(e=>verified.enabled_events.includes(e))))throw new Error("Custom design webhook event verification failed.");
console.log("Existing Circle Card webhook verified for custom-design payment confirmation. No payments were created.");
