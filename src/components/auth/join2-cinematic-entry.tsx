"use client";

import Link from "next/link";
import {
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { ArrowRight } from "lucide-react";
import {
  JOIN2_FALLBACK_TIMEOUT_MS,
  JOIN2_HANDOFF_STORAGE_KEY,
  buildJoin2ActionHrefs,
  isJoin2ActivationKey,
  isJoin2MembershipPath,
  normalizeJoin2InviteCode,
  sanitizeJoin2From,
  type Join2BillingInterval,
  type Join2MembershipTier,
  type Join2SceneStage
} from "@/lib/join/cinematic-entry";
import styles from "./join2-cinematic-entry.module.css";

type Join2CinematicEntryProps = {
  initialSelectedTier: Join2MembershipTier;
  billingInterval: Join2BillingInterval;
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

type PortalStyleVars = CSSProperties & {
  "--join2-portal-left": string;
  "--join2-portal-top": string;
  "--join2-portal-size": string;
};

const portalEase = [0.2, 0.72, 0.18, 1] as const;
const portalTarget = {
  centerX: 0.506,
  centerY: 0.465,
  diameter: 0.734
} as const;

const tierLabels: Record<Join2MembershipTier, string> = {
  FOUNDATION: "Foundation",
  INNER_CIRCLE: "Inner Circle",
  CORE: "Core"
};

function readJoinHandoff(): JoinHandoff {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.sessionStorage.getItem(JOIN2_HANDOFF_STORAGE_KEY);

    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as JoinHandoff;
    const safeFrom = sanitizeJoin2From(parsed.from);

    return {
      from: safeFrom,
      inviteCode: normalizeJoin2InviteCode(parsed.inviteCode)
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
      window.sessionStorage.removeItem(JOIN2_HANDOFF_STORAGE_KEY);
      return;
    }

    window.sessionStorage.setItem(JOIN2_HANDOFF_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Ignore storage failures and keep the membership path working.
  }
}

export function Join2CinematicEntry({
  initialSelectedTier,
  billingInterval,
  from,
  inviteCode,
  error,
  billing
}: Join2CinematicEntryProps) {
  const reduceMotion = useReducedMotion();
  const routeRef = useRef<HTMLDivElement | null>(null);
  const heroFrameRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const transitionTimerRef = useRef<number | null>(null);
  const portalStyleCacheRef = useRef<string>("");
  const portalX = useMotionValue(0);
  const portalY = useMotionValue(0);
  const springX = useSpring(portalX, { stiffness: 118, damping: 24, mass: 0.44 });
  const springY = useSpring(portalY, { stiffness: 118, damping: 24, mass: 0.44 });
  const [sceneStage, setSceneStage] = useState<Join2SceneStage>("intro");
  const [portalReady, setPortalReady] = useState(Boolean(reduceMotion));
  const [portalStyleVars, setPortalStyleVars] = useState<PortalStyleVars>(() => ({
    "--join2-portal-left": "50.6%",
    "--join2-portal-top": "46.5%",
    "--join2-portal-size": "73.4%"
  }));
  const [resolvedContext, setResolvedContext] = useState<JoinHandoff>({
    from: sanitizeJoin2From(from),
    inviteCode: normalizeJoin2InviteCode(inviteCode)
  });

  const initialFrom = useMemo(() => sanitizeJoin2From(from), [from]);

  const initialInvite = useMemo(() => normalizeJoin2InviteCode(inviteCode), [inviteCode]);

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
    const shouldRestoreStoredContext = billing === "cancelled" || isJoin2MembershipPath(initialFrom);
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

  useEffect(() => {
    if (error) {
      setPortalReady(true);
    }
  }, [error]);

  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    void video.play().catch(() => {
      // Muted inline autoplay can still be blocked in some browsers.
      setPortalReady(true);
    });
  }, []);

  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    const markVideoFallback = () => {
      setPortalReady(true);
    };

    video.addEventListener("error", markVideoFallback);
    video.addEventListener("stalled", markVideoFallback);

    return () => {
      video.removeEventListener("error", markVideoFallback);
      video.removeEventListener("stalled", markVideoFallback);
    };
  }, []);

  useEffect(() => {
    const heroFrame = heroFrameRef.current;

    if (!heroFrame) {
      return;
    }

    const video = videoRef.current;
    let rafId = 0;

    const syncPortalGeometry = () => {
      const frame = heroFrameRef.current;

      if (!frame) {
        return;
      }

      const frameWidth = frame.clientWidth;
      const frameHeight = frame.clientHeight;

      if (!frameWidth || !frameHeight) {
        return;
      }

      const video = videoRef.current;
      const sourceWidth = video?.videoWidth || 720;
      const sourceHeight = video?.videoHeight || 1280;
      const frameAspect = frameWidth / frameHeight;
      const sourceAspect = sourceWidth / sourceHeight;

      let renderedWidth = frameWidth;
      let renderedHeight = frameHeight;
      let offsetX = 0;
      let offsetY = 0;

      if (sourceAspect > frameAspect) {
        renderedHeight = frameHeight;
        renderedWidth = frameHeight * sourceAspect;
        offsetX = (frameWidth - renderedWidth) / 2;
      } else {
        renderedWidth = frameWidth;
        renderedHeight = frameWidth / sourceAspect;
        offsetY = (frameHeight - renderedHeight) / 2;
      }

      const left = offsetX + renderedWidth * portalTarget.centerX;
      const top = offsetY + renderedHeight * portalTarget.centerY;
      const size = renderedWidth * portalTarget.diameter;
      const nextCacheKey = `${left.toFixed(2)}|${top.toFixed(2)}|${size.toFixed(2)}`;

      if (nextCacheKey === portalStyleCacheRef.current) {
        return;
      }

      portalStyleCacheRef.current = nextCacheKey;
      setPortalStyleVars({
        "--join2-portal-left": `${left}px`,
        "--join2-portal-top": `${top}px`,
        "--join2-portal-size": `${size}px`
      });
    };

    const scheduleSync = () => {
      window.cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(syncPortalGeometry);
    };

    scheduleSync();

    const resizeObserver =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => scheduleSync());

    resizeObserver?.observe(heroFrame);
    window.addEventListener("resize", scheduleSync);
    video?.addEventListener("loadedmetadata", scheduleSync);
    video?.addEventListener("loadeddata", scheduleSync);

    return () => {
      window.cancelAnimationFrame(rafId);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", scheduleSync);
      video?.removeEventListener("loadedmetadata", scheduleSync);
      video?.removeEventListener("loadeddata", scheduleSync);
    };
  }, []);

  useEffect(() => {
    if (reduceMotion || portalReady) {
      setPortalReady(true);
      return;
    }

    let active = true;

    const markReady = () => {
      if (!active) {
        return;
      }

      setPortalReady(true);
    };

    const syncPortalReadiness = () => {
      const video = videoRef.current;

      if (!video) {
        return;
      }

      if (video.ended) {
        markReady();
        return;
      }

      if (Number.isFinite(video.duration) && video.duration > 0) {
        const revealThreshold = Math.max(video.duration - 0.14, video.duration * 0.94);

        if (video.currentTime >= revealThreshold) {
          markReady();
        }
      }
    };

    const handleMetadata = () => {
      const video = videoRef.current;

      if (!video || !Number.isFinite(video.duration) || video.duration <= 0) {
        return;
      }

      const msUntilReveal = Math.max((video.duration - 0.14) * 1000, 3600);

      if (readinessTimer) {
        window.clearTimeout(readinessTimer);
      }
      readinessTimer = window.setTimeout(markReady, msUntilReveal);
      syncPortalReadiness();
    };

    let readinessTimer: number | null = null;
    const pollTimer = window.setInterval(syncPortalReadiness, 200);
    const video = videoRef.current;

    video?.addEventListener("loadedmetadata", handleMetadata);
    video?.addEventListener("timeupdate", syncPortalReadiness);
    video?.addEventListener("ended", markReady, { once: true });
    syncPortalReadiness();

    return () => {
      active = false;
      if (readinessTimer) {
        window.clearTimeout(readinessTimer);
      }
      window.clearInterval(pollTimer);
      video?.removeEventListener("loadedmetadata", handleMetadata);
      video?.removeEventListener("timeupdate", syncPortalReadiness);
      video?.removeEventListener("ended", markReady);
    };
  }, [portalReady, reduceMotion]);

  useEffect(() => {
    if (portalReady || sceneStage !== "intro") {
      return;
    }

    const fallbackTimer = window.setTimeout(() => {
      setPortalReady(true);
    }, JOIN2_FALLBACK_TIMEOUT_MS);

    return () => window.clearTimeout(fallbackTimer);
  }, [portalReady, sceneStage]);

  useEffect(
    () => () => {
      if (transitionTimerRef.current) {
        window.clearTimeout(transitionTimerRef.current);
      }
    },
    []
  );

  const actionHrefs = useMemo(
    () =>
      buildJoin2ActionHrefs({
        tier: initialSelectedTier,
        billingInterval,
        billing,
        from: resolvedContext.from,
        inviteCode: resolvedContext.inviteCode
      }),
    [billing, billingInterval, initialSelectedTier, resolvedContext.from, resolvedContext.inviteCode]
  );

  const joinFootnote = useMemo(
    () => `Join opens with ${tierLabels[initialSelectedTier]} already selected.`,
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
    if (reduceMotion || sceneStage !== "intro") {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;

    portalX.set(x * 10);
    portalY.set(y * 10);
  };

  const resetPortalPosition = () => {
    portalX.set(0);
    portalY.set(0);
  };

  const handlePortalOpen = () => {
    if (!portalReady || sceneStage !== "intro") {
      return;
    }

    resetPortalPosition();
    setSceneStage("entering");

    transitionTimerRef.current = window.setTimeout(
      () => setSceneStage("choices"),
      reduceMotion ? 160 : 1120
    );
  };

  const handlePortalKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (!isJoin2ActivationKey(event.key)) {
      return;
    }

    event.preventDefault();
    handlePortalOpen();
  };

  const handleJoinChoice = () => {
    writeJoinHandoff(resolvedContext);
  };

  return (
    <div
      ref={routeRef}
      className={`${styles.route} join2CinematicRoute`}
      aria-label="Join The Business Circle alternative entry"
      data-scene={sceneStage}
      data-portal-ready={portalReady}
    >
      <div className={styles.ambientLayer} aria-hidden="true">
        <div className={styles.backdropImage} />
        <div className={styles.backdropImageVeil} />
        <div className={styles.orbitField} />
        <div className={styles.ambientHaze} />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {sceneStage !== "choices" ? (
          <motion.section
            key="intro-scene"
            className={styles.heroScene}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.25 : 0.65, ease: portalEase }}
          >
            <motion.div
              className={styles.heroStage}
              style={{
                ...portalStyleVars,
                transformOrigin: `${portalStyleVars["--join2-portal-left"]} ${portalStyleVars["--join2-portal-top"]}`
              }}
              initial={false}
              animate={
                sceneStage === "entering"
                  ? {
                      opacity: 0.12,
                      scale: 1.36,
                      y: -26,
                      filter: "blur(20px)"
                    }
                  : {
                      opacity: 1,
                      scale: 1,
                      y: 0,
                      filter: "blur(0px)"
                    }
              }
              transition={{ duration: reduceMotion ? 0.26 : 1.08, ease: portalEase }}
            >
              <div ref={heroFrameRef} className={styles.heroFrame}>
                <div className={styles.heroMedia}>
                  <video
                    ref={videoRef}
                    className={styles.heroVideo}
                    autoPlay
                    muted
                    playsInline
                    preload="auto"
                    poster="/branding/the-business-circle-logo.webp"
                    aria-hidden="true"
                  >
                    <source src="/branding/join-hero-atmosphere.mp4" type="video/mp4" />
                  </video>

                  <motion.div
                    className={styles.heroVideoVeil}
                    aria-hidden="true"
                    initial={false}
                    animate={
                      sceneStage === "entering"
                        ? { opacity: 0.18, scale: 1.06 }
                        : { opacity: 1, scale: 1 }
                    }
                    transition={{ duration: reduceMotion ? 0.26 : 1.08, ease: portalEase }}
                  />
                </div>

                <div className={styles.heroFrameBorder} aria-hidden="true" />
                <div className={styles.heroFrameGlow} aria-hidden="true" />

                <motion.div
                  className={styles.waterCopy}
                  initial={reduceMotion ? false : { opacity: 0, y: 16, filter: "blur(10px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ delay: reduceMotion ? 0 : 0.38, duration: 0.96, ease: portalEase }}
                >
                  <p className={styles.copyLead}>Not every room is worth entering.</p>
                  <p className={styles.copySupport}>
                    This one is built for business owners moving with intent.
                  </p>
                </motion.div>

                <div className={styles.portalAnchor}>
                  <motion.div
                    className={styles.portalAssembly}
                    initial={false}
                    animate={
                      sceneStage === "entering"
                        ? { opacity: 1, scale: 1.04 }
                        : portalReady
                          ? { opacity: 1, scale: 1 }
                          : { opacity: 0, scale: 0.94 }
                    }
                    transition={{ duration: reduceMotion ? 0.2 : 0.76, ease: portalEase }}
                  >
                    <span className={styles.portalCharge} aria-hidden="true" />
                    <span className={styles.portalShadow} aria-hidden="true" />
                    <motion.button
                      type="button"
                      className={styles.portalButton}
                      aria-label="Step inside The Business Circle"
                      aria-disabled={!portalReady || sceneStage !== "intro"}
                      data-entering={sceneStage === "entering"}
                      disabled={!portalReady || sceneStage !== "intro"}
                      style={{ x: springX, y: springY }}
                      whileHover={reduceMotion || !portalReady ? undefined : { scale: 1.01 }}
                      whileTap={reduceMotion || !portalReady ? undefined : { scale: 0.994 }}
                      transition={{ duration: 0.3, ease: portalEase }}
                      onPointerMove={handlePortalMove}
                      onPointerLeave={resetPortalPosition}
                      onClick={handlePortalOpen}
                      onKeyDown={handlePortalKeyDown}
                    >
                      <span className={styles.portalRing} aria-hidden="true" />
                      <span className={styles.portalInnerRing} aria-hidden="true" />
                      <span className={styles.portalCore} aria-hidden="true" />
                      <span className={styles.portalSweep} aria-hidden="true" />
                      <span className={styles.portalLabel}>Step inside</span>
                    </motion.button>
                  </motion.div>
                </div>

                <motion.div
                  className={styles.warpBloom}
                  aria-hidden="true"
                  initial={false}
                  animate={
                    sceneStage === "entering"
                      ? {
                          opacity: [0, 0.3, 0.72],
                          scale: [0.92, 1.02, 1.44]
                        }
                      : {
                          opacity: 0,
                          scale: 0.92
                        }
                  }
                  transition={{ duration: reduceMotion ? 0.26 : 1.02, ease: portalEase }}
                />

              </div>
            </motion.div>
          </motion.section>
        ) : (
          <motion.section
            key="choice-scene"
            className={styles.choiceScene}
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.975, y: 28 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.24 : 0.94, ease: portalEase }}
          >
            <div className={styles.choiceShell}>
              <motion.header
                className={styles.choiceHeader}
                initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: reduceMotion ? 0 : 0.08, duration: 0.76, ease: portalEase }}
              >
                <h2 className={styles.choiceTitle}>Choose your path</h2>
                <p className={styles.choiceCopy}>
                  Explore the public side of The Business Circle first, or move straight into join if you already know your room.
                </p>
              </motion.header>

              {notices.length ? (
                <motion.div
                  className={styles.noticeStack}
                  initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: reduceMotion ? 0 : 0.16, duration: 0.72, ease: portalEase }}
                >
                  {notices.map((notice) => (
                    <p
                      key={notice.text}
                      className={
                        notice.tone === "muted" ? `${styles.notice} ${styles.mutedNotice}` : styles.notice
                      }
                    >
                      {notice.text}
                    </p>
                  ))}
                </motion.div>
              ) : null}

              <div className={styles.pathGrid}>
                <motion.div
                  initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: reduceMotion ? 0 : 0.22, duration: 0.82, ease: portalEase }}
                >
                  <Link
                    href={actionHrefs.publicSiteHref}
                    className={`${styles.pathway} ${styles.pathwayExplore}`}
                  >
                    <span className={styles.pathwayIndex}>01</span>
                    <span className={styles.pathwayOrbit} aria-hidden="true" />
                    <div className={styles.pathwayBody}>
                      <span className={styles.pathwayEyebrow}>Public site</span>
                      <h3 className={styles.pathwayTitle}>Explore The Business Circle</h3>
                      <p className={styles.pathwayDescription}>
                        Enter the non-member side of the site, starting with the homepage and the wider public sections.
                      </p>
                    </div>
                    <span className={styles.pathwayAction}>
                      Enter the homepage
                      <ArrowRight size={15} />
                    </span>
                  </Link>
                </motion.div>

                <motion.div
                  initial={reduceMotion ? false : { opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: reduceMotion ? 0 : 0.32, duration: 0.88, ease: portalEase }}
                >
                  <Link
                    href={actionHrefs.joinHref}
                    className={`${styles.pathway} ${styles.pathwayJoin}`}
                    onClick={handleJoinChoice}
                  >
                    <span className={styles.pathwayIndex}>02</span>
                    <span className={styles.pathwayOrbit} aria-hidden="true" />
                    <div className={styles.pathwayBody}>
                      <span className={styles.pathwayEyebrow}>Direct route</span>
                      <h3 className={styles.pathwayTitle}>Go straight to join</h3>
                      <p className={styles.pathwayDescription}>
                        Enter the sign-up and pricing confirmation page with your selection already in place.
                      </p>
                    </div>
                    <div className={styles.pathwayMeta}>
                      <span className={styles.pathwayFootnote}>{joinFootnote}</span>
                      <span className={styles.pathwayAction}>
                        Continue to join
                        <ArrowRight size={15} />
                      </span>
                    </div>
                  </Link>
                </motion.div>
              </div>

              <motion.footer
                className={styles.choiceFooter}
                initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: reduceMotion ? 0 : 0.42, duration: 0.72, ease: portalEase }}
              >
                <Link href={actionHrefs.loginHref} className={styles.signInLink}>
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
