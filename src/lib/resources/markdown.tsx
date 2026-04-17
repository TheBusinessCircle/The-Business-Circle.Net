import Link from "next/link";
import type { ReactNode } from "react";
import { getExternalLinkProps } from "@/lib/links";

export type ParsedResourceSection = {
  id: string;
  heading: string;
  body: string;
};

type MarkdownBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; level: 3; text: string }
  | { type: "ordered-list"; items: string[] }
  | { type: "unordered-list"; items: string[] };

function slugFromHeading(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function splitResourceContentSections(content: string) {
  const normalized = content.replace(/\r\n/g, "\n").trim();
  const lines = normalized.split("\n");
  const introLines: string[] = [];
  const sections: ParsedResourceSection[] = [];
  let currentHeading = "";
  let currentBody: string[] = [];

  function flushSection() {
    if (!currentHeading) {
      return;
    }

    sections.push({
      id: slugFromHeading(currentHeading),
      heading: currentHeading,
      body: currentBody.join("\n").trim()
    });
  }

  for (const line of lines) {
    const sectionMatch = line.match(/^##\s+(.+)$/);

    if (sectionMatch) {
      flushSection();
      currentHeading = sectionMatch[1].trim();
      currentBody = [];
      continue;
    }

    if (currentHeading) {
      currentBody.push(line);
    } else {
      introLines.push(line);
    }
  }

  flushSection();

  return {
    intro: introLines.join("\n").trim(),
    sections
  };
}

function stripInlineMarkdown(text: string) {
  return text
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[_~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseMarkdownBlocks(content: string): MarkdownBlock[] {
  const normalized = content.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return [];
  }

  const lines = normalized.split("\n");
  const blocks: MarkdownBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trim();

    if (!line) {
      index += 1;
      continue;
    }

    const headingMatch = line.match(/^###\s+(.+)$/);
    if (headingMatch) {
      blocks.push({
        type: "heading",
        level: 3,
        text: headingMatch[1].trim()
      });
      index += 1;
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];

      while (index < lines.length && /^\d+\.\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^\d+\.\s+/, "").trim());
        index += 1;
      }

      blocks.push({
        type: "ordered-list",
        items
      });
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];

      while (index < lines.length && /^[-*]\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^[-*]\s+/, "").trim());
        index += 1;
      }

      blocks.push({
        type: "unordered-list",
        items
      });
      continue;
    }

    const paragraphLines: string[] = [];

    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^###\s+/.test(lines[index].trim()) &&
      !/^\d+\.\s+/.test(lines[index].trim()) &&
      !/^[-*]\s+/.test(lines[index].trim())
    ) {
      paragraphLines.push(lines[index].trim());
      index += 1;
    }

    blocks.push({
      type: "paragraph",
      text: paragraphLines.join(" ")
    });
  }

  return blocks;
}

function renderInlineMarkdown(text: string): ReactNode[] {
  const output: ReactNode[] = [];
  const regex = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      output.push(text.slice(lastIndex, match.index));
    }

    if (match[1] && match[2]) {
      const href = match[2].trim();
      const label = match[1].trim();
      output.push(
        href.startsWith("/")
          ? (
              <Link key={`${href}-${match.index}`} href={href} className="text-primary hover:underline">
                {label}
              </Link>
            )
          : (
              <a
                key={`${href}-${match.index}`}
                {...getExternalLinkProps(href)}
                className="text-primary hover:underline"
              >
                {label}
              </a>
            )
      );
    } else if (match[3]) {
      output.push(
        <strong key={`strong-${match.index}`} className="font-semibold text-foreground">
          {match[3].trim()}
        </strong>
      );
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    output.push(text.slice(lastIndex));
  }

  return output;
}

export function renderResourceMarkdown(content: string): ReactNode[] {
  return parseMarkdownBlocks(content).map((block, index) => {
    if (block.type === "heading") {
      return (
        <h3 key={`heading-${index}`} className="font-display text-xl text-foreground">
          {block.text}
        </h3>
      );
    }

    if (block.type === "ordered-list") {
      return (
        <ol key={`ordered-${index}`} className="space-y-3 pl-5 text-[0.98rem] leading-7 text-silver/92">
          {block.items.map((item, itemIndex) => (
            <li key={`ordered-item-${index}-${itemIndex}`} className="list-decimal">
              {renderInlineMarkdown(item)}
            </li>
          ))}
        </ol>
      );
    }

    if (block.type === "unordered-list") {
      return (
        <ul key={`unordered-${index}`} className="space-y-3 pl-5 text-[0.98rem] leading-7 text-silver/92">
          {block.items.map((item, itemIndex) => (
            <li key={`unordered-item-${index}-${itemIndex}`} className="list-disc">
              {renderInlineMarkdown(item)}
            </li>
          ))}
        </ul>
      );
    }

    return (
      <p key={`paragraph-${index}`} className="text-[1rem] leading-8 text-silver/92">
        {renderInlineMarkdown(block.text)}
      </p>
    );
  });
}

export function resourceMarkdownToPlainText(content: string) {
  const blocks = parseMarkdownBlocks(content);

  return blocks
    .map((block) => {
      if (block.type === "heading") {
        return stripInlineMarkdown(block.text);
      }

      if (block.type === "ordered-list") {
        return block.items
          .map((item, index) => `${index + 1}. ${stripInlineMarkdown(item)}`)
          .join("\n");
      }

      if (block.type === "unordered-list") {
        return block.items.map((item) => stripInlineMarkdown(item)).join("\n");
      }

      return stripInlineMarkdown(block.text);
    })
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

export function extractResourcePreview(content: string) {
  const parsed = splitResourceContentSections(content);
  return {
    intro: parsed.intro,
    section: parsed.sections[0] ?? null
  };
}
