import type { ReactElement } from "react";

export async function renderEmailHtml(element: ReactElement) {
  const { renderToStaticMarkup } = await import("react-dom/server");
  return `<!DOCTYPE html>${renderToStaticMarkup(element)}`;
}
