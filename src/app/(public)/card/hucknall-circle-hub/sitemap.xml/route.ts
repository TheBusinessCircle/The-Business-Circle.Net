import { getPublicCircleCard } from "@/server/circle-card/public-card.service";
import { HUCKNALL_HUB_CANONICAL } from "@/lib/circle-card/hucknall-content";

export const dynamic = "force-dynamic";
export async function GET() {
  if (!await getPublicCircleCard("hucknall-circle-hub")) return new Response("Not found", { status: 404 });
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${HUCKNALL_HUB_CANONICAL}</loc></url><url><loc>${HUCKNALL_HUB_CANONICAL}/about</loc></url></urlset>`, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "no-store" } });
}
