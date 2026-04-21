import React, { type CSSProperties, type ReactNode } from "react";
import { resolveEmailAssetUrl } from "@/emails/assets";
import { BCN_EMAIL_FOOTER_NAME, BCN_EMAIL_THEME } from "@/emails/theme";

type BcnEmailLayoutProps = {
  previewText?: string;
  eyebrow?: string;
  heading: string;
  lead?: ReactNode;
  ctaLabel?: string;
  ctaUrl?: string;
  fallbackLabel?: string;
  fallbackUrl?: string;
  note?: ReactNode;
  children?: ReactNode;
  footerText?: string;
};

const styles = {
  root: {
    margin: 0,
    padding: "32px 16px",
    backgroundColor: BCN_EMAIL_THEME.background,
    color: BCN_EMAIL_THEME.heading,
    fontFamily: "Arial, sans-serif"
  } satisfies CSSProperties,
  preview: {
    display: "none",
    overflow: "hidden",
    lineHeight: "1px",
    opacity: 0,
    maxHeight: 0,
    maxWidth: 0
  } satisfies CSSProperties,
  outer: {
    margin: "0 auto",
    maxWidth: "560px"
  } satisfies CSSProperties,
  logoWrap: {
    marginBottom: "20px",
    textAlign: "center"
  } satisfies CSSProperties,
  logo: {
    display: "inline-block",
    width: "84px",
    height: "84px",
    borderRadius: "9999px",
    border: `1px solid ${BCN_EMAIL_THEME.cardBorder}`,
    backgroundColor: BCN_EMAIL_THEME.backgroundAccent,
    objectFit: "contain"
  } satisfies CSSProperties,
  card: {
    borderRadius: "28px",
    border: `1px solid ${BCN_EMAIL_THEME.cardBorder}`,
    background: `linear-gradient(180deg, ${BCN_EMAIL_THEME.cardBackgroundTop} 0%, ${BCN_EMAIL_THEME.cardBackgroundBottom} 100%)`,
    boxShadow: BCN_EMAIL_THEME.shadow,
    padding: "36px 28px"
  } satisfies CSSProperties,
  eyebrow: {
    margin: "0 0 14px",
    color: BCN_EMAIL_THEME.gold,
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.18em",
    textAlign: "center"
  } satisfies CSSProperties,
  heading: {
    margin: "0 0 14px",
    color: BCN_EMAIL_THEME.heading,
    fontSize: "32px",
    fontWeight: 700,
    lineHeight: 1.15,
    textAlign: "center"
  } satisfies CSSProperties,
  lead: {
    margin: "0 0 22px",
    color: BCN_EMAIL_THEME.muted,
    fontSize: "16px",
    lineHeight: 1.65,
    textAlign: "center"
  } satisfies CSSProperties,
  body: {
    margin: "0 0 16px",
    color: BCN_EMAIL_THEME.body,
    fontSize: "15px",
    lineHeight: 1.7
  } satisfies CSSProperties,
  ctaWrap: {
    margin: "10px 0 24px",
    textAlign: "center"
  } satisfies CSSProperties,
  cta: {
    display: "inline-block",
    borderRadius: "9999px",
    backgroundColor: BCN_EMAIL_THEME.gold,
    color: BCN_EMAIL_THEME.buttonText,
    fontSize: "16px",
    fontWeight: 700,
    lineHeight: 1,
    padding: "16px 28px",
    textDecoration: "none"
  } satisfies CSSProperties,
  panel: {
    borderRadius: "20px",
    border: `1px solid ${BCN_EMAIL_THEME.panelBorder}`,
    backgroundColor: BCN_EMAIL_THEME.panelBackground,
    padding: "18px 18px 16px",
    marginBottom: "18px"
  } satisfies CSSProperties,
  panelLabel: {
    margin: "0 0 10px",
    color: "#e2e8f0",
    fontSize: "13px",
    fontWeight: 700,
    letterSpacing: "0.08em"
  } satisfies CSSProperties,
  panelText: {
    margin: "0 0 10px",
    color: BCN_EMAIL_THEME.muted,
    fontSize: "14px",
    lineHeight: 1.6
  } satisfies CSSProperties,
  fallbackLinkWrap: {
    margin: 0,
    wordBreak: "break-all"
  } satisfies CSSProperties,
  fallbackLink: {
    color: BCN_EMAIL_THEME.gold,
    fontSize: "13px",
    lineHeight: 1.6,
    textDecoration: "underline"
  } satisfies CSSProperties,
  noteText: {
    margin: "0 0 6px",
    color: BCN_EMAIL_THEME.body,
    fontSize: "13px",
    lineHeight: 1.6,
    textAlign: "center"
  } satisfies CSSProperties,
  footer: {
    margin: "14px 0 0",
    color: BCN_EMAIL_THEME.footer,
    fontSize: "12px",
    lineHeight: 1.6,
    textAlign: "center"
  } satisfies CSSProperties,
  detailList: {
    margin: 0,
    padding: 0,
    listStyle: "none"
  } satisfies CSSProperties,
  detailItem: {
    margin: "0 0 10px",
    color: BCN_EMAIL_THEME.body,
    fontSize: "14px",
    lineHeight: 1.6
  } satisfies CSSProperties,
  detailLabel: {
    color: "#e2e8f0",
    fontWeight: 700
  } satisfies CSSProperties,
  messageBox: {
    margin: "0 0 18px",
    borderRadius: "18px",
    border: `1px solid ${BCN_EMAIL_THEME.panelBorder}`,
    backgroundColor: "rgba(2, 6, 23, 0.38)",
    padding: "16px",
    color: BCN_EMAIL_THEME.body,
    fontSize: "14px",
    lineHeight: 1.7,
    whiteSpace: "pre-wrap"
  } satisfies CSSProperties
};

export function BcnEmailLayout({
  previewText,
  eyebrow,
  heading,
  lead,
  ctaLabel,
  ctaUrl,
  fallbackLabel,
  fallbackUrl,
  note,
  children,
  footerText
}: BcnEmailLayoutProps) {
  const logoUrl = resolveEmailAssetUrl("/branding/the-business-circle-logo.webp");

  return (
    <div style={styles.root}>
      {previewText ? <div style={styles.preview}>{previewText}</div> : null}
      <div style={styles.outer}>
        <div style={styles.logoWrap}>
          <img
            src={logoUrl}
            alt={BCN_EMAIL_FOOTER_NAME}
            width="84"
            height="84"
            style={styles.logo}
          />
        </div>

        <div style={styles.card}>
          {eyebrow ? <p style={styles.eyebrow}>{eyebrow}</p> : null}
          <h1 style={styles.heading}>{heading}</h1>
          {lead ? <div style={styles.lead}>{lead}</div> : null}
          {children}

          {ctaLabel && ctaUrl ? (
            <div style={styles.ctaWrap}>
              <a href={ctaUrl} target="_blank" rel="noopener noreferrer" style={styles.cta}>
                {ctaLabel}
              </a>
            </div>
          ) : null}

          {fallbackUrl ? (
            <EmailPanel title={fallbackLabel || "If the button does not work"}>
              <EmailMutedText>Copy and paste the link below into your browser.</EmailMutedText>
              <p style={styles.fallbackLinkWrap}>
                <a
                  href={fallbackUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.fallbackLink}
                >
                  {fallbackUrl}
                </a>
              </p>
            </EmailPanel>
          ) : null}

          {note}

          <p style={styles.footer}>{footerText || BCN_EMAIL_FOOTER_NAME}</p>
        </div>
      </div>
    </div>
  );
}

export function EmailParagraph({ children }: { children: ReactNode }) {
  return <p style={styles.body}>{children}</p>;
}

export function EmailPanel({
  title,
  children
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div style={styles.panel}>
      <p style={styles.panelLabel}>{title}</p>
      {children}
    </div>
  );
}

export function EmailMutedText({ children }: { children: ReactNode }) {
  return <p style={styles.panelText}>{children}</p>;
}

export function EmailNote({ children }: { children: ReactNode }) {
  return <p style={styles.noteText}>{children}</p>;
}

export function EmailDetailsList({
  items
}: {
  items: Array<{ label: string; value: ReactNode }>;
}) {
  return (
    <ul style={styles.detailList}>
      {items.map((item) => (
        <li key={item.label} style={styles.detailItem}>
          <span style={styles.detailLabel}>{item.label}: </span>
          <span>{item.value}</span>
        </li>
      ))}
    </ul>
  );
}

export function EmailMessageBlock({ children }: { children: ReactNode }) {
  return <div style={styles.messageBox}>{children}</div>;
}
