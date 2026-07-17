import {
  CIRCLE_CARD_APP_DESCRIPTION,
  CIRCLE_CARD_APP_NAME,
  CIRCLE_CARD_APP_SHORT_NAME,
  CIRCLE_CARD_BACKGROUND_COLOR,
  CIRCLE_CARD_ICON_192,
  CIRCLE_CARD_ICON_512,
  CIRCLE_CARD_THEME_COLOR
} from "@/lib/circle-card/metadata";
import { getRuntimeBrand } from "@/config/runtime-brand";
import { getCircleCardRoutes } from "@/lib/circle-card/routes";

export const dynamic = "force-dynamic";

export function GET() {
  const startUrl = getCircleCardRoutes(getRuntimeBrand().key).dashboard;

  return new Response(
    JSON.stringify({
      name: CIRCLE_CARD_APP_NAME,
      short_name: CIRCLE_CARD_APP_SHORT_NAME,
      description: CIRCLE_CARD_APP_DESCRIPTION,
      start_url: startUrl,
      scope: "/",
      display: "standalone",
      background_color: CIRCLE_CARD_BACKGROUND_COLOR,
      theme_color: CIRCLE_CARD_THEME_COLOR,
      icons: [
        {
          src: CIRCLE_CARD_ICON_192,
          sizes: "192x192",
          type: "image/png",
          purpose: "any"
        },
        {
          src: CIRCLE_CARD_ICON_192,
          sizes: "192x192",
          type: "image/png",
          purpose: "maskable"
        },
        {
          src: CIRCLE_CARD_ICON_512,
          sizes: "512x512",
          type: "image/png",
          purpose: "any"
        },
        {
          src: CIRCLE_CARD_ICON_512,
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable"
        }
      ]
    }),
    {
      headers: {
        "Content-Type": "application/manifest+json; charset=utf-8",
        "Cache-Control": "private, no-store, max-age=0",
        Vary: "Host"
      }
    }
  );
}
