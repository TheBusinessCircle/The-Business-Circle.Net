"use client";

import { useEffect } from "react";

type CircleCardFirstCardFormHelperProps = {
  formId: string;
  draftKey: string;
  clearDraft?: boolean;
};

const DRAFT_FIELDS = ["fullName", "businessName", "slug", "cardType", "accountType"] as const;

function slugifyDraftValue(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function readNamedField(form: HTMLFormElement, name: string) {
  return form.elements.namedItem(name);
}

function readFieldValue(form: HTMLFormElement, name: string) {
  const field = readNamedField(form, name);

  if (field instanceof RadioNodeList) {
    return field.value;
  }

  return field instanceof HTMLInputElement || field instanceof HTMLSelectElement
    ? field.value
    : "";
}

function writeFieldValue(form: HTMLFormElement, name: string, value: string) {
  const field = readNamedField(form, name);

  if (field instanceof RadioNodeList) {
    Array.from(field).forEach((item) => {
      if (item instanceof HTMLInputElement && item.type === "radio") {
        item.checked = item.value === value;
      }
    });
    return;
  }

  if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement) {
    field.value = value;
  }
}

export function CircleCardFirstCardFormHelper({
  formId,
  draftKey,
  clearDraft = false
}: CircleCardFirstCardFormHelperProps) {
  useEffect(() => {
    if (clearDraft) {
      try {
        window.localStorage.removeItem(draftKey);
      } catch {
        // Draft storage is a local convenience only.
      }
    }
  }, [clearDraft, draftKey]);

  useEffect(() => {
    const form = document.getElementById(formId);

    if (!(form instanceof HTMLFormElement)) {
      return undefined;
    }

    const firstCardForm = form;

    try {
      const rawDraft = window.localStorage.getItem(draftKey);
      const draft = rawDraft ? (JSON.parse(rawDraft) as Record<string, string>) : null;

      if (draft) {
        DRAFT_FIELDS.forEach((field) => {
          if (draft[field] && !readFieldValue(firstCardForm, field)) {
            writeFieldValue(firstCardForm, field, draft[field]);
          }
        });
      }
    } catch {
      // Ignore invalid local drafts.
    }

    const fullName = readNamedField(firstCardForm, "fullName");
    const businessName = readNamedField(firstCardForm, "businessName");
    const slug = readNamedField(firstCardForm, "slug");

    function persistDraft() {
      try {
        const draft = Object.fromEntries(
          DRAFT_FIELDS.map((field) => [field, readFieldValue(firstCardForm, field)])
        );
        window.localStorage.setItem(draftKey, JSON.stringify(draft));
      } catch {
        // Draft storage is a local convenience only.
      }
    }

    function suggestSlug() {
      if (!(slug instanceof HTMLInputElement) || slug.value.trim()) {
        return;
      }

      const base =
        readFieldValue(firstCardForm, "businessName") || readFieldValue(firstCardForm, "fullName");
      const suggestion = slugifyDraftValue(base);

      if (suggestion) {
        slug.value = suggestion;
        persistDraft();
      }
    }

    function handleInvalid(event: Event) {
      const target = event.target;

      if (target instanceof HTMLElement) {
        target.scrollIntoView({ block: "center", behavior: "smooth" });
        target.focus();
      }
    }

    function handleSubmit() {
      suggestSlug();
      persistDraft();
    }

    firstCardForm.addEventListener("input", persistDraft);
    firstCardForm.addEventListener("change", persistDraft);
    firstCardForm.addEventListener("submit", handleSubmit);
    firstCardForm.addEventListener("invalid", handleInvalid, true);

    if (fullName instanceof HTMLInputElement) {
      fullName.addEventListener("blur", suggestSlug);
    }

    if (businessName instanceof HTMLInputElement) {
      businessName.addEventListener("blur", suggestSlug);
    }

    return () => {
      firstCardForm.removeEventListener("input", persistDraft);
      firstCardForm.removeEventListener("change", persistDraft);
      firstCardForm.removeEventListener("submit", handleSubmit);
      firstCardForm.removeEventListener("invalid", handleInvalid, true);

      if (fullName instanceof HTMLInputElement) {
        fullName.removeEventListener("blur", suggestSlug);
      }

      if (businessName instanceof HTMLInputElement) {
        businessName.removeEventListener("blur", suggestSlug);
      }
    };
  }, [draftKey, formId]);

  return null;
}
