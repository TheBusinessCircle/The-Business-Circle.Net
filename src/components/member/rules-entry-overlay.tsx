"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import gsap from "gsap";
import { ArrowRight, Check, LockKeyhole, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type RulesEntryOverlayProps = {
  reviewHref: string;
};

export const RULES_ENTRY_FADE_OUT_MS = 520;

const BODY_COPY = [
  "The Business Circle Network is not designed to be another noisy feed.",
  "It is a structured environment for clearer thinking, better conversations, useful connections, and steady business progress.",
  "Inside, you will find rooms, resources, member profiles, discussions, and spaces designed to help business owners move with more clarity and less noise.",
  "But the strength of this network depends on the standard we protect together.",
  "Before you enter fully, please take a moment to read the BCN Rules."
] as const;

const TRUST_POINTS = [
  "Private business-owner environment",
  "Structured rooms and focused conversations",
  "Premium resources and practical insight",
  "Built around clarity, respect, and useful contribution"
] as const;

const STATUS_ITEMS = [
  "Rooms",
  "Resources",
  "Profiles",
  "Discussions"
] as const;

const premiumEase = [0.22, 1, 0.36, 1] as const;

export function RulesEntryOverlay({ reviewHref }: RulesEntryOverlayProps) {
  const router = useRouter();
  const reduceMotion = useReducedMotion() ?? false;
  const orbitStageRef = useRef<HTMLDivElement | null>(null);
  const orbitPrimaryRef = useRef<HTMLSpanElement | null>(null);
  const orbitSecondaryRef = useRef<HTMLSpanElement | null>(null);
  const orbitTertiaryRef = useRef<HTMLSpanElement | null>(null);
  const orbitGlowRef = useRef<HTMLSpanElement | null>(null);
  const beamRef = useRef<HTMLDivElement | null>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyTouchAction = document.body.style.touchAction;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.touchAction = previousBodyTouchAction;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  useEffect(() => {
    const orbitStage = orbitStageRef.current;
    const orbitPrimary = orbitPrimaryRef.current;
    const orbitSecondary = orbitSecondaryRef.current;
    const orbitTertiary = orbitTertiaryRef.current;
    const orbitGlow = orbitGlowRef.current;
    const beam = beamRef.current;

    if (
      reduceMotion ||
      !orbitStage ||
      !orbitPrimary ||
      !orbitSecondary ||
      !orbitTertiary ||
      !orbitGlow ||
      !beam
    ) {
      return;
    }

    const context = gsap.context(() => {
      const timeline = gsap.timeline({
        defaults: { ease: "sine.inOut" }
      });

      timeline
        .to(beam, { xPercent: 18, opacity: 0.78, duration: 13, repeat: -1, yoyo: true }, 0)
        .to(orbitStage, { yPercent: -2.5, duration: 11, repeat: -1, yoyo: true }, 0)
        .to(orbitPrimary, { rotateZ: 360, duration: 34, ease: "none", repeat: -1 }, 0)
        .to(orbitSecondary, { rotateZ: -336, duration: 42, ease: "none", repeat: -1 }, 0)
        .to(orbitTertiary, { rotateZ: 348, duration: 38, ease: "none", repeat: -1 }, 0)
        .to(orbitPrimary, { opacity: 0.84, duration: 8, repeat: -1, yoyo: true }, 0)
        .to(orbitSecondary, { opacity: 0.68, duration: 10, repeat: -1, yoyo: true }, 0)
        .to(orbitTertiary, { opacity: 0.62, duration: 9, repeat: -1, yoyo: true }, 0)
        .to(
          orbitGlow,
          {
            scale: 1.08,
            opacity: 0.7,
            duration: 9,
            repeat: -1,
            yoyo: true,
            transformOrigin: "50% 50%"
          },
          0
        );
    }, orbitStage);

    return () => {
      context.revert();
    };
  }, [reduceMotion]);

  function reviewRules() {
    if (leaving) {
      return;
    }

    setLeaving(true);
  }

  const overlayTransition = {
    duration: leaving ? RULES_ENTRY_FADE_OUT_MS / 1000 : reduceMotion ? 0.22 : 0.56,
    ease: premiumEase
  };

  const cardVariants = {
    hidden: reduceMotion
      ? { opacity: 0 }
      : { opacity: 0, y: 28, scale: 0.985, filter: "blur(12px)" },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: "blur(0px)",
      transition: {
        duration: reduceMotion ? 0.22 : 0.92,
        ease: premiumEase
      }
    },
    exit: reduceMotion
      ? {
          opacity: 0,
          transition: {
            duration: RULES_ENTRY_FADE_OUT_MS / 1000,
            ease: premiumEase
          }
        }
      : {
          opacity: 0,
          y: -12,
          scale: 0.992,
          filter: "blur(14px)",
          transition: {
            duration: RULES_ENTRY_FADE_OUT_MS / 1000,
            ease: premiumEase
          }
        }
  } as const;

  const groupVariants = {
    hidden: {},
    visible: {
      transition: {
        delayChildren: reduceMotion ? 0.04 : 0.14,
        staggerChildren: reduceMotion ? 0.035 : 0.09
      }
    },
    exit: {
      transition: {
        staggerChildren: 0.025,
        staggerDirection: -1
      }
    }
  } as const;

  const itemVariants = {
    hidden: reduceMotion
      ? { opacity: 0 }
      : { opacity: 0, y: 18, filter: "blur(8px)" },
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: {
        duration: reduceMotion ? 0.2 : 0.68,
        ease: premiumEase
      }
    },
    exit: reduceMotion
      ? {
          opacity: 0,
          transition: {
            duration: 0.16
          }
        }
      : {
          opacity: 0,
          y: -8,
          filter: "blur(8px)",
          transition: {
            duration: 0.22,
            ease: premiumEase
          }
        }
  } as const;

  return (
    <motion.div
      className="rules-entry-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rules-entry-title"
      aria-describedby="rules-entry-description"
      data-motion-mode={reduceMotion ? "reduced" : "cinematic"}
      initial={{ opacity: 0 }}
      animate={{ opacity: leaving ? 0 : 1 }}
      transition={overlayTransition}
    >
      <div className="rules-entry-backdrop" aria-hidden="true">
        <div ref={beamRef} className="rules-entry-beam" />
        <div className="rules-entry-grid" />
        <img
          src="/branding/the-business-circle-logo.webp"
          alt=""
          className="rules-entry-logo-ghost"
        />
      </div>

      <div ref={orbitStageRef} className="rules-entry-orbits" aria-hidden="true">
        <span ref={orbitPrimaryRef} className="rules-entry-orbit rules-entry-orbit-primary" />
        <span ref={orbitSecondaryRef} className="rules-entry-orbit rules-entry-orbit-secondary" />
        <span ref={orbitTertiaryRef} className="rules-entry-orbit rules-entry-orbit-tertiary" />
        <span ref={orbitGlowRef} className="rules-entry-orbit rules-entry-core-glow" />
      </div>

      <div className="rules-entry-scroll-shell">
        <AnimatePresence mode="wait" onExitComplete={() => router.push(reviewHref)}>
          {!leaving ? (
            <motion.section
              key="rules-entry-card"
              className="rules-entry-card"
              aria-label="Welcome to The Business Circle Network"
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <motion.div className="rules-entry-arrival" variants={groupVariants}>
                <motion.div className="rules-entry-main" variants={groupVariants}>
                  <motion.p className="rules-entry-eyebrow" variants={itemVariants}>
                    <span className="rules-entry-eyebrow-dot" aria-hidden="true" />
                    Welcome to The Business Circle Network
                  </motion.p>

                  <motion.h1 id="rules-entry-title" className="rules-entry-heading" variants={itemVariants}>
                    You are stepping into a private room built for serious business owners.
                  </motion.h1>

                  <motion.div
                    id="rules-entry-description"
                    className="rules-entry-copy-stack"
                    variants={groupVariants}
                  >
                    {BODY_COPY.map((copy, index) => (
                      <motion.p
                        key={copy}
                        className={index === 0 ? "rules-entry-copy rules-entry-copy-strong" : "rules-entry-copy"}
                        variants={itemVariants}
                      >
                        {copy}
                      </motion.p>
                    ))}
                  </motion.div>

                  <motion.div className="rules-entry-cta-row" variants={itemVariants}>
                    <motion.div
                      whileHover={reduceMotion ? undefined : { y: -2, scale: 1.01 }}
                      whileTap={reduceMotion ? undefined : { scale: 0.985, y: 0 }}
                      transition={{ duration: 0.2, ease: premiumEase }}
                      className="rules-entry-cta-wrap"
                    >
                      <Button
                        type="button"
                        size="lg"
                        className="rules-entry-button"
                        onClick={reviewRules}
                        disabled={leaving}
                        aria-label="Read The BCN Rules"
                        data-review-href={reviewHref}
                      >
                        Read The BCN Rules <ArrowRight size={17} aria-hidden="true" />
                      </Button>
                    </motion.div>
                    <p className="rules-entry-microcopy">
                      This protects the quality of the room for every member.
                    </p>
                  </motion.div>
                </motion.div>

                <motion.aside className="rules-entry-status-panel" variants={groupVariants}>
                  <motion.div className="rules-entry-status-header" variants={itemVariants}>
                    <span className="rules-entry-status-icon" aria-hidden="true">
                      <LockKeyhole size={18} />
                    </span>
                    <div>
                      <p className="rules-entry-status-label">Member entry</p>
                      <p className="rules-entry-status-value">Standard pending</p>
                    </div>
                  </motion.div>

                  <motion.div className="rules-entry-status-mark" variants={itemVariants} aria-hidden="true">
                    <img src="/branding/the-business-circle-logo.webp" alt="" />
                    <span />
                  </motion.div>

                  <motion.div className="rules-entry-trust-list" variants={groupVariants}>
                    {TRUST_POINTS.map((point) => (
                      <motion.div key={point} className="rules-entry-trust-item" variants={itemVariants}>
                        <span className="rules-entry-trust-check" aria-hidden="true">
                          <Check size={14} />
                        </span>
                        <span>{point}</span>
                      </motion.div>
                    ))}
                  </motion.div>

                  <motion.div className="rules-entry-room-grid" variants={groupVariants} aria-label="Network areas">
                    {STATUS_ITEMS.map((item) => (
                      <motion.div key={item} className="rules-entry-room-pill" variants={itemVariants}>
                        <Sparkles size={14} aria-hidden="true" />
                        <span>{item}</span>
                      </motion.div>
                    ))}
                  </motion.div>
                </motion.aside>
              </motion.div>
            </motion.section>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
