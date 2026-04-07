"use client";

import Link from "next/link";
import { type PointerEvent as ReactPointerEvent, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { safeRedirectPath } from "@/lib/auth/utils";
import { cn } from "@/lib/utils";
import styles from "./join-cinematic-entry.module.css";

type MembershipTier = "FOUNDATION" | "INNER_CIRCLE" | "CORE";

type JoinCinematicEntryProps = {
  initialSelectedTier: MembershipTier;
  from?: string;
  inviteCode?: string;
  error?: string;
  billing?: string;
};

type JoinNotice = {
  tone: "gold" | "muted";
  text: string;
};

type JoinHandoff = {
  from?: string;
  inviteCode?: string;
};

const portalEase = [0.2, 0.72, 0.18, 1] as const;
const joinHandoffStorageKey = "business-circle:join-handoff";

const tierLabels: Record<MembershipTier, string> = {
  FOUNDATION: "Foundation",
  INNER_CIRCLE: "Inner Circle",
  CORE: "Core"
};

function normalizeInviteCode(inviteCode?: string) {
  const normalized = inviteCode?.trim().toUpperCase();
  return normalized || undefined;
}

function withFrom(pathname: string, from?: string) {
  const safeFrom = from ? safeRedirectPath(from, "") : "";

  if (!safeFrom) {
    return pathname;
  }

  const url = new URL(pathname, "http://localhost");
  url.searchParams.set("from", safeFrom);
  return `${url.pathname}${url.search}`;
}

function isMembershipPath(pathname?: string) {
  const safePath = pathname ? safeRedirectPath(pathname, "") : "";
  return safePath.startsWith("/membership");
}

function readJoinHandoff(): JoinHandoff {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.sessionStorage.getItem(joinHandoffStorageKey);

    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as JoinHandoff;
    const safeFrom = parsed.from ? safeRedirectPath(parsed.from, "") : "";

    return {
      from: safeFrom || undefined,
      inviteCode: normalizeInviteCode(parsed.inviteCode)
    };
  } catch {
    return {};
  }
}

function writeJoinHandoff(value: JoinHandoff) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (!value.from && !value.inviteCode) {
      window.sessionStorage.removeItem(joinHandoffStorageKey);
      return;
    }

    window.sessionStorage.setItem(joinHandoffStorageKey, JSON.stringify(value));
  } catch {
    // Ignore storage failures and keep the join path functional.
  }
}

function buildMembershipHref({
  tier,
  billing,
  from
}: {
  tier: MembershipTier;
  billing?: string;
  from?: string;
}) {
  const url = new URL("/membership", "http://localhost");

  url.searchParams.set("tier", tier);

  if (billing === "cancelled") {
    url.searchParams.set("billing", billing);
  }

  const safeFrom = from ? safeRedirectPath(from, "") : "";

  if (safeFrom) {
    url.searchParams.set("from", safeFrom);
  }

  return `${url.pathname}${url.search}`;
}

export function JoinCinematicEntry({
  initialSelectedTier,
  from,
  inviteCode,
  error,
  billing
}: JoinCinematicEntryProps) {
  const reduceMotion = useReducedMotion();
  const portalX = useMotionValue(0);
  const portalY = useMotionValue(0);
  const springX = useSpring(portalX, { stiffness: 120, damping: 22, mass: 0.45 });
  const springY = useSpring(portalY, { stiffness: 120, damping: 22, mass: 0.45 });
  const [portalOpened, setPortalOpened] = useState(false);
  const [resolvedContext, setResolvedContext] = useState<JoinHandoff>({
    from: from ? safeRedirectPath(from, "") || undefined : undefined,
    inviteCode: normalizeInviteCode(inviteCode)
  });

  const initialFrom = useMemo(() => {
    const safeFrom = from ? safeRedirectPath(from, "") : "";
    return safeFrom || undefined;
  }, [from]);

  const initialInvite = useMemo(() => normalizeInviteCode(inviteCode), [inviteCode]);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const shellElements = Array.from(document.querySelectorAll<HTMLElement>("header, footer"));
    const shellSnapshots = shellElements.map((element) => ({
      element,
      display: element.style.display,
      ariaHidden: element.getAttribute("aria-hidden"),
      inert: element.inert
    }));

    document.body.style.overflow = "hidden";
    shellElements.forEach((element) => {
      element.style.display = "none";
      element.setAttribute("aria-hidden", "true");
      element.inert = true;
    });

    return () => {
      document.body.style.overflow = originalOverflow;
      shellSnapshots.forEach(({ element, display, ariaHidden, inert }) => {
        element.style.display = display;
        element.inert = inert;

        if (ariaHidden === null) {
          element.removeAttribute("aria-hidden");
        } else {
          element.setAttribute("aria-hidden", ariaHidden);
        }
      });
    };
  }, []);

  useEffect(() => {
    const storedContext = readJoinHandoff();
    const shouldRestoreStoredContext = billing === "cancelled" || isMembershipPath(initialFrom);
    const nextContext = shouldRestoreStoredContext
      ? {
          from: storedContext.from ?? initialFrom,
          inviteCode: initialInvite ?? storedContext.inviteCode
        }
      : {
          from: initialFrom,
          inviteCode: initialInvite
        };

    setResolvedContext(nextContext);
    writeJoinHandoff(nextContext);
  }, [billing, initialFrom, initialInvite]);

  const membershipHref = useMemo(
    () =>
      buildMembershipHref({
        tier: initialSelectedTier,
        billing,
        from: resolvedContext.from
      }),
    [billing, initialSelectedTier, resolvedContext.from]
  );

  const loginHref = useMemo(() => withFrom("/login", resolvedContext.from), [resolvedContext.from]);

  const joinFootnote = useMemo(
    () => `Membership opens on the existing page with ${tierLabels[initialSelectedTier]} already in focus.`,
    [initialSelectedTier]
  );

  const notices = useMemo(() => {
    const nextNotices: JoinNotice[] = [];

    if (error === "suspended") {
      nextNotices.push({
        tone: "gold",
        text: "Your account is currently suspended. Sign in or contact support to reactivate access."
      });
    }

    if (billing === "cancelled") {
      nextNotices.push({
        tone: "muted",
        text: "Stripe checkout was cancelled. You can continue into membership again from here."
      });
    }

    if (resolvedContext.inviteCode) {
      nextNotices.push({
        tone: "gold",
        text: `Member invite ${resolvedContext.inviteCode} is attached to this path.`
      });
    }

    return nextNotices;
  }, [billing, error, resolvedContext.inviteCode]);

  const handlePortalMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (reduceMotion || portalOpened) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;

    portalX.set(x * 24);
    portalY.set(y * 24);
  };

  const resetPortalPosition = () => {
    portalX.set(0);
    portalY.set(0);
  };

  const handlePortalOpen = () => {
    resetPortalPosition();
    setPortalOpened(true);
  };

  const handleJoinChoice = () => {
    writeJoinHandoff(resolvedContext);
  };

  return (
    <div className={`${styles.route} joinCinematicRoute`} aria-label="Join The Business Circle">
      <div className={styles.ambientLayer} aria-hidden="true">
        <video
          className={styles.cityVideo}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/branding/the-business-circle-logo.webp"
        >
          <source src="/branding/join-hero-atmosphere.mp4" type="video/mp4" />
        </video>
        <div className={styles.cityVeil} />
        <div className={styles.particleField} />
        <div className={styles.orbitalField} />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {!portalOpened ? (
          <motion.section
            key="arrival"
            className={cn(styles.scene, styles.arrivalScene)}
            initial={{ opacity: 0, backgroundColor: "#000" }}
            animate={{ opacity: 1, backgroundColor: "rgba(0,0,0,0)" }}
            exit={
              reduceMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 1.03, filter: "blur(12px)" }
            }
            transition={{ duration: reduceMotion ? 0.3 : 0.95, ease: portalEase }}
          >
            <div className={styles.arrivalInner}>
              <div className={styles.arrivalCopy}>
                <motion.h1
                  className={styles.brandLine}
                  initial={{ opacity: 0, y: 24, filter: "blur(16px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ delay: reduceMotion ? 0 : 0.24, duration: 1.15, ease: portalEase }}
                >
                  The Business Circle
                </motion.h1>
                <motion.p
                  className={styles.leadLine}
                  initial={{ opacity: 0, y: 20, filter: "blur(12px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ delay: reduceMotion ? 0 : 0.9, duration: 0.9, ease: portalEase }}
                >
                  Not every room is worth entering.
                </motion.p>
                <motion.p
                  className={styles.supportingLine}
                  initial={{ opacity: 0, y: 18, filter: "blur(10px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ delay: reduceMotion ? 0 : 1.4, duration: 0.9, ease: portalEase }}
                >
                  This one is built for business owners moving with intent.
                </motion.p>
              </div>

              <motion.div
                className={styles.portalStage}
                initial={{ opacity: 0, y: 24, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: reduceMotion ? 0 : 2.05, duration: 1.1, ease: portalEase }}
              >
                <div className={styles.portalShadow} aria-hidden="true" />
                <motion.button
                  type="button"
                  className={styles.portalButton}
                  aria-label="Step inside The Business Circle"
                  data-opened={portalOpened}
                  style={{ x: springX, y: springY }}
                  whileHover={reduceMotion ? undefined : { scale: 1.018, rotateX: -2 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.988 }}
                  exit={
                    reduceMotion
                      ? { opacity: 0 }
                      : { opacity: 0, scale: 1.16, filter: "blur(18px)" }
                  }
                  transition={{ duration: reduceMotion ? 0.24 : 0.78, ease: portalEase }}
                  onPointerMove={handlePortalMove}
                  onPointerLeave={resetPortalPosition}
                  onClick={handlePortalOpen}
                >
                  <span className={styles.portalRing} aria-hidden="true" />
                  <span className={styles.portalInnerRing} aria-hidden="true" />
                  <span className={styles.portalCore} aria-hidden="true" />
                  <span className={styles.portalSweep} aria-hidden="true" />
                  <span className={styles.portalLabel}>Step inside</span>
                </motion.button>
              </motion.div>
            </div>
          </motion.section>
        ) : (
          <motion.section
            key="choices"
            className={cn(styles.scene, styles.choiceScene)}
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.985, y: 28 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.2 : 0.9, ease: portalEase }}
          >
            <div className={styles.choiceShell}>
              <motion.header
                className={styles.choiceHeader}
                initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: reduceMotion ? 0 : 0.12, duration: 0.76, ease: portalEase }}
              >
                <span className={styles.kicker}>Entry Point</span>
                <h2 className={styles.choiceTitle}>Choose your path</h2>
                <p className={styles.choiceCopy}>
                  Start by exploring the world behind The Business Circle, or move straight into
                  membership and choose how you join.
                </p>
              </motion.header>

              {notices.length ? (
                <motion.div
                  className={styles.noticeStack}
                  initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: reduceMotion ? 0 : 0.2, duration: 0.72, ease: portalEase }}
                >
                  {notices.map((notice) => (
                    <p
                      key={notice.text}
                      className={cn(
                        styles.notice,
                        notice.tone === "muted" ? styles.mutedNotice : ""
                      )}
                    >
                      {notice.text}
                    </p>
                  ))}
                </motion.div>
              ) : null}

              <div className={styles.choiceGrid}>
                <motion.div
                  className={styles.choiceColumn}
                  initial={reduceMotion ? false : { opacity: 0, x: -24 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: reduceMotion ? 0 : 0.28, duration: 0.82, ease: portalEase }}
                >
                  <Link href="/" className={styles.choicePanel}>
                    <span className={styles.choiceIndex}>01</span>
                    <span className={styles.choiceOrbit} aria-hidden="true" />
                    <div className={styles.choiceContent}>
                      <div className={styles.choiceHeadingBlock}>
                        <span className={styles.choiceEyebrow}>Public site</span>
                        <h3 className={styles.choiceHeading}>Explore The Business Circle</h3>
                        <p className={styles.choiceDescription}>
                          See what it is, why it exists, and what it is building.
                        </p>
                      </div>

                      <div className={styles.choiceMeta}>
                        <span className={styles.choiceAction}>
                          Enter the homepage
                          <ArrowRight size={15} />
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.div>

                <motion.div
                  className={styles.choiceColumn}
                  initial={reduceMotion ? false : { opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: reduceMotion ? 0 : 0.38, duration: 0.82, ease: portalEase }}
                >
                  <Link
                    href={membershipHref}
                    className={cn(styles.choicePanel, styles.joinChoicePanel)}
                    onClick={handleJoinChoice}
                  >
                    <span className={styles.choiceIndex}>02</span>
                    <span className={styles.choiceOrbit} aria-hidden="true" />
                    <div className={styles.choiceContent}>
                      <div className={styles.choiceHeadingBlock}>
                        <span className={styles.choiceEyebrow}>Membership</span>
                        <h3 className={styles.choiceHeading}>Join The Circle</h3>
                        <p className={styles.choiceDescription}>
                          Go straight to membership and choose the path that fits you best.
                        </p>
                      </div>

                      <div className={styles.choiceMeta}>
                        <span className={styles.choiceFootnote}>{joinFootnote}</span>
                        <span className={styles.choiceAction}>
                          Continue to membership
                          <ArrowRight size={15} />
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              </div>

              <motion.footer
                className={styles.choiceFooter}
                initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: reduceMotion ? 0 : 0.5, duration: 0.72, ease: portalEase }}
              >
                <Link href={loginHref} className={styles.signInLink}>
                  Already a member? Sign in
                </Link>
                <div className={styles.footerLinks}>
                  <Link href="/privacy-policy">Privacy</Link>
                  <span aria-hidden="true">/</span>
                  <Link href="/terms-of-service">Terms</Link>
                </div>
              </motion.footer>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
