import {
  CIRCLE_CARD_APP_DESCRIPTION,
  CIRCLE_CARD_APP_NAME,
  CIRCLE_CARD_APP_SHORT_NAME,
  CIRCLE_CARD_BACKGROUND_COLOR,
  CIRCLE_CARD_ICON_192,
  CIRCLE_CARD_ICON_512,
  CIRCLE_CARD_THEME_COLOR
} from "@/lib/circle-card/metadata";

export const dynamic = "force-static";

export function GET() {
  return new Response(
    JSON.stringify({
      name: CIRCLE_CARD_APP_NAME,
      short_name: CIRCLE_CARD_APP_SHORT_NAME,
      description: CIRCLE_CARD_APP_DESCRIPTION,
      start_url: "/dashboard/circle-card",
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
        "Content-Type": "application/manifest+json; charset=utf-8"
      }
    }
  );
}
