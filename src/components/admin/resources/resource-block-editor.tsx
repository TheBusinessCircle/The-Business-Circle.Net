"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  RESOURCE_BLOCK_TYPES,
  type ResourceBlockType
} from "@/config/resources";

export type ResourceEditorBlockInput = {
  id?: string;
  type: ResourceBlockType;
  heading?: string | null;
  section?: string;
  content: Record<string, unknown>;
};

type ResourceBlockEditorProps = {
  initialBlocks: ResourceEditorBlockInput[];
  inputName?: string;
};

type EditableBlock = {
  clientId: string;
  id?: string;
  type: ResourceBlockType;
  heading: string;
  section: string;
  content: Record<string, unknown>;
};

const SECTION_OPTIONS = [
  { value: "overview", label: "Overview" },
  { value: "who-it-helps", label: "Who It Helps" },
  { value: "when-to-use-it", label: "When to Use It" },
  { value: "key-questions", label: "Key Questions" },
  { value: "implementation-notes", label: "Implementation Notes" },
  { value: "common-mistakes", label: "Common Mistakes" },
  { value: "action-steps", label: "Action Steps" },
  { value: "tools-frameworks", label: "Tools / Frameworks" },
  { value: "key-takeaways", label: "Key Takeaways" },
  { value: "related-resources", label: "Related Resources" },
  { value: "custom", label: "Custom" }
] as const;

const BLOCK_TYPE_LABELS: Record<ResourceBlockType, string> = {
  TEXT: "Text",
  CHECKLIST: "Checklist",
  STEPS: "Numbered Steps",
  IMAGE: "Image",
  VIDEO: "Video",
  QUOTE: "Quote",
  CALLOUT: "Callout",
  DOWNLOAD: "Download",
  LINKS: "Link"
};

function createClientId() {
  return `block-${Math.random().toString(36).slice(2, 10)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function stringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === "string" ? entry : String(entry)))
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [];
}

function defaultContentForType(type: ResourceBlockType): Record<string, unknown> {
  switch (type) {
    case "CHECKLIST":
      return { items: [] };
    case "STEPS":
      return { steps: [] };
    case "IMAGE":
      return { url: "", alt: "", caption: "" };
    case "VIDEO":
      return { url: "", title: "", caption: "" };
    case "QUOTE":
      return { quote: "", author: "", role: "" };
    case "CALLOUT":
      return { title: "", text: "", tone: "info" };
    case "DOWNLOAD":
      return { url: "", label: "", description: "", fileType: "", fileSize: "" };
    case "LINKS":
      return { items: [] };
    case "TEXT":
    default:
      return { text: "" };
  }
}

function linksToMultiline(content: Record<string, unknown>): string {
  const items = Array.isArray(content.items) ? content.items : [];
  return items
    .map((item) => {
      if (!isRecord(item)) {
        return "";
      }
      const label = stringValue(item.label);
      const url = stringValue(item.url);
      const description = stringValue(item.description);
      if (!url) {
        return "";
      }
      return [label, url, description].join(" | ");
    })
    .filter(Boolean)
    .join("\n");
}

function multilineToLinks(value: string): Array<Record<string, string>> {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [labelRaw = "", urlRaw = "", descriptionRaw = ""] = line.split("|");
      const label = labelRaw.trim();
      const url = urlRaw.trim();
      const description = descriptionRaw.trim();
      return {
        label: label || url,
        url,
        description
      };
    })
    .filter((item) => item.url);
}

function toEditableBlocks(initialBlocks: ResourceEditorBlockInput[]): EditableBlock[] {
  return initialBlocks.map((block) => {
    const content = isRecord(block.content) ? block.content : {};
    return {
      clientId: createClientId(),
      id: block.id,
      type: block.type,
      heading: block.heading || "",
      section: stringValue(content.section || block.section) || "overview",
      content
    };
  });
}

export function ResourceBlockEditor({
  initialBlocks,
  inputName = "blocksPayload"
}: ResourceBlockEditorProps) {
  const [blocks, setBlocks] = useState<EditableBlock[]>(() =>
    toEditableBlocks(initialBlocks)
  );
  const [newBlockType, setNewBlockType] = useState<ResourceBlockType>("TEXT");

  const serializedBlocks = useMemo(
    () =>
      JSON.stringify(
        blocks.map((block) => ({
          id: block.id,
          type: block.type,
          heading: block.heading.trim() || null,
          section: block.section,
          content: {
            ...block.content,
            section: block.section
          }
        }))
      ),
    [blocks]
  );

  function addBlock() {
    setBlocks((current) => [
      ...current,
      {
        clientId: createClientId(),
        type: newBlockType,
        heading: "",
        section: "overview",
        content: defaultContentForType(newBlockType)
      }
    ]);
  }

  function removeBlock(clientId: string) {
    setBlocks((current) => current.filter((block) => block.clientId !== clientId));
  }

  function moveBlock(clientId: string, direction: -1 | 1) {
    setBlocks((current) => {
      const index = current.findIndex((block) => block.clientId === clientId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }

      const clone = [...current];
      const [item] = clone.splice(index, 1);
      clone.splice(nextIndex, 0, item);
      return clone;
    });
  }

  function updateBlock(
    clientId: string,
    updater: (previous: EditableBlock) => EditableBlock
  ) {
    setBlocks((current) =>
      current.map((block) =>
        block.clientId === clientId ? updater(block) : block
      )
    );
  }

  function updateBlockContent(
    clientId: string,
    updater: (content: Record<string, unknown>) => Record<string, unknown>
  ) {
    updateBlock(clientId, (block) => ({
      ...block,
      content: updater(block.content)
    }));
  }

  return (
    <div className="space-y-4">
      <input type="hidden" name={inputName} value={serializedBlocks} />

      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-border p-3">
        <div className="space-y-1">
          <Label htmlFor="new-block-type">Add Block</Label>
          <Select
            id="new-block-type"
            value={newBlockType}
            onChange={(event) =>
              setNewBlockType(event.target.value as ResourceBlockType)
            }
          >
            {RESOURCE_BLOCK_TYPES.map((type) => (
              <option key={type} value={type}>
                {BLOCK_TYPE_LABELS[type]}
              </option>
            ))}
          </Select>
        </div>
        <Button type="button" variant="outline" onClick={addBlock}>
          <Plus size={14} className="mr-1" />
          Add Block
        </Button>
      </div>

      <div className="space-y-3">
        {blocks.map((block, index) => {
          const typeLabel = BLOCK_TYPE_LABELS[block.type];
          const textareaId = `${block.clientId}-content`;

          return (
            <div
              key={block.clientId}
              className="space-y-3 rounded-xl border border-border/80 bg-background/35 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">
                  Block {index + 1} - {typeLabel}
                </p>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => moveBlock(block.clientId, -1)}
                    disabled={index === 0}
                  >
                    <ArrowUp size={13} />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => moveBlock(block.clientId, 1)}
                    disabled={index === blocks.length - 1}
                  >
                    <ArrowDown size={13} />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="danger"
                    onClick={() => removeBlock(block.clientId)}
                  >
                    <Trash2 size={13} />
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1">
                  <Label>Type</Label>
                  <Select
                    value={block.type}
                    onChange={(event) =>
                      updateBlock(block.clientId, (current) => ({
                        ...current,
                        type: event.target.value as ResourceBlockType,
                        content: defaultContentForType(
                          event.target.value as ResourceBlockType
                        )
                      }))
                    }
                  >
                    {RESOURCE_BLOCK_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {BLOCK_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Section</Label>
                  <Select
                    value={block.section}
                    onChange={(event) =>
                      updateBlock(block.clientId, (current) => ({
                        ...current,
                        section: event.target.value
                      }))
                    }
                  >
                    {SECTION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Heading (optional)</Label>
                  <Input
                    value={block.heading}
                    onChange={(event) =>
                      updateBlock(block.clientId, (current) => ({
                        ...current,
                        heading: event.target.value
                      }))
                    }
                    placeholder="Section heading"
                  />
                </div>
              </div>

              {block.type === "TEXT" ? (
                <div className="space-y-1">
                  <Label htmlFor={textareaId}>Text</Label>
                  <Textarea
                    id={textareaId}
                    rows={5}
                    value={
                      stringValue(block.content.text) ||
                      stringValue(block.content.body)
                    }
                    onChange={(event) =>
                      updateBlockContent(block.clientId, (content) => ({
                        ...content,
                        text: event.target.value
                      }))
                    }
                  />
                </div>
              ) : null}

              {block.type === "CHECKLIST" ? (
                <div className="space-y-1">
                  <Label htmlFor={textareaId}>Checklist Items (one per line)</Label>
                  <Textarea
                    id={textareaId}
                    rows={5}
                    value={stringArray(block.content.items).join("\n")}
                    onChange={(event) =>
                      updateBlockContent(block.clientId, (content) => ({
                        ...content,
                        items: event.target.value
                          .split("\n")
                          .map((item) => item.trim())
                          .filter(Boolean)
                      }))
                    }
                  />
                </div>
              ) : null}

              {block.type === "STEPS" ? (
                <div className="space-y-1">
                  <Label htmlFor={textareaId}>Numbered Steps (one per line)</Label>
                  <Textarea
                    id={textareaId}
                    rows={5}
                    value={stringArray(block.content.steps || block.content.items).join("\n")}
                    onChange={(event) =>
                      updateBlockContent(block.clientId, (content) => ({
                        ...content,
                        steps: event.target.value
                          .split("\n")
                          .map((item) => item.trim())
                          .filter(Boolean)
                      }))
                    }
                  />
                </div>
              ) : null}

              {block.type === "IMAGE" ? (
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-1 md:col-span-3">
                    <Label>Image URL</Label>
                    <Input
                      value={stringValue(block.content.url)}
                      onChange={(event) =>
                        updateBlockContent(block.clientId, (content) => ({
                          ...content,
                          url: event.target.value
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Alt Text</Label>
                    <Input
                      value={stringValue(block.content.alt)}
                      onChange={(event) =>
                        updateBlockContent(block.clientId, (content) => ({
                          ...content,
                          alt: event.target.value
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label>Caption</Label>
                    <Input
                      value={stringValue(block.content.caption)}
                      onChange={(event) =>
                        updateBlockContent(block.clientId, (content) => ({
                          ...content,
                          caption: event.target.value
                        }))
                      }
                    />
                  </div>
                </div>
              ) : null}

              {block.type === "VIDEO" ? (
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-1 md:col-span-3">
                    <Label>Video URL</Label>
                    <Input
                      value={stringValue(block.content.url)}
                      onChange={(event) =>
                        updateBlockContent(block.clientId, (content) => ({
                          ...content,
                          url: event.target.value
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Title</Label>
                    <Input
                      value={stringValue(block.content.title)}
                      onChange={(event) =>
                        updateBlockContent(block.clientId, (content) => ({
                          ...content,
                          title: event.target.value
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label>Caption</Label>
                    <Input
                      value={stringValue(block.content.caption)}
                      onChange={(event) =>
                        updateBlockContent(block.clientId, (content) => ({
                          ...content,
                          caption: event.target.value
                        }))
                      }
                    />
                  </div>
                </div>
              ) : null}

              {block.type === "QUOTE" ? (
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-1 md:col-span-3">
                    <Label>Quote</Label>
                    <Textarea
                      rows={4}
                      value={
                        stringValue(block.content.quote) ||
                        stringValue(block.content.text)
                      }
                      onChange={(event) =>
                        updateBlockContent(block.clientId, (content) => ({
                          ...content,
                          quote: event.target.value
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Author</Label>
                    <Input
                      value={stringValue(block.content.author)}
                      onChange={(event) =>
                        updateBlockContent(block.clientId, (content) => ({
                          ...content,
                          author: event.target.value
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label>Role / Context</Label>
                    <Input
                      value={stringValue(block.content.role)}
                      onChange={(event) =>
                        updateBlockContent(block.clientId, (content) => ({
                          ...content,
                          role: event.target.value
                        }))
                      }
                    />
                  </div>
                </div>
              ) : null}

              {block.type === "CALLOUT" ? (
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-1">
                    <Label>Tone</Label>
                    <Select
                      value={stringValue(block.content.tone) || "info"}
                      onChange={(event) =>
                        updateBlockContent(block.clientId, (content) => ({
                          ...content,
                          tone: event.target.value
                        }))
                      }
                    >
                      <option value="info">Info</option>
                      <option value="warning">Warning</option>
                      <option value="success">Success</option>
                    </Select>
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label>Title</Label>
                    <Input
                      value={stringValue(block.content.title)}
                      onChange={(event) =>
                        updateBlockContent(block.clientId, (content) => ({
                          ...content,
                          title: event.target.value
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1 md:col-span-3">
                    <Label>Message</Label>
                    <Textarea
                      rows={4}
                      value={
                        stringValue(block.content.text) ||
                        stringValue(block.content.body)
                      }
                      onChange={(event) =>
                        updateBlockContent(block.clientId, (content) => ({
                          ...content,
                          text: event.target.value
                        }))
                      }
                    />
                  </div>
                </div>
              ) : null}

              {block.type === "DOWNLOAD" ? (
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-1 md:col-span-3">
                    <Label>Download URL</Label>
                    <Input
                      value={stringValue(block.content.url)}
                      onChange={(event) =>
                        updateBlockContent(block.clientId, (content) => ({
                          ...content,
                          url: event.target.value
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Label</Label>
                    <Input
                      value={stringValue(block.content.label)}
                      onChange={(event) =>
                        updateBlockContent(block.clientId, (content) => ({
                          ...content,
                          label: event.target.value
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>File Type</Label>
                    <Input
                      value={stringValue(block.content.fileType)}
                      onChange={(event) =>
                        updateBlockContent(block.clientId, (content) => ({
                          ...content,
                          fileType: event.target.value
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>File Size</Label>
                    <Input
                      value={stringValue(block.content.fileSize)}
                      onChange={(event) =>
                        updateBlockContent(block.clientId, (content) => ({
                          ...content,
                          fileSize: event.target.value
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1 md:col-span-3">
                    <Label>Description</Label>
                    <Textarea
                      rows={3}
                      value={stringValue(block.content.description)}
                      onChange={(event) =>
                        updateBlockContent(block.clientId, (content) => ({
                          ...content,
                          description: event.target.value
                        }))
                      }
                    />
                  </div>
                </div>
              ) : null}

              {block.type === "LINKS" ? (
                <div className="space-y-1">
                  <Label htmlFor={textareaId}>
                    Links (one per line: Label | URL | Description)
                  </Label>
                  <Textarea
                    id={textareaId}
                    rows={5}
                    value={linksToMultiline(block.content)}
                    onChange={(event) =>
                      updateBlockContent(block.clientId, (content) => ({
                        ...content,
                        items: multilineToLinks(event.target.value)
                      }))
                    }
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {!blocks.length ? (
        <p className="text-sm text-muted">
          No blocks added yet. Start with a text block and build from there.
        </p>
      ) : null}
    </div>
  );
}
