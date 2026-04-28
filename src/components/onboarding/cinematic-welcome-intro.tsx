"use client";

import {
  type CSSProperties,
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";
import { ArrowRight } from "lucide-react";
import { BrandMark } from "@/components/branding/brand-mark";
import styles from "./cinematic-welcome-intro.module.css";

const WELCOME_INTRO_STORAGE_KEY = "bcn_welcome_intro_seen";

// Timing lives here so the cinematic pacing can be tuned without digging through CSS.
const CINEMATIC_AUTO_REVEAL_MS = 6500;
const REDUCED_MOTION_AUTO_REVEAL_MS = 2800;
const INTRO_FADE_OUT_MS = 760;

type IntroState = "checking" | "visible" | "exiting" | "hidden";

type ParticleStyle = CSSProperties & {
  "--bcn-particle-left": string;
  "--bcn-particle-top": string;
  "--bcn-particle-size": string;
  "--bcn-particle-delay": string;
  "--bcn-particle-duration": string;
  "--bcn-particle-opacity": string;
};

type Particle = {
  left: number;
  top: number;
  size: number;
  delay: number;
  duration: number;
  opacity: number;
};

const INTRO_PARTICLES: Particle[] = [
  { left: 9, top: 21, size: 2, delay: 0.1, duration: 8.4, opacity: 0.42 },
  { left: 17, top: 68, size: 1.5, delay: 1.4, duration: 9.2, opacity: 0.32 },
  { left: 24, top: 34, size: 2.5, delay: 0.7, duration: 10.4, opacity: 0.38 },
  { left: 31, top: 83, size: 1.7, delay: 2.1, duration: 9.8, opacity: 0.26 },
  { left: 39, top: 16, size: 1.8, delay: 1.2, duration: 8.8, opacity: 0.3 },
  { left: 46, top: 73, size: 2.3, delay: 0.4, duration: 10.2, opacity: 0.36 },
  { left: 54, top: 27, size: 1.6, delay: 1.8, duration: 8.6, opacity: 0.28 },
  { left: 61, top: 61, size: 2.1, delay: 0.9, duration: 9.6, opacity: 0.34 },
  { left: 68, top: 18, size: 2.4, delay: 2.4, duration: 10.6, opacity: 0.36 },
  { left: 76, top: 77, size: 1.8, delay: 1.1, duration: 9.4, opacity: 0.3 },
  { left: 84, top: 39, size: 2.2, delay: 0.3, duration: 8.9, opacity: 0.42 },
  { left: 91, top: 64, size: 1.4, delay: 2.2, duration: 10.1, opacity: 0.26 },
  { left: 12, top: 49, size: 1.2, delay: 2.7, duration: 9.1, opacity: 0.24 },
  { left: 28, top: 58, size: 1.6, delay: 3.1, duration: 11.2, opacity: 0.28 },
  { left: 72, top: 51, size: 1.5, delay: 2.9, duration: 9.7, opacity: 0.3 },
  { left: 88, top: 23, size: 1.3, delay: 3.6, duration: 10.8, opacity: 0.25 }
];

function getParticleStyle(particle: Particle): ParticleStyle {
  return {
    "--bcn-particle-left": `${particle.left}%`,
    "--bcn-particle-top": `${particle.top}%`,
    "--bcn-particle-size": `${particle.size}px`,
    "--bcn-particle-delay": `${particle.delay}s`,
    "--bcn-particle-duration": `${particle.duration}s`,
    "--bcn-particle-opacity": `${particle.opacity}`
  };
}

function safelyMarkIntroSeen() {
  try {
    window.sessionStorage.setItem(WELCOME_INTRO_STORAGE_KEY, "true");
  } catch {
    // Storage can be blocked; the intro should still complete normally.
  }
}

export function CinematicWelcomeIntro() {
  const [introState, setIntroState] = useState<IntroState>("checking");
  const [reducedMotion, setReducedMotion] = useState(false);
  const fadeTimeoutRef = useRef<number | null>(null);
  const autoRevealTimeoutRef = useRef<number | null>(null);
  const isActive = introState === "checking" || introState === "visible" || introState === "exiting";

  const completeIntro = useCallback(() => {
    setIntroState((currentState) => {
      if (currentState === "exiting" || currentState === "hidden") {
        return currentState;
      }

      safelyMarkIntroSeen();

      if (fadeTimeoutRef.current) {
        window.clearTimeout(fadeTimeoutRef.current);
      }

      fadeTimeoutRef.current = window.setTimeout(() => {
        setIntroState("hidden");
      }, INTRO_FADE_OUT_MS);

      return "exiting";
    });
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    function handleMotionPreferenceChange(event: MediaQueryListEvent) {
      setReducedMotion(event.matches);
    }

    setReducedMotion(mediaQuery.matches);

    try {
      if (window.sessionStorage.getItem(WELCOME_INTRO_STORAGE_KEY) === "true") {
        setIntroState("hidden");
        return;
      }
    } catch {
      // Keep the intro available if sessionStorage cannot be read.
    }

    setIntroState("visible");

    mediaQuery.addEventListener("change", handleMotionPreferenceChange);

    return () => {
      mediaQuery.removeEventListener("change", handleMotionPreferenceChange);
    };
  }, []);

  useEffect(() => {
    if (introState !== "visible") {
      return;
    }

    if (autoRevealTimeoutRef.current) {
      window.clearTimeout(autoRevealTimeoutRef.current);
    }

    autoRevealTimeoutRef.current = window.setTimeout(
      completeIntro,
      reducedMotion ? REDUCED_MOTION_AUTO_REVEAL_MS : CINEMATIC_AUTO_REVEAL_MS
    );

    return () => {
      if (autoRevealTimeoutRef.current) {
        window.clearTimeout(autoRevealTimeoutRef.current);
      }
    };
  }, [completeIntro, introState, reducedMotion]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

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
  }, [isActive]);

  useEffect(() => {
    return () => {
      if (autoRevealTimeoutRef.current) {
        window.clearTimeout(autoRevealTimeoutRef.current);
      }

      if (fadeTimeoutRef.current) {
        window.clearTimeout(fadeTimeoutRef.current);
      }
    };
  }, []);

  if (introState === "hidden") {
    return null;
  }

  return (
    <section
      className={styles.cinematicWelcomeIntro}
      data-state={introState}
      data-motion={reducedMotion ? "reduced" : "cinematic"}
      role="dialog"
      aria-modal="true"
      aria-labelledby="bcn-welcome-intro-title"
      aria-describedby="bcn-welcome-intro-description"
    >
      <button
        type="button"
        className={styles.skipButton}
        onClick={completeIntro}
        disabled={introState === "exiting"}
      >
        Skip intro
      </button>

      <div className={styles.atmosphere} aria-hidden="true">
        <span className={styles.atmosphereLayerOne} />
        <span className={styles.atmosphereLayerTwo} />
        <span className={styles.lightSweep} />
        <span className={styles.reflectionPlane} />
        <span className={styles.vignette} />
        <div className={styles.particleField}>
          {INTRO_PARTICLES.map((particle) => (
            <span
              key={`${particle.left}-${particle.top}`}
              className={styles.particle}
              style={getParticleStyle(particle)}
            />
          ))}
        </div>
      </div>

      <div className={styles.scene}>
        <div className={styles.portalStage} aria-hidden="true">
          <span className={`${styles.portalRing} ${styles.portalRingOuter}`} />
          <span className={`${styles.portalRing} ${styles.portalRingMiddle}`} />
          <span className={`${styles.portalRing} ${styles.portalRingInner}`} />
          <span className={styles.portalAperture} />
        </div>

        <div className={styles.logoStage}>
          <BrandMark
            placement="hero"
            priority
            shine={!reducedMotion}
            className={styles.logoMark}
          />
        </div>

        <div className={styles.copyPanel}>
          <p className={styles.eyebrow}>WELCOME TO THE BUSINESS CIRCLE NETWORK</p>
          <h1 id="bcn-welcome-intro-title" className={styles.heading}>
            You&apos;re in the right room.
          </h1>
          <p id="bcn-welcome-intro-description" className={styles.supportingText}>
            Before entering, take a moment to understand the standards that protect the room, the
            people inside it, and the quality of every conversation.
          </p>
          <button
            type="button"
            className={styles.enterButton}
            onClick={completeIntro}
            disabled={introState === "exiting"}
          >
            Enter the standards
            <ArrowRight size={17} aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}
