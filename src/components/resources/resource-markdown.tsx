import { renderResourceMarkdown } from "@/lib/resources/markdown";

export function ResourceMarkdown({ content }: { content: string }) {
  return <div className="space-y-5">{renderResourceMarkdown(content)}</div>;
}
