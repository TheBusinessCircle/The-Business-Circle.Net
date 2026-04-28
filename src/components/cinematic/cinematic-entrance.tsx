"use client";

import {
  type CSSProperties,
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { ArrowRight } from "lucide-react";
import { BrandMark } from "@/components/branding/brand-mark";
import { cn } from "@/lib/utils";
import styles from "./cinematic-entrance.module.css";

const CINEMATIC_EXIT_MS = 900;
const REDUCED_MOTION_EXIT_MS = 0;

type EntranceState = "checking" | "visible" | "exiting" | "hidden";

export type CinematicEntranceConfig = {
  duration: number;
  ringSpeed: number;
  ringOpacity: number;
  particleDensity: number;
  textDelay: number;
  logoScaleIn: number;
  zoomOutEnd: number;
  storageKey: string;
  eyebrow: string;
  heading: string;
  subheading: string;
  primaryButtonLabel: string;
};

type CinematicEntranceProps = {
  config?: Partial<CinematicEntranceConfig>;
  className?: string;
  onComplete?: () => void;
  showSkip?: boolean;
};

type EntranceStyle = CSSProperties & {
  "--bcn-cinematic-duration": string;
  "--bcn-depth-duration": string;
  "--bcn-royal-duration": string;
  "--bcn-gold-duration": string;
  "--bcn-ring-speed": string;
  "--bcn-ring-middle-speed": string;
  "--bcn-ring-inner-speed": string;
  "--bcn-ring-opacity": string;
  "--bcn-ring-formation-opacity": string;
  "--bcn-ring-outer-opacity": string;
  "--bcn-ring-middle-opacity": string;
  "--bcn-ring-inner-opacity": string;
  "--bcn-ring-delay": string;
  "--bcn-logo-delay": string;
  "--bcn-logo-start-scale": string;
  "--bcn-text-delay": string;
  "--bcn-heading-delay": string;
  "--bcn-subheading-delay": string;
  "--bcn-button-delay": string;
  "--bcn-exit-scale": string;
};

type ParticleStyle = CSSProperties & {
  "--bcn-particle-left": string;
  "--bcn-particle-top": string;
  "--bcn-particle-size": string;
  "--bcn-particle-delay": string;
  "--bcn-particle-duration": string;
  "--bcn-particle-opacity": string;
  "--bcn-particle-drift-x": string;
};

type Particle = {
  left: number;
  top: number;
  size: number;
  delay: number;
  duration: number;
  opacity: number;
  driftX: number;
};

export const BCN_RULES_CINEMATIC_ENTRANCE_PRESET: CinematicEntranceConfig = {
  duration: 5600,
  ringSpeed: 34,
  ringOpacity: 0.76,
  particleDensity: 18,
  textDelay: 2450,
  logoScaleIn: 1.04,
  zoomOutEnd: 0.985,
  storageKey: "bcn_cinematic_seen",
  eyebrow: "THE BUSINESS CIRCLE NETWORK",
  heading: "You\u2019re in the right room.",
  subheading: "Every room has standards.\nThis is what protects this one.",
  primaryButtonLabel: "Enter the standards"
};

const PARTICLES: Particle[] = [
  { left: 8, top: 22, size: 1.4, delay: 0.25, duration: 10.8, opacity: 0.26, driftX: -10 },
  { left: 13, top: 58, size: 2.1, delay: 1.35, duration: 12.2, opacity: 0.34, driftX: 14 },
  { left: 19, top: 37, size: 1.7, delay: 0.9, duration: 11.4, opacity: 0.3, driftX: 8 },
  { left: 24, top: 78, size: 1.3, delay: 2.55, duration: 12.8, opacity: 0.24, driftX: -12 },
  { left: 31, top: 18, size: 2.4, delay: 1.65, duration: 10.2, opacity: 0.32, driftX: 10 },
  { left: 37, top: 64, size: 1.6, delay: 3.1, duration: 13.4, opacity: 0.28, driftX: -8 },
  { left: 43, top: 29, size: 1.2, delay: 0.6, duration: 12.6, opacity: 0.23, driftX: 12 },
  { left: 49, top: 83, size: 2, delay: 2.15, duration: 11.8, opacity: 0.31, driftX: -14 },
  { left: 55, top: 42, size: 1.5, delay: 1.05, duration: 10.9, opacity: 0.27, driftX: 9 },
  { left: 61, top: 69, size: 2.2, delay: 2.8, duration: 12.9, opacity: 0.33, driftX: -9 },
  { left: 67, top: 24, size: 1.6, delay: 0.45, duration: 11.6, opacity: 0.29, driftX: 13 },
  { left: 72, top: 51, size: 1.3, delay: 3.35, duration: 13.2, opacity: 0.24, driftX: -11 },
  { left: 78, top: 76, size: 1.9, delay: 1.85, duration: 10.7, opacity: 0.32, driftX: 8 },
  { left: 84, top: 34, size: 2.3, delay: 0.75, duration: 12.5, opacity: 0.36, driftX: -13 },
  { left: 90, top: 61, size: 1.4, delay: 2.35, duration: 11.2, opacity: 0.25, driftX: 11 },
  { left: 16, top: 47, size: 1, delay: 4.1, duration: 13.7, opacity: 0.2, driftX: 7 },
  { left: 29, top: 52, size: 1.2, delay: 3.65, duration: 12.4, opacity: 0.22, driftX: -7 },
  { left: 46, top: 16, size: 1.1, delay: 4.55, duration: 13.1, opacity: 0.2, driftX: 10 },
  { left: 64, top: 56, size: 1.2, delay: 3.85, duration: 12.7, opacity: 0.23, driftX: -10 },
  { left: 81, top: 18, size: 1, delay: 4.35, duration: 13.9, opacity: 0.21, driftX: 8 },
  { left: 6, top: 71, size: 1.1, delay: 5.1, duration: 14.2, opacity: 0.2, driftX: -9 },
  { left: 94, top: 43, size: 1.2, delay: 5.35, duration: 13.5, opacity: 0.22, driftX: 9 },
  { left: 52, top: 73, size: 1, delay: 4.75, duration: 14.6, opacity: 0.2, driftX: -8 },
  { left: 35, top: 88, size: 1.1, delay: 5.6, duration: 13.8, opacity: 0.19, driftX: 8 }
];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizeParticleCount(particleDensity: number) {
  if (!Number.isFinite(particleDensity)) {
    return BCN_RULES_CINEMATIC_ENTRANCE_PRESET.particleDensity;
  }

  if (particleDensity <= 1) {
    return clamp(Math.round(PARTICLES.length * particleDensity), 0, PARTICLES.length);
  }

  return clamp(Math.round(particleDensity), 0, PARTICLES.length);
}

function getParticleStyle(particle: Particle): ParticleStyle {
  return {
    "--bcn-particle-left": `${particle.left}%`,
    "--bcn-particle-top": `${particle.top}%`,
    "--bcn-particle-size": `${particle.size}px`,
    "--bcn-particle-delay": `${particle.delay}s`,
    "--bcn-particle-duration": `${particle.duration}s`,
    "--bcn-particle-opacity": `${particle.opacity}`,
    "--bcn-particle-drift-x": `${particle.driftX}px`
  };
}

function safelyMarkEntranceSeen(storageKey: string) {
  try {
    window.sessionStorage.setItem(storageKey, "true");
  } catch {
    // Storage can be unavailable; the entrance should still clear.
  }
}

function getEntranceStyle(config: CinematicEntranceConfig): EntranceStyle {
  const duration = Math.max(2600, config.duration);
  const ringSpeed = Math.max(18, config.ringSpeed);
  const ringOpacity = clamp(config.ringOpacity, 0, 1);
  const textDelay = Math.max(0, config.textDelay);
  const ringDelay = Math.max(320, textDelay - 1720);
  const logoDelay = Math.max(880, textDelay - 760);

  return {
    "--bcn-cinematic-duration": `${duration}ms`,
    "--bcn-depth-duration": `${duration * 1.9}ms`,
    "--bcn-royal-duration": `${duration * 2.35}ms`,
    "--bcn-gold-duration": `${duration * 2.65}ms`,
    "--bcn-ring-speed": `${ringSpeed}s`,
    "--bcn-ring-middle-speed": `${ringSpeed * 1.18}s`,
    "--bcn-ring-inner-speed": `${ringSpeed * 1.08}s`,
    "--bcn-ring-opacity": `${ringOpacity}`,
    "--bcn-ring-formation-opacity": `${ringOpacity * 0.94}`,
    "--bcn-ring-outer-opacity": `${ringOpacity * 0.92}`,
    "--bcn-ring-middle-opacity": `${ringOpacity * 0.82}`,
    "--bcn-ring-inner-opacity": `${ringOpacity * 0.76}`,
    "--bcn-ring-delay": `${ringDelay}ms`,
    "--bcn-logo-delay": `${logoDelay}ms`,
    "--bcn-logo-start-scale": `${clamp(config.logoScaleIn, 0.96, 1.12)}`,
    "--bcn-text-delay": `${textDelay}ms`,
    "--bcn-heading-delay": `${textDelay + 420}ms`,
    "--bcn-subheading-delay": `${textDelay + 820}ms`,
    "--bcn-button-delay": `${textDelay + 1260}ms`,
    "--bcn-exit-scale": `${clamp(config.zoomOutEnd, 0.94, 1)}`
  };
}

function renderMultilineCopy(copy: string) {
  return copy.split("\n").map((line, index, lines) => (
    <Fragment key={`${line}-${index}`}>
      {line}
      {index < lines.length - 1 ? <br /> : null}
    </Fragment>
  ));
}

export function CinematicEntrance({
  config,
  className,
  onComplete,
  showSkip = true
}: CinematicEntranceProps) {
  const entranceConfig = useMemo(
    () => ({
      ...BCN_RULES_CINEMATIC_ENTRANCE_PRESET,
      ...config
    }),
    [config]
  );
  const entranceStyle = useMemo(() => getEntranceStyle(entranceConfig), [entranceConfig]);
  const particles = useMemo(
    () => PARTICLES.slice(0, normalizeParticleCount(entranceConfig.particleDensity)),
    [entranceConfig.particleDensity]
  );
  const [entranceState, setEntranceState] = useState<EntranceState>("checking");
  const [reducedMotion, setReducedMotion] = useState(false);
  const exitTimeoutRef = useRef<number | null>(null);
  const isActive =
    entranceState === "checking" || entranceState === "visible" || entranceState === "exiting";

  const completeEntrance = useCallback(() => {
    setEntranceState((currentState) => {
      if (currentState === "exiting" || currentState === "hidden") {
        return currentState;
      }

      if (exitTimeoutRef.current) {
        window.clearTimeout(exitTimeoutRef.current);
      }

      exitTimeoutRef.current = window.setTimeout(
        () => {
          safelyMarkEntranceSeen(entranceConfig.storageKey);
          setEntranceState("hidden");
          onComplete?.();
        },
        reducedMotion ? REDUCED_MOTION_EXIT_MS : CINEMATIC_EXIT_MS
      );

      return "exiting";
    });
  }, [entranceConfig.storageKey, onComplete, reducedMotion]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    function handleMotionPreferenceChange(event: MediaQueryListEvent) {
      setReducedMotion(event.matches);
    }

    setReducedMotion(mediaQuery.matches);

    try {
      if (window.sessionStorage.getItem(entranceConfig.storageKey) === "true") {
        setEntranceState("hidden");
        return;
      }
    } catch {
      // If storage cannot be read, show the entrance for this visit.
    }

    setEntranceState("visible");
    mediaQuery.addEventListener("change", handleMotionPreferenceChange);

    return () => {
      mediaQuery.removeEventListener("change", handleMotionPreferenceChange);
    };
  }, [entranceConfig.storageKey]);

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
      if (exitTimeoutRef.current) {
        window.clearTimeout(exitTimeoutRef.current);
      }
    };
  }, []);

  if (entranceState === "hidden") {
    return null;
  }

  return (
    <section
      className={cn(
        styles.cinematicShell,
        entranceState === "exiting" && styles.cinematicShellExiting,
        className
      )}
      data-state={entranceState}
      data-motion={reducedMotion ? "reduced" : "cinematic"}
      style={entranceStyle}
      role="dialog"
      aria-modal="true"
      aria-labelledby="bcn-cinematic-entrance-title"
      aria-describedby="bcn-cinematic-entrance-description"
    >
      {showSkip ? (
        <button
          type="button"
          className={styles.skipButton}
          onClick={completeEntrance}
          disabled={entranceState === "exiting"}
        >
          Skip intro
        </button>
      ) : null}

      <div className={styles.atmosphere} aria-hidden="true">
        <span className={styles.depthWash} />
        <span className={styles.royalDrift} />
        <span className={styles.goldTemperature} />
        <span className={styles.floorReflection} />
        <span className={styles.cinematicVignette} />
        <div className={styles.particleField}>
          {particles.map((particle) => (
            <span
              key={`${particle.left}-${particle.top}`}
              className={styles.particle}
              style={getParticleStyle(particle)}
            />
          ))}
        </div>
      </div>

      <div className={styles.scene}>
        <div className={styles.ringStage} aria-hidden="true">
          <span className={cn(styles.ring, styles.ringOuter)} />
          <span className={cn(styles.ring, styles.ringMiddle)} />
          <span className={cn(styles.ring, styles.ringInner)} />
          <span className={styles.ringCore} />
          <span className={styles.ringHorizon} />
        </div>

        <div className={styles.identityLockup}>
          <div className={styles.logoStage}>
            <span className={styles.logoGlow} aria-hidden="true" />
            <BrandMark
              placement="hero"
              priority
              shine={!reducedMotion}
              className={styles.logoMark}
            />
            <span className={styles.logoSweep} aria-hidden="true" />
          </div>

          <div className={styles.copyStack}>
            <p className={styles.eyebrow}>{entranceConfig.eyebrow}</p>
            <h1 id="bcn-cinematic-entrance-title" className={styles.heading}>
              {entranceConfig.heading}
            </h1>
            <p id="bcn-cinematic-entrance-description" className={styles.subheading}>
              {renderMultilineCopy(entranceConfig.subheading)}
            </p>
            <button
              type="button"
              className={styles.enterButton}
              onClick={completeEntrance}
              disabled={entranceState === "exiting"}
            >
              {entranceConfig.primaryButtonLabel}
              <ArrowRight size={17} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
