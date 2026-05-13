import type { ReactElement } from "react";

export async function renderEmailHtml(element: ReactElement) {
  const { renderToStaticMarkup } = await import("react-dom/server");
  const markup = renderToStaticMarkup(element);

  return [
    "<!DOCTYPE html>",
    '<html lang="en">',
    '<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>',
    '<body style="margin:0;padding:0;">',
    markup,
    "</body>",
    "</html>"
  ].join("");
}
