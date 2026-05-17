import { notFound, redirect } from "next/navigation";
import {
  createFounderServiceCheckoutSession,
  resolveFounderServiceSlugFromCleanCheckoutSlug
} from "@/server/founder";

type RouteProps = {
  params: Promise<{
    checkoutSlug: string;
  }>;
};

export async function GET(request: Request, { params }: RouteProps) {
  const { checkoutSlug } = await params;
  const serviceSlug = resolveFounderServiceSlugFromCleanCheckoutSlug(checkoutSlug);
  const requestId = new URL(request.url).searchParams.get("request");

  if (!serviceSlug || !requestId) {
    notFound();
  }

  let checkoutUrl: string;

  try {
    const session = await createFounderServiceCheckoutSession(requestId, {
      markCheckoutLinkSent: true,
      expectedServiceSlug: serviceSlug
    });
    checkoutUrl = session.url;
  } catch {
    notFound();
  }

  redirect(checkoutUrl);
}
