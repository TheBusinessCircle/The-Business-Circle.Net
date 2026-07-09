export const circleCardPublicThemeClasses = {
  backgroundShell:
    "circle-card-public-theme cc-theme-background relative isolate min-h-dvh overflow-hidden [background:var(--cc-theme-page-bg)] [background-position:center] [background-size:cover]",
  heroShell:
    "cc-theme-hero relative overflow-hidden rounded-[2rem] border border-[color:var(--cc-theme-secondary-border)] bg-[image:var(--cc-theme-hero-bg)] p-5 shadow-[var(--cc-theme-hero-shadow)] sm:p-7",
  heroBadge:
    "cc-theme-badge inline-flex items-center gap-1.5 rounded-full border border-[color:var(--cc-theme-accent-badge-border)] bg-[var(--cc-theme-accent-badge-bg)] px-3 py-1.5 text-xs font-medium text-[hsl(var(--cc-theme-accent-hsl))] shadow-inner-surface",
  profileFrame:
    "cc-theme-avatar grid h-full w-full place-items-center overflow-hidden rounded-full border border-[color:var(--cc-theme-button-border)] bg-[image:var(--cc-theme-media-bg)] text-foreground shadow-[var(--cc-theme-profile-shadow)]",
  primaryButton:
    "cc-theme-button h-12 w-full rounded-2xl border border-[color:var(--cc-theme-button-border)] bg-[image:var(--cc-theme-button-bg)] text-[var(--cc-theme-button-text)] shadow-[var(--cc-theme-button-shadow)] hover:border-[color:var(--cc-theme-accent-badge-border)] hover:brightness-110",
  secondaryButton:
    "cc-theme-button h-12 w-full rounded-2xl border border-[color:var(--cc-theme-secondary-border)] bg-[var(--cc-theme-secondary-bg)] text-foreground shadow-[var(--cc-theme-secondary-shadow)] hover:border-[color:var(--cc-theme-button-border)] hover:bg-[var(--cc-theme-secondary-hover-bg)] hover:text-foreground",
  actionPanel:
    "cc-theme-action-panel rounded-[1.75rem] border border-[color:var(--cc-theme-secondary-border)] bg-[var(--cc-theme-section-bg)] p-4 shadow-[var(--cc-theme-secondary-shadow)] backdrop-blur sm:p-5",
  quickConnectCard:
    "cc-theme-quick-connect cc-theme-surface rounded-[1.75rem] border border-[color:var(--cc-theme-secondary-border)] bg-[var(--cc-theme-section-bg)] p-5 shadow-panel-soft",
  socialPill:
    "cc-theme-social-pill inline-flex min-h-12 max-w-full items-center gap-2 rounded-full border border-[color:var(--cc-theme-secondary-border)] bg-[var(--cc-theme-link-bg)] px-1.5 pr-3 text-left shadow-inner-surface backdrop-blur transition-all hover:-translate-y-0.5 hover:border-[color:var(--cc-theme-button-border)] hover:bg-[var(--cc-theme-secondary-hover-bg)]",
  sectionCard:
    "cc-theme-surface rounded-[1.75rem] border border-[color:var(--cc-theme-secondary-border)] bg-[var(--cc-theme-section-bg)] p-5 shadow-panel-soft sm:p-6",
  trustPanel:
    "cc-theme-trust-panel cc-theme-surface scroll-mt-24 overflow-hidden rounded-[1.75rem] border border-[color:var(--cc-theme-secondary-border)] bg-[var(--cc-theme-trust-bg)] p-5 shadow-panel-soft sm:p-6",
  qrPanel:
    "cc-theme-qr-panel cc-theme-surface relative overflow-hidden rounded-[1.75rem] border border-[color:var(--cc-theme-secondary-border)] bg-[var(--cc-theme-qr-bg)] p-4 shadow-[var(--cc-theme-hero-shadow)] sm:p-5",
  linkCard:
    "cc-theme-link-card rounded-2xl border border-[color:var(--cc-theme-secondary-border)] bg-[var(--cc-theme-link-bg)] shadow-[var(--cc-theme-secondary-shadow)]",
  iconSurface:
    "cc-theme-icon inline-flex shrink-0 items-center justify-center border border-[color:var(--cc-theme-accent-badge-border)] bg-[var(--cc-theme-icon-bg)] text-[hsl(var(--cc-theme-accent-hsl))]",
  divider:
    "cc-theme-divider pointer-events-none h-px bg-[image:var(--cc-theme-hero-line)]"
} as const;
