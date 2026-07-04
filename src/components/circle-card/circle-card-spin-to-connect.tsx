"use client";

import Link from "next/link";
import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState
} from "react";
import {
  ArrowRight,
  CheckCircle2,
  LogIn,
  Sparkles,
  UserPlus,
  WalletCards,
  X
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { CircleCardSpinActivationGuide } from "@/components/circle-card/circle-card-spin-activation-guide";
import { trackCircleCardEvent } from "@/lib/circle-card/analytics-client";
import { shouldSuppressCircleCardPlatformOwnerSandboxEvent } from "@/lib/circle-card/platform-owner-sandbox";
import { cn } from "@/lib/utils";

export type CircleCardSpinState = "return" | "connected" | "first" | "already";

type SpinToConnectAction = (formData: FormData) => void | Promise<void>;

type CircleCardSpinToConnectProps = {
  cardId: string;
  analyticsCardId?: string;
  cardSlug: string;
  cardName: string;
  publicPath: string;
  isDemo: boolean;
  isAuthenticated: boolean;
  viewerIsOwner: boolean;
  viewerHasCircleCard: boolean;
  isConnected: boolean;
  connectionCount?: number | null;
  initialState?: CircleCardSpinState | null;
  connectAction: SpinToConnectAction;
  className?: string;
  showAmbientRing?: boolean;
  children: ReactNode;
};

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  startedAt: number;
  lastX: number;
  lastAt: number;
  deltaX: number;
  velocityX: number;
  moved: boolean;
};

type SpinConfig = {
  id: number;
  direction: 1 | -1;
  duration: number;
  totalDegrees: number;
  strength: number;
  reduced: boolean;
};

type SignatureSpinStyle = CSSProperties & {
  "--cc-spin-stage-one": string;
  "--cc-spin-stage-two": string;
  "--cc-spin-stage-three": string;
  "--cc-spin-overshoot": string;
  "--cc-spin-settle": string;
  "--cc-spin-end": string;
  "--cc-spin-duration": string;
  "--cc-drag-y": string;
};

const SPIN_DRAG_THRESHOLD = 24;
const SPIN_CHARGE_DELAY_MS = 90;
const SPIN_BASE_DURATION_MS = 1080;
const SPIN_MAX_DURATION_MS = 1460;
const PARTICLE_COUNT = 10;
const SPIN_TO_CONNECT_LABEL = "Spin To Connect";
const SPIN_INTERACTION_STORAGE_KEY = "circle-card:spin-to-connect:has-interacted";

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function trackSpinEvent(
  cardId: string | undefined,
  eventType:
    | "SPIN_STARTED"
    | "SPIN_COMPLETED"
    | "SPIN_ALREADY_CONNECTED"
    | "SPIN_REQUIRES_ACCOUNT",
  metadata: Record<string, unknown>
) {
  if (!cardId) {
    return;
  }

  trackCircleCardEvent({
    cardId,
    eventType,
    metadata
  });
}

function withSpinReturn(path: string) {
  const url = new URL(path, "http://localhost");
  url.searchParams.set("spin", "return");
  return `${url.pathname}${url.search}${url.hash}`;
}

function captureSpinReferralAttribution(input: {
  cardSlug: string;
  isDemo: boolean;
  viewerIsOwner: boolean;
}) {
  if (
    input.isDemo ||
    input.viewerIsOwner ||
    shouldSuppressCircleCardPlatformOwnerSandboxEvent("referral")
  ) {
    return;
  }

  void fetch("/api/circle-card/referral-attribution", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      sourceType: "spin_to_connect",
      sourceCardSlug: input.cardSlug,
      sourceEvent: "SPIN_COMPLETED"
    }),
    keepalive: true
  }).catch(() => undefined);
}

export function CircleCardSpinToConnect({
  cardId,
  analyticsCardId,
  cardSlug,
  cardName,
  publicPath,
  isDemo,
  isAuthenticated,
  viewerIsOwner,
  viewerHasCircleCard,
  isConnected,
  connectionCount,
  initialState,
  connectAction,
  className,
  showAmbientRing = true,
  children
}: CircleCardSpinToConnectProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const submittingRef = useRef(false);
  const spinInFlightRef = useRef(false);
  const suppressClickRef = useRef(false);
  const chargeTimerRef = useRef<number | null>(null);
  const completionTimerRef = useRef<number | null>(null);
  const tapDirectionRef = useRef<1 | -1>(1);
  const [dragTilt, setDragTilt] = useState(0);
  const [isCharging, setIsCharging] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [spinConfig, setSpinConfig] = useState<SpinConfig>({
    id: 0,
    direction: 1,
    duration: SPIN_BASE_DURATION_MS,
    totalDegrees: 1800,
    strength: 0.35,
    reduced: false
  });
  const [hasInteractedWithSpin, setHasInteractedWithSpin] = useState(false);
  const [localConnected, setLocalConnected] = useState(
    isConnected || initialState === "connected" || initialState === "first" || initialState === "already"
  );
  const [statusMessage, setStatusMessage] = useState(() => {
    if (initialState === "return") {
      return SPIN_TO_CONNECT_LABEL;
    }

    if (initialState === "already" || isConnected) {
      return "Already in your Circle";
    }

    if (initialState === "connected" || initialState === "first") {
      return `Connected with ${cardName}`;
    }

    if (viewerIsOwner) {
      return SPIN_TO_CONNECT_LABEL;
    }

    return SPIN_TO_CONNECT_LABEL;
  });
  const [showAcquisitionModal, setShowAcquisitionModal] = useState(false);
  const [showCelebrationModal, setShowCelebrationModal] = useState(initialState === "first");
  const [burst, setBurst] = useState<{ id: number; expanded: boolean } | null>(null);
  const pendingReturn = initialState === "return" && !localConnected && !viewerIsOwner && !isDemo;
  const canCreateConnection =
    !viewerIsOwner && !isDemo && isAuthenticated && viewerHasCircleCard && !localConnected;
  const returnTarget = withSpinReturn(publicPath);
  const registerParams = new URLSearchParams({
    source: "circle-card",
    returnTo: returnTarget,
    sourceCardSlug: cardSlug
  });
  const registerHref = `/register?${registerParams.toString()}`;
  const loginHref = `/login?from=${encodeURIComponent(returnTarget)}`;
  const shouldShowProfileNudge =
    !hasInteractedWithSpin && !isCharging && !isSpinning && !isDragging;

  useEffect(() => {
    try {
      setHasInteractedWithSpin(localStorage.getItem(SPIN_INTERACTION_STORAGE_KEY) === "true");
    } catch {
      setHasInteractedWithSpin(false);
    }
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);
    updatePreference();
    mediaQuery.addEventListener?.("change", updatePreference);

    return () => mediaQuery.removeEventListener?.("change", updatePreference);
  }, []);

  useEffect(
    () => () => {
      if (chargeTimerRef.current !== null) window.clearTimeout(chargeTimerRef.current);
      if (completionTimerRef.current !== null) window.clearTimeout(completionTimerRef.current);
    },
    []
  );

  function markSpinInteraction() {
    setHasInteractedWithSpin(true);

    try {
      localStorage.setItem(SPIN_INTERACTION_STORAGE_KEY, "true");
    } catch {
      // Local preference storage is progressive enhancement only.
    }
  }

  function vibrate() {
    try {
      navigator.vibrate?.([18, 24, 16]);
    } catch {
      // Haptics are progressive enhancement only.
    }
  }

  function startBurst() {
    const id = Date.now();
    setBurst({ id, expanded: false });
    window.requestAnimationFrame(() => {
      setBurst((current) => (current?.id === id ? { ...current, expanded: true } : current));
    });
    window.setTimeout(() => {
      setBurst((current) => (current?.id === id ? null : current));
    }, 720);
  }

  function completeSpin() {
    if (submittingRef.current) {
      return;
    }

    spinInFlightRef.current = false;
    setIsCharging(false);
    setIsSpinning(false);
    setDragTilt(0);
    markSpinInteraction();

    trackSpinEvent(analyticsCardId, "SPIN_COMPLETED", {
      source: "spin_to_connect",
      cardSlug,
      viewerState: localConnected ? "connected" : "open"
    });
    captureSpinReferralAttribution({
      cardSlug,
      isDemo,
      viewerIsOwner
    });

    if (viewerIsOwner) {
      setStatusMessage(SPIN_TO_CONNECT_LABEL);
      return;
    }

    if (isDemo) {
      setStatusMessage("Demo Circle Card");
      return;
    }

    if (localConnected) {
      trackSpinEvent(analyticsCardId, "SPIN_ALREADY_CONNECTED", {
        source: "spin_to_connect",
        cardSlug
      });
      setStatusMessage("Already in your Circle");
      return;
    }

    if (!isAuthenticated || !viewerHasCircleCard) {
      trackSpinEvent(analyticsCardId, "SPIN_REQUIRES_ACCOUNT", {
        source: "spin_to_connect",
        cardSlug,
        reason: isAuthenticated ? "missing_circle_card" : "signed_out"
      });
      setStatusMessage("Connection Found");
      setShowAcquisitionModal(true);
      return;
    }

    if (canCreateConnection) {
      setLocalConnected(true);
      setStatusMessage(`Connected with ${cardName}`);
      submittingRef.current = true;
      formRef.current?.requestSubmit();
    }
  }

  function triggerSpin(input?: {
    direction?: 1 | -1;
    strength?: number;
  }) {
    if (spinInFlightRef.current || submittingRef.current) {
      return;
    }

    spinInFlightRef.current = true;
    const direction = input?.direction ?? tapDirectionRef.current;
    const strength = clamp(input?.strength ?? 0.35, 0, 1);
    const reduced = prefersReducedMotion;
    const duration = reduced
      ? 260
      : Math.round(
          SPIN_BASE_DURATION_MS + strength * (SPIN_MAX_DURATION_MS - SPIN_BASE_DURATION_MS)
        );
    const turns = reduced ? 0 : 5 + Math.round(strength * 3);
    const totalDegrees = direction * turns * 360;
    tapDirectionRef.current = direction === 1 ? -1 : 1;

    trackSpinEvent(analyticsCardId, "SPIN_STARTED", {
      source: "spin_to_connect",
      cardSlug,
      pendingReturn
    });
    if (!reduced) vibrate();
    setIsCharging(true);
    setDragTilt(0);
    setSpinConfig((current) => ({
      id: current.id + 1,
      direction,
      duration,
      totalDegrees,
      strength,
      reduced
    }));

    chargeTimerRef.current = window.setTimeout(() => {
      setIsCharging(false);
      setIsSpinning(true);
      if (!reduced) startBurst();
      completionTimerRef.current = window.setTimeout(completeSpin, duration);
    }, reduced ? 20 : SPIN_CHARGE_DELAY_MS);
  }

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (spinInFlightRef.current || submittingRef.current) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startedAt: event.timeStamp,
      lastX: event.clientX,
      lastAt: event.timeStamp,
      deltaX: 0,
      velocityX: 0,
      moved: false
    };
  }

  function handlePointerMove(event: PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    const elapsed = Math.max(event.timeStamp - drag.lastAt, 1);
    const instantVelocity = (event.clientX - drag.lastX) / elapsed;
    drag.deltaX = deltaX;
    drag.velocityX = drag.velocityX * 0.58 + instantVelocity * 0.42;
    drag.lastX = event.clientX;
    drag.lastAt = event.timeStamp;
    drag.moved =
      drag.moved ||
      (Math.abs(deltaX) > SPIN_DRAG_THRESHOLD && Math.abs(deltaX) > Math.abs(deltaY));

    const width = Math.max(event.currentTarget.getBoundingClientRect().width, 1);
    setDragTilt(clamp((deltaX / width) * 42, -34, 34));
  }

  function handlePointerEnd(event: PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    dragRef.current = null;
    setIsDragging(false);

    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture may already be released by the browser.
    }

    if (drag.moved || Math.abs(drag.velocityX) > 0.28) {
      const elapsed = Math.max(event.timeStamp - drag.startedAt, 1);
      const averageVelocity = drag.deltaX / elapsed;
      const velocity = Math.abs(drag.velocityX) > Math.abs(averageVelocity)
        ? drag.velocityX
        : averageVelocity;
      const direction: 1 | -1 = (velocity || drag.deltaX) >= 0 ? 1 : -1;
      const width = Math.max(event.currentTarget.getBoundingClientRect().width, 1);
      const strength = clamp(
        Math.max(Math.abs(drag.deltaX) / width, Math.abs(velocity) / 1.25),
        0.15,
        1
      );
      suppressClickRef.current = true;
      triggerSpin({ direction, strength });
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
      return;
    }

    setDragTilt(0);
  }

  function handlePointerCancel(event: PointerEvent<HTMLButtonElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setIsDragging(false);
    setDragTilt(0);
  }

  function handleClick() {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }

    triggerSpin();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    triggerSpin();
  }

  const spinStyle: SignatureSpinStyle = {
    "--cc-spin-stage-one": `${spinConfig.totalDegrees * 0.08}deg`,
    "--cc-spin-stage-two": `${spinConfig.totalDegrees * 0.42}deg`,
    "--cc-spin-stage-three": `${spinConfig.totalDegrees * 0.86}deg`,
    "--cc-spin-overshoot": `${spinConfig.totalDegrees + spinConfig.direction * 18}deg`,
    "--cc-spin-settle": `${spinConfig.totalDegrees - spinConfig.direction * 5}deg`,
    "--cc-spin-end": `${spinConfig.totalDegrees}deg`,
    "--cc-spin-duration": `${spinConfig.duration}ms`,
    "--cc-drag-y": `${dragTilt}deg`
  };

  return (
    <div
      className={cn(
        "relative inline-flex select-none items-center justify-center align-middle",
        pendingReturn && "motion-safe:animate-pulse",
        className
      )}
    >
      <form ref={formRef} action={connectAction} className="hidden">
        <input type="hidden" name="cardId" value={cardId} />
        <input type="hidden" name="returnPath" value={publicPath} />
        <input type="hidden" name="source" value="spin_to_connect" />
      </form>

      {showAmbientRing ? (
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute -inset-3 rounded-full border transition-all duration-500",
            localConnected
              ? "border-emerald-300/60 bg-emerald-300/10 shadow-[0_0_50px_rgba(52,211,153,0.38)]"
              : "border-gold/45 bg-gold/8 shadow-[0_0_48px_rgba(212,175,95,0.24)]",
            pendingReturn && "border-gold/80 shadow-[0_0_76px_rgba(212,175,95,0.55)]"
          )}
        />
      ) : null}
      <CircleCardSpinActivationGuide hasInteracted={hasInteractedWithSpin} />
      {pendingReturn ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-5 rounded-full border border-dashed border-gold/45 motion-safe:animate-spin"
          style={{ animationDuration: "4.8s" }}
        />
      ) : null}

      <button
        type="button"
        aria-label={`Spin ${cardName}'s Circle Card`}
        aria-describedby={`${cardSlug}-spin-status`}
        aria-busy={isCharging || isSpinning}
        data-charging={isCharging ? "true" : "false"}
        data-spinning={isSpinning ? "true" : "false"}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerCancel}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={cn(
          "circle-card-signature-spin-button relative z-10 h-full w-full cursor-grab rounded-full touch-none outline-none active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          shouldShowProfileNudge && "circle-card-spin-profile-nudge"
        )}
      >
        <span
          aria-hidden="true"
          className="circle-card-signature-spin-trail circle-card-signature-spin-trail-blue"
        />
        <span
          aria-hidden="true"
          className="circle-card-signature-spin-trail circle-card-signature-spin-trail-gold"
        />
        <span
          key={spinConfig.id}
          style={spinStyle}
          className={cn(
            "circle-card-signature-spin-coin block h-full w-full rounded-full",
            isCharging && "is-charging",
            isSpinning && "is-spinning",
            spinConfig.reduced && "is-reduced"
          )}
        >
          <span aria-hidden="true" className="circle-card-signature-spin-edge" />
          <span className="circle-card-signature-spin-face circle-card-signature-spin-face-front">
            {children}
            <span aria-hidden="true" className="circle-card-signature-spin-sheen" />
          </span>
          <span
            aria-hidden="true"
            className="circle-card-signature-spin-face circle-card-signature-spin-face-back"
          >
            {children}
            <span className="circle-card-signature-spin-back-mark" />
          </span>
        </span>
      </button>

      {burst
        ? Array.from({ length: PARTICLE_COUNT }).map((_, index) => {
            const angle = (index / PARTICLE_COUNT) * Math.PI * 2;
            const distance = 34 + spinConfig.strength * 20 + (index % 3) * 8;
            const particleStyle: CSSProperties = {
              transform: burst.expanded
                ? `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px) scale(0.18)`
                : "translate(0, 0) scale(1)",
              opacity: burst.expanded ? 0 : 0.95,
              transition: "transform 620ms ease-out, opacity 620ms ease-out"
            };

            return (
              <span
                key={`${burst.id}-${index}`}
                aria-hidden="true"
                className={cn(
                  "circle-card-signature-spin-particle pointer-events-none absolute left-1/2 top-1/2 z-20 rounded-full",
                  index % 2 === 0
                    ? "h-1.5 w-1.5 bg-gold shadow-[0_0_16px_rgba(212,175,95,0.8)]"
                    : "h-1 w-1 bg-[#64a7ff] shadow-[0_0_15px_rgba(30,91,255,0.82)]"
                )}
                style={particleStyle}
              />
            );
          })
        : null}

      <span
        id={`${cardSlug}-spin-status`}
        aria-live="polite"
        className={cn(
          "absolute -bottom-3 left-1/2 z-30 inline-flex max-w-[12rem] -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-semibold shadow-[0_12px_30px_rgba(0,0,0,0.28)] backdrop-blur",
          localConnected
            ? "border-emerald-300/45 bg-emerald-300/14 text-emerald-100"
            : "border-gold/35 bg-[#071126]/88 text-gold"
        )}
      >
        {localConnected ? <CheckCircle2 size={12} /> : <Sparkles size={12} />}
        {statusMessage}
      </span>

      {showAcquisitionModal ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/78 p-4 backdrop-blur-md">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="spin-acquisition-title"
            className="w-full max-w-md overflow-hidden rounded-[1.5rem] border border-gold/24 bg-[linear-gradient(145deg,rgba(9,20,45,0.98),rgba(4,10,24,0.98))] p-5 text-left shadow-[0_34px_100px_rgba(0,0,0,0.5)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-gold">
                  Spin To Connect
                </p>
                <h2 id="spin-acquisition-title" className="mt-2 font-display text-2xl text-foreground">
                  Connection Found
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowAcquisitionModal(false)}
                className="rounded-full border border-silver/14 bg-white/[0.04] p-2 text-silver transition hover:border-gold/30 hover:text-foreground"
                aria-label="Close connection modal"
              >
                <X size={16} />
              </button>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              To join {cardName}&apos;s Circle you&apos;ll need your own Circle Card.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Link href={registerHref} className={cn(buttonVariants(), "gap-2 rounded-2xl")}>
                <UserPlus size={16} />
                Create Free Circle Card
              </Link>
              <Link
                href={loginHref}
                className={cn(buttonVariants({ variant: "outline" }), "gap-2 rounded-2xl")}
              >
                <LogIn size={16} />
                Sign In
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {showCelebrationModal ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/78 p-4 backdrop-blur-md">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="spin-celebration-title"
            className="w-full max-w-md overflow-hidden rounded-[1.5rem] border border-gold/28 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,95,0.22),transparent_38%),linear-gradient(145deg,rgba(9,20,45,0.98),rgba(4,10,24,0.98))] p-5 text-center shadow-[0_34px_100px_rgba(0,0,0,0.5)]"
          >
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-gold/45 bg-gold/12 text-gold shadow-[0_0_46px_rgba(212,175,95,0.35)]">
              <Sparkles size={28} />
            </div>
            <h2 id="spin-celebration-title" className="mt-4 font-display text-3xl text-foreground">
              Welcome To Circle Card
            </h2>
            <p className="mt-2 text-sm text-muted">Your Circle has begun.</p>
            <div className="mt-5 rounded-2xl border border-silver/14 bg-white/[0.045] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-silver">
                Connection count
              </p>
              <p className="mt-1 text-3xl font-semibold text-foreground">
                {Math.max(connectionCount ?? 1, 1)}
              </p>
              <div className="mt-4 flex items-center justify-center gap-3 rounded-2xl border border-gold/18 bg-gold/10 px-3 py-3 text-left">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-gold/35 bg-[#071126] text-sm font-semibold text-gold">
                  {initials(cardName)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-foreground">
                    {cardName}
                  </span>
                  <span className="block text-xs text-gold">First connection card</span>
                </span>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Link
                href="/dashboard/circle-card/wallet"
                className={cn(buttonVariants(), "gap-2 rounded-2xl")}
              >
                <WalletCards size={16} />
                View Wallet
              </Link>
              <Button
                type="button"
                variant="outline"
                className="gap-2 rounded-2xl"
                onClick={() => setShowCelebrationModal(false)}
              >
                Keep Exploring
                <ArrowRight size={16} />
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
