import { ResourceBlockType } from "@prisma/client";
import type { ResourceBlock } from "@prisma/client";
import { AlertTriangle, CheckSquare, Download, ExternalLink, Info, Link2, ListChecks, Quote } from "lucide-react";
import { getExternalLinkProps } from "@/lib/links";

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toStringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function resolveTextFromRecord(record: JsonRecord, keys: string[]): string {
  for (const key of keys) {
    const value = toStringValue(record[key]);
    if (value) {
      return value;
    }
  }

  return "";
}

function resolveVideoEmbed(url: string): string | null {
  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace("www.", "");

    if (host === "youtube.com" || host === "youtu.be") {
      const videoId =
        host === "youtu.be"
          ? parsed.pathname.slice(1)
          : parsed.searchParams.get("v") ?? parsed.pathname.split("/").pop();

      if (!videoId) {
        return null;
      }

      return `https://www.youtube.com/embed/${videoId}`;
    }

    if (host === "vimeo.com") {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
  } catch {
    return null;
  }

  return null;
}

function renderFallback() {
  return (
    <p className="text-sm text-muted">
      This content block has no renderable content yet.
    </p>
  );
}

export function ResourceBlockRenderer({ block }: { block: ResourceBlock }) {
  const content = isRecord(block.content) ? block.content : {};

  switch (block.type) {
    case ResourceBlockType.TEXT: {
      const text = toStringValue(content.text) || toStringValue(content.body);
      return text ? (
        <p className="whitespace-pre-wrap text-[0.95rem] leading-7 text-silver/90">{text}</p>
      ) : (
        renderFallback()
      );
    }

    case ResourceBlockType.CHECKLIST: {
      const items = Array.isArray(content.items)
        ? content.items
            .map((item) => {
              if (isRecord(item)) {
                return resolveTextFromRecord(item, ["label", "text", "item", "title"]);
              }

              return String(item);
            })
            .map((item) => item.trim())
            .filter(Boolean)
        : [];

      if (!items.length) {
        return renderFallback();
      }

      return (
        <ul className="space-y-2 text-sm text-silver/90">
          {items.map((item, index) => (
            <li key={`${block.id}-check-${index}`} className="flex items-start gap-2">
              <CheckSquare size={14} className="mt-0.5 text-emerald-300" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
    }

    case ResourceBlockType.STEPS: {
      const stepsRaw = Array.isArray(content.steps)
        ? content.steps
        : Array.isArray(content.items)
          ? content.items
          : [];
      if (!stepsRaw.length) {
        return renderFallback();
      }

      return (
        <ol className="space-y-3">
          {stepsRaw.map((step, index) => {
            const asRecord = isRecord(step) ? step : null;
            const title = asRecord ? resolveTextFromRecord(asRecord, ["title", "label"]) : "";
            const description = asRecord
              ? resolveTextFromRecord(asRecord, ["description", "text", "details", "body"])
              : String(step);

            return (
              <li
                key={`${block.id}-step-${index}`}
                className="rounded-2xl border border-border/80 bg-background/35 p-3"
              >
                <p className="text-sm font-medium text-foreground">
                  Step {index + 1}
                  {title ? `: ${title}` : ""}
                </p>
                {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
              </li>
            );
          })}
        </ol>
      );
    }

    case ResourceBlockType.IMAGE: {
      const url = toStringValue(content.url);
      const caption = toStringValue(content.caption);
      const alt = toStringValue(content.alt) || caption || "Resource image";

      if (!url) {
        return renderFallback();
      }

      return (
        <figure className="space-y-2">
          <img src={url} alt={alt} className="w-full rounded-xl border border-border object-cover" />
          {caption ? <figcaption className="text-xs text-muted">{caption}</figcaption> : null}
        </figure>
      );
    }

    case ResourceBlockType.VIDEO: {
      const url = toStringValue(content.url);
      if (!url) {
        return renderFallback();
      }

      const embed = resolveVideoEmbed(url);
      const caption = toStringValue(content.caption);

      return (
        <div className="space-y-2">
          {embed ? (
            <div className="overflow-hidden rounded-xl border border-border bg-black/25">
              <iframe
                src={embed}
                title={toStringValue(content.title) || "Video block"}
                className="aspect-video w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <a
              {...getExternalLinkProps(url)}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm text-primary hover:bg-primary/10"
            >
              Open Video
              <ExternalLink size={14} />
            </a>
          )}
          {caption ? <p className="text-xs text-muted">{caption}</p> : null}
        </div>
      );
    }

    case ResourceBlockType.QUOTE: {
      const quote = toStringValue(content.quote) || toStringValue(content.text);
      const author = toStringValue(content.author);
      const role = toStringValue(content.role);

      if (!quote) {
        return renderFallback();
      }

      return (
        <blockquote className="rounded-2xl border border-gold/30 bg-gold/10 px-4 py-3">
          <p className="inline-flex items-center gap-1 text-sm italic text-foreground">
            <Quote size={14} />
            {quote}
          </p>
          {author ? (
            <p className="mt-2 text-xs text-muted">
              {author}
              {role ? `, ${role}` : ""}
            </p>
          ) : null}
        </blockquote>
      );
    }

    case ResourceBlockType.CALLOUT: {
      const title = toStringValue(content.title);
      const text = toStringValue(content.text) || toStringValue(content.body);
      const tone = toStringValue(content.tone).toLowerCase();

      const toneStyle =
        tone === "warning"
          ? {
              icon: <AlertTriangle size={14} className="text-amber-300" />,
              className: "border-amber-500/35 bg-amber-500/10"
            }
          : tone === "success"
            ? {
                icon: <CheckSquare size={14} className="text-emerald-300" />,
                className: "border-emerald-500/35 bg-emerald-500/10"
              }
            : {
                icon: <Info size={14} className="text-primary" />,
                className: "border-primary/35 bg-primary/10"
              };

      if (!title && !text) {
        return renderFallback();
      }

      return (
        <div className={`rounded-2xl border p-4 ${toneStyle.className}`}>
          <p className="inline-flex items-center gap-1 text-sm font-medium text-foreground">
            {toneStyle.icon}
            {title || "Callout"}
          </p>
          {text ? <p className="mt-1 text-sm text-muted">{text}</p> : null}
        </div>
      );
    }

    case ResourceBlockType.DOWNLOAD: {
      const url = toStringValue(content.url);
      const label = toStringValue(content.label) || "Download Resource";
      const description = toStringValue(content.description);
      const fileType = toStringValue(content.fileType);
      const fileSize = toStringValue(content.fileSize);

      if (!url) {
        return renderFallback();
      }

      return (
        <div className="rounded-2xl border border-border/85 bg-background/35 p-3">
          <a
            {...getExternalLinkProps(url)}
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <Download size={14} />
            {label}
          </a>
          {(description || fileType || fileSize) ? (
            <p className="mt-1 text-xs text-muted">
              {[description, fileType, fileSize].filter(Boolean).join(" | ")}
            </p>
          ) : null}
        </div>
      );
    }

    case ResourceBlockType.LINKS: {
      const singleUrl = toStringValue(content.url);
      const singleLabel = toStringValue(content.label) || singleUrl;
      const list = Array.isArray(content.items)
        ? content.items
        : Array.isArray(content.links)
          ? content.links
          : [];
      const links = list
        .map((item) => (isRecord(item) ? item : null))
        .filter(Boolean)
        .map((item) => ({
          url: toStringValue(item?.url),
          label: toStringValue(item?.label) || toStringValue(item?.url),
          description: toStringValue(item?.description)
        }))
        .filter((item) => item.url);

      if (singleUrl) {
        links.unshift({ url: singleUrl, label: singleLabel, description: "" });
      }

      if (!links.length) {
        return renderFallback();
      }

      return (
        <ul className="space-y-2">
          {links.map((link, index) => (
            <li
              key={`${block.id}-link-${index}`}
              className="rounded-2xl border border-border/80 bg-background/35 p-3"
            >
              <a
                {...getExternalLinkProps(link.url)}
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <Link2 size={13} />
                {link.label}
                <ExternalLink size={12} />
              </a>
              {link.description ? <p className="mt-1 text-xs text-muted">{link.description}</p> : null}
            </li>
          ))}
        </ul>
      );
    }

    default:
      return (
        <div className="rounded-xl border border-border bg-background/35 p-3">
          <p className="inline-flex items-center gap-1 text-sm text-muted">
            <ListChecks size={14} />
            Unsupported block type.
          </p>
        </div>
      );
  }
}
