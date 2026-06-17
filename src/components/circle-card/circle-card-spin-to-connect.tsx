"use client";

import Link from "next/link";
import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
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
import { trackCircleCardEvent } from "@/lib/circle-card/analytics-client";
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
  children: ReactNode;
};

type DragState = {
  pointerId: number;
  startAngle: number;
  baseRotation: number;
  delta: number;
  moved: boolean;
};

const SPIN_DRAG_THRESHOLD = 32;
const SPIN_ROTATION_DEGREES = 760;
const PARTICLE_COUNT = 14;

function readPointerAngle(target: HTMLElement, event: PointerEvent<HTMLElement>) {
  const rect = target.getBoundingClientRect();
  const x = event.clientX - (rect.left + rect.width / 2);
  const y = event.clientY - (rect.top + rect.height / 2);
  return Math.atan2(y, x) * (180 / Math.PI);
}

function normalizeAngleDelta(delta: number) {
  let normalized = delta;

  while (normalized > 180) {
    normalized -= 360;
  }

  while (normalized < -180) {
    normalized += 360;
  }

  return normalized;
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
  children
}: CircleCardSpinToConnectProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const submittingRef = useRef(false);
  const suppressClickRef = useRef(false);
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [localConnected, setLocalConnected] = useState(
    isConnected || initialState === "connected" || initialState === "first" || initialState === "already"
  );
  const [statusMessage, setStatusMessage] = useState(() => {
    if (initialState === "return") {
      return "Spin Me Now";
    }

    if (initialState === "already" || isConnected) {
      return "Already in your Circle";
    }

    if (initialState === "connected" || initialState === "first") {
      return `Connected with ${cardName}`;
    }

    if (viewerIsOwner) {
      return "Spin My CC";
    }

    return "Spin to connect";
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

    trackSpinEvent(analyticsCardId, "SPIN_COMPLETED", {
      source: "spin_to_connect",
      cardSlug,
      viewerState: localConnected ? "connected" : "open"
    });

    if (viewerIsOwner) {
      setStatusMessage("Spin My CC");
      setIsSpinning(false);
      return;
    }

    if (isDemo) {
      setStatusMessage("Demo Circle Card");
      setIsSpinning(false);
      return;
    }

    if (localConnected) {
      trackSpinEvent(analyticsCardId, "SPIN_ALREADY_CONNECTED", {
        source: "spin_to_connect",
        cardSlug
      });
      setStatusMessage("Already in your Circle");
      setIsSpinning(false);
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
      setIsSpinning(false);
      return;
    }

    if (canCreateConnection) {
      setLocalConnected(true);
      setStatusMessage(`Connected with ${cardName}`);
      submittingRef.current = true;
      formRef.current?.requestSubmit();
    }
  }

  function triggerSpin() {
    if (isSpinning || submittingRef.current) {
      return;
    }

    trackSpinEvent(analyticsCardId, "SPIN_STARTED", {
      source: "spin_to_connect",
      cardSlug,
      pendingReturn
    });
    vibrate();
    startBurst();
    setIsSpinning(true);
    setRotation((current) => current + SPIN_ROTATION_DEGREES);
    window.setTimeout(completeSpin, 640);
  }

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (isSpinning || submittingRef.current) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startAngle: readPointerAngle(event.currentTarget, event),
      baseRotation: rotation,
      delta: 0,
      moved: false
    };
  }

  function handlePointerMove(event: PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    const nextDelta = normalizeAngleDelta(
      readPointerAngle(event.currentTarget, event) - drag.startAngle
    );
    drag.delta = nextDelta;
    drag.moved = drag.moved || Math.abs(nextDelta) > SPIN_DRAG_THRESHOLD;
    setRotation(drag.baseRotation + nextDelta);
  }

  function handlePointerEnd(event: PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    dragRef.current = null;

    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture may already be released by the browser.
    }

    if (drag.moved || Math.abs(drag.delta) > SPIN_DRAG_THRESHOLD) {
      suppressClickRef.current = true;
      triggerSpin();
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
      return;
    }

    setRotation(drag.baseRotation);
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

  return (
    <div
      className={cn(
        "relative inline-flex select-none items-center justify-center align-middle",
        pendingReturn && "animate-pulse",
        className
      )}
    >
      <form ref={formRef} action={connectAction} className="hidden">
        <input type="hidden" name="cardId" value={cardId} />
        <input type="hidden" name="returnPath" value={publicPath} />
        <input type="hidden" name="source" value="spin_to_connect" />
      </form>

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
      {pendingReturn ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-5 rounded-full border border-dashed border-gold/45 animate-spin"
          style={{ animationDuration: "4.8s" }}
        />
      ) : null}

      <button
        type="button"
        aria-label={`Spin ${cardName}'s Circle Card`}
        aria-describedby={`${cardSlug}-spin-status`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className="relative z-10 h-full w-full cursor-grab rounded-full touch-none outline-none transition-transform active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        style={{
          transform: `rotate(${rotation}deg) scale(${isSpinning ? 1.045 : 1})`,
          transition: isSpinning
            ? "transform 640ms cubic-bezier(0.16, 1, 0.3, 1)"
            : "transform 180ms cubic-bezier(0.18, 0.89, 0.32, 1.28)"
        }}
      >
        <span className="block h-full w-full rounded-full">{children}</span>
      </button>

      {burst
        ? Array.from({ length: PARTICLE_COUNT }).map((_, index) => {
            const angle = (index / PARTICLE_COUNT) * Math.PI * 2;
            const distance = 42 + (index % 4) * 10;
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
                className="pointer-events-none absolute left-1/2 top-1/2 z-20 h-1.5 w-1.5 rounded-full bg-gold shadow-[0_0_16px_rgba(212,175,95,0.8)]"
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
