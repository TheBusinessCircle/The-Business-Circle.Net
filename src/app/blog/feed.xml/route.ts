import { SITE_CONFIG } from "@/config/site";
import { buildBlogFeed, listBcnBlogPosts } from "@/lib/bcn-v2/blog";
import { isBcnV2Enabled } from "@/lib/bcn-v2/flags";
export const dynamic = "force-dynamic";
export function GET() {
  if (!isBcnV2Enabled()) return new Response("Not found", { status: 404 });
  return new Response(buildBlogFeed(listBcnBlogPosts(), SITE_CONFIG.url), {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
