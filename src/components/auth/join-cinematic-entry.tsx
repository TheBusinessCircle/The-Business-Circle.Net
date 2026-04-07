"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, CheckCircle2, Loader2, LockKeyhole } from "lucide-react";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { type RegisterMemberFormInput, registerMemberFormSchema } from "@/lib/auth/schemas";
import { safeRedirectPath } from "@/lib/auth/utils";
import { cn } from "@/lib/utils";
import styles from "./join-cinematic-entry.module.css";

type MembershipTier = "FOUNDATION" | "INNER_CIRCLE" | "CORE";

type RegisterPayload = {
  name: string;
  email: string;
  password: string;
  tier: MembershipTier;
  businessName?: string;
  businessStatus?: "IDEA_STARTUP" | "REGISTERED_BUSINESS" | "ESTABLISHED_COMPANY";
  companyNumber?: string;
  businessStage?: "IDEA" | "STARTUP" | "GROWTH" | "SCALE" | "ESTABLISHED";
  inviteCode?: string;
};

type RegisterResponse = {
  ok?: boolean;
  error?: string;
  checkoutUrl?: string;
};

type CheckoutApiResponse = {
  url?: string;
  error?: string;
};

export type JoinPathwayConfig = {
  tier: MembershipTier;
  sequence: string;
  title: string;
  tierLabel: string;
  description: string;
  intent: string;
  priceLabel: string;
  authenticatedLabel: string;
  unauthenticatedLabel: string;
  loginHref: string;
  isCurrentPlan: boolean;
};

export type JoinTierOption = {
  value: MembershipTier;
  label: string;
};

type JoinCinematicEntryProps = {
  pathways: JoinPathwayConfig[];
  tierOptions: JoinTierOption[];
  initialSelectedTier: MembershipTier;
  from?: string;
  inviteCode?: string;
  isAuthenticated: boolean;
  hasActiveSubscription: boolean;
  accountEmail?: string;
  currentTierLabel: string;
  error?: string;
  billing?: string;
};

const portalEase = [0.2, 0.72, 0.18, 1] as const;

const tierMicroCopy: Record<MembershipTier, string> = {
  FOUNDATION: "The clearest threshold into the ecosystem.",
  INNER_CIRCLE: "A more focused room with stronger business signal.",
  CORE: "The closest layer for deeper strategic proximity."
};

function withFrom(pathname: string, from?: string) {
  const target = from ? safeRedirectPath(from, "") : "";

  if (!target) {
    return pathname;
  }

  const params = new URLSearchParams({ from: target });
  return `${pathname}?${params.toString()}`;
}

function withJoinWelcome(pathname: string) {
  const target = safeRedirectPath(pathname);
  const url = new URL(target, "http://localhost");

  if (url.pathname !== "/dashboard") {
    return `${url.pathname}${url.search}`;
  }

  url.searchParams.set("welcome", "1");
  url.searchParams.set("source", "join");
  return `${url.pathname}${url.search}`;
}

function updateJoinQueryTier(tier: MembershipTier) {
  if (typeof window === "undefined") {
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.set("tier", tier);
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

function scrollToCreateAccount(reduceMotion: boolean | null) {
  const form = document.getElementById("create-account");

  if (!form) {
    return;
  }

  form.scrollIntoView({
    behavior: reduceMotion ? "auto" : "smooth",
    block: "start"
  });
}

function CinematicRegisterForm({
  selectedTier,
  onTierChange,
  from,
  inviteCode,
  tierOptions,
  loginHref
}: {
  selectedTier: MembershipTier;
  onTierChange: (tier: MembershipTier) => void;
  from?: string;
  inviteCode?: string;
  tierOptions: JoinTierOption[];
  loginHref: string;
}) {
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const targetPath = useMemo(() => safeRedirectPath(from), [from]);

  const form = useForm<RegisterMemberFormInput>({
    resolver: zodResolver(registerMemberFormSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      tier: selectedTier,
      businessName: "",
      businessStatus: "",
      companyNumber: "",
      businessStage: "",
      inviteCode: inviteCode ?? ""
    }
  });

  const tierField = form.register("tier");
  const activeTier = form.watch("tier");

  useEffect(() => {
    form.setValue("tier", selectedTier, {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: true
    });
  }, [form, selectedTier]);

  const onSubmit = form.handleSubmit((values) => {
    setNotice(null);

    startTransition(async () => {
      const payload: RegisterPayload = {
        name: values.name,
        email: values.email,
        password: values.password,
        tier: values.tier
      };

      if (values.inviteCode?.trim()) {
        payload.inviteCode = values.inviteCode.trim();
      }

      if (values.businessName?.trim()) {
        payload.businessName = values.businessName.trim();
      }

      if (values.businessStatus) {
        payload.businessStatus = values.businessStatus;
      }

      if (values.companyNumber?.trim()) {
        payload.companyNumber = values.companyNumber.trim();
      }

      if (values.businessStage) {
        payload.businessStage = values.businessStage;
      }

      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const data = (await response.json().catch(() => ({}))) as RegisterResponse;

      if (!response.ok) {
        setNotice(data.error ?? "Unable to create account.");
        return;
      }

      if (data.checkoutUrl) {
        await signIn("credentials", {
          email: values.email,
          password: values.password,
          redirect: false
        });

        window.location.assign(data.checkoutUrl);
        return;
      }

      const signInResult = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false
      });

      if (signInResult?.error) {
        setNotice("Account created. Please sign in.");
        router.push(withFrom("/login", from));
        router.refresh();
        return;
      }

      router.push(withJoinWelcome(targetPath));
      router.refresh();
    });
  });

  return (
    <form id="create-account" className={styles.form} onSubmit={onSubmit}>
      <div className={styles.formIntro}>
        <span className={styles.kicker}>
          <LockKeyhole size={12} />
          Secure setup
        </span>
        <p>
          Your chosen route stays attached through account creation and checkout. Current selection:{" "}
          <strong>{activeTier ? tierMicroCopy[activeTier] : tierMicroCopy.FOUNDATION}</strong>
        </p>
      </div>

      {notice ? (
        <p aria-live="polite" className={styles.notice}>
          {notice}
        </p>
      ) : null}

      <div className={cn(styles.formGrid, styles.twoColumn)}>
        <div className={styles.fieldGroup}>
          <Label className={styles.label} htmlFor="join-register-name">
            Full name
          </Label>
          <Input
            id="join-register-name"
            autoComplete="name"
            className={styles.field}
            {...form.register("name")}
          />
          {form.formState.errors.name ? (
            <p className={styles.errorText}>{form.formState.errors.name.message}</p>
          ) : null}
        </div>

        <div className={styles.fieldGroup}>
          <Label className={styles.label} htmlFor="join-register-email">
            Email
          </Label>
          <Input
            id="join-register-email"
            type="email"
            autoComplete="email"
            className={styles.field}
            {...form.register("email")}
          />
          {form.formState.errors.email ? (
            <p className={styles.errorText}>{form.formState.errors.email.message}</p>
          ) : null}
        </div>
      </div>

      <div className={cn(styles.formGrid, styles.twoColumn)}>
        <div className={styles.fieldGroup}>
          <Label className={styles.label} htmlFor="join-register-password">
            Password
          </Label>
          <Input
            id="join-register-password"
            type="password"
            autoComplete="new-password"
            className={styles.field}
            {...form.register("password")}
          />
          {form.formState.errors.password ? (
            <p className={styles.errorText}>{form.formState.errors.password.message}</p>
          ) : (
            <p className={styles.helperText}>
              Use at least 10 characters with uppercase, lowercase, number, and symbol.
            </p>
          )}
        </div>

        <div className={styles.fieldGroup}>
          <Label className={styles.label} htmlFor="join-register-confirm-password">
            Confirm password
          </Label>
          <Input
            id="join-register-confirm-password"
            type="password"
            autoComplete="new-password"
            className={styles.field}
            {...form.register("confirmPassword")}
          />
          {form.formState.errors.confirmPassword ? (
            <p className={styles.errorText}>{form.formState.errors.confirmPassword.message}</p>
          ) : null}
        </div>
      </div>

      <div className={styles.formDivider} />

      <div className={styles.fieldGroup}>
        <Label className={styles.label} htmlFor="join-register-tier">
          Entry route
        </Label>
        <Select
          id="join-register-tier"
          className={styles.field}
          {...tierField}
          onChange={(event) => {
            tierField.onChange(event);
            onTierChange(event.target.value as MembershipTier);
          }}
        >
          {tierOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      <div className={styles.fieldGroup}>
        <Label className={styles.label} htmlFor="join-register-business-name">
          Business name
        </Label>
        <Input
          id="join-register-business-name"
          autoComplete="organization"
          placeholder="Your business or project name"
          className={styles.field}
          {...form.register("businessName")}
        />
        {form.formState.errors.businessName ? (
          <p className={styles.errorText}>{form.formState.errors.businessName.message}</p>
        ) : null}
      </div>

      <div className={cn(styles.formGrid, styles.twoColumn)}>
        <div className={styles.fieldGroup}>
          <Label className={styles.label} htmlFor="join-register-business-status">
            Business status
          </Label>
          <Select
            id="join-register-business-status"
            className={styles.field}
            {...form.register("businessStatus")}
          >
            <option value="">Select status</option>
            <option value="IDEA_STARTUP">Idea / Startup</option>
            <option value="REGISTERED_BUSINESS">Registered Business</option>
            <option value="ESTABLISHED_COMPANY">Established Company</option>
          </Select>
        </div>

        <div className={styles.fieldGroup}>
          <Label className={styles.label} htmlFor="join-register-business-stage">
            Business stage
          </Label>
          <Select
            id="join-register-business-stage"
            className={styles.field}
            {...form.register("businessStage")}
          >
            <option value="">Select stage</option>
            <option value="IDEA">Idea</option>
            <option value="STARTUP">Startup</option>
            <option value="GROWTH">Growth</option>
            <option value="SCALE">Scale</option>
            <option value="ESTABLISHED">Established</option>
          </Select>
        </div>
      </div>

      <div className={styles.fieldGroup}>
        <Label className={styles.label} htmlFor="join-register-company-number">
          Company number
        </Label>
        <Input
          id="join-register-company-number"
          placeholder="Optional"
          className={styles.field}
          {...form.register("companyNumber")}
        />
        <p className={styles.helperText}>Leave blank if the business is still early stage.</p>
      </div>

      <input type="hidden" {...form.register("inviteCode")} />

      <button disabled={isPending} type="submit" className={styles.primaryAction}>
        {isPending ? <Loader2 size={15} className="animate-spin" /> : null}
        {isPending ? "Creating access" : "Create account and continue"}
        {isPending ? null : <ArrowRight size={15} />}
      </button>

      <p className={styles.finePrint}>
        Already a member?{" "}
        <Link href={loginHref || withFrom("/login", from)} className={styles.signinLink}>
          Sign in instead <ArrowRight size={13} />
        </Link>
      </p>
    </form>
  );
}

function AuthenticatedPathwayAction({
  pathway,
  hasActiveSubscription
}: {
  pathway: JoinPathwayConfig;
  hasActiveSubscription: boolean;
}) {
  const [notice, setNotice] = useState<string | null>(null);
  const [isCheckoutPending, startCheckoutTransition] = useTransition();
  const [isPortalPending, startPortalTransition] = useTransition();
  const isBusy = isCheckoutPending || isPortalPending;
  const isCurrentActivePlan = hasActiveSubscription && pathway.isCurrentPlan;

  const startCheckout = () => {
    if (isCurrentActivePlan) {
      return;
    }

    setNotice(null);

    startCheckoutTransition(async () => {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          tier: pathway.tier,
          source: "join"
        })
      });
      const data = (await response.json().catch(() => ({}))) as CheckoutApiResponse;

      if (!response.ok || !data.url) {
        setNotice(data.error ?? "Unable to open Stripe checkout.");
        return;
      }

      window.location.assign(data.url);
    });
  };

  const openBillingPortal = () => {
    setNotice(null);

    startPortalTransition(async () => {
      const response = await fetch("/api/stripe/portal", {
        method: "POST"
      });
      const data = (await response.json().catch(() => ({}))) as CheckoutApiResponse;

      if (!response.ok || !data.url) {
        setNotice(data.error ?? "Unable to open billing portal.");
        return;
      }

      window.location.assign(data.url);
    });
  };

  return (
    <div className={styles.pathwayActions}>
      <button
        type="button"
        className={styles.primaryAction}
        disabled={isBusy || isCurrentActivePlan}
        onClick={startCheckout}
      >
        {isCheckoutPending ? <Loader2 size={15} className="animate-spin" /> : null}
        {isCurrentActivePlan ? "Current active path" : pathway.authenticatedLabel}
        {isCheckoutPending || isCurrentActivePlan ? null : <ArrowRight size={15} />}
      </button>

      {isCurrentActivePlan ? (
        <button
          type="button"
          className={styles.secondaryAction}
          disabled={isBusy}
          onClick={openBillingPortal}
        >
          {isPortalPending ? <Loader2 size={15} className="animate-spin" /> : null}
          Manage billing
        </button>
      ) : (
        <p className={styles.finePrint}>Secure checkout opens once you choose this path.</p>
      )}

      {notice ? (
        <p aria-live="polite" className={styles.notice}>
          {notice}
        </p>
      ) : null}
    </div>
  );
}

export function JoinCinematicEntry({
  pathways,
  tierOptions,
  initialSelectedTier,
  from,
  inviteCode,
  isAuthenticated,
  hasActiveSubscription,
  accountEmail,
  currentTierLabel,
  error,
  billing
}: JoinCinematicEntryProps) {
  const reduceMotion = useReducedMotion();
  const portalX = useMotionValue(0);
  const portalY = useMotionValue(0);
  const springX = useSpring(portalX, { stiffness: 120, damping: 22, mass: 0.45 });
  const springY = useSpring(portalY, { stiffness: 120, damping: 22, mass: 0.45 });
  const [portalOpened, setPortalOpened] = useState(false);
  const [selectedTier, setSelectedTier] = useState<MembershipTier>(initialSelectedTier);

  const selectedPathway = useMemo(
    () => pathways.find((pathway) => pathway.tier === selectedTier) ?? pathways[0],
    [pathways, selectedTier]
  );

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
    if (reduceMotion) {
      setPortalOpened(true);
    }
  }, [reduceMotion]);

  useEffect(() => {
    setSelectedTier(initialSelectedTier);
  }, [initialSelectedTier]);

  const selectTier = (tier: MembershipTier) => {
    setSelectedTier(tier);
    updateJoinQueryTier(tier);
  };

  const handlePortalMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (reduceMotion || portalOpened) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;

    portalX.set(x * 28);
    portalY.set(y * 28);
  };

  const resetPortalPosition = () => {
    portalX.set(0);
    portalY.set(0);
  };

  const handlePortalOpen = () => {
    resetPortalPosition();
    setPortalOpened(true);
  };

  const handlePrepareEntry = () => {
    scrollToCreateAccount(reduceMotion);
  };

  const statusMessages = [
    error === "suspended"
      ? {
          tone: "gold",
          text: "Your account is currently suspended. Contact support to reactivate access."
        }
      : null,
    billing === "cancelled"
      ? {
          tone: "muted",
          text: "Stripe checkout was cancelled. You can restart your entry from here."
        }
      : null,
    billing === "required"
      ? {
          tone: "gold",
          text: "Your account needs an active membership subscription to unlock member access."
        }
      : null,
    inviteCode
      ? {
          tone: "gold",
          text: `Member invite ${inviteCode} is attached to this entry.`
        }
      : null,
    isAuthenticated
      ? {
          tone: "muted",
          text: `Signed in as ${accountEmail ?? "your account"}. Current access: ${currentTierLabel}.`
        }
      : null
  ].filter(Boolean) as Array<{ tone: "gold" | "muted"; text: string }>;

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
        <div className={styles.orbitalHaze} />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {!portalOpened ? (
          <motion.section
            key="arrival"
            className={cn(styles.scene, styles.arrivalScene)}
            initial={{ opacity: 0, backgroundColor: "#000" }}
            animate={{ opacity: 1, backgroundColor: "rgba(0,0,0,0)" }}
            exit={{
              opacity: 0,
              scale: 1.08,
              filter: "blur(14px)"
            }}
            transition={{ duration: 1.15, ease: portalEase }}
          >
            <div className={styles.arrivalInner}>
              <div className={styles.arrivalCopy}>
                <motion.h1
                  className={styles.brandLine}
                  initial={{ opacity: 0, y: 28, filter: "blur(16px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ delay: 0.45, duration: 1.25, ease: portalEase }}
                >
                  The Business Circle
                </motion.h1>
                <motion.p
                  className={styles.accessLine}
                  initial={{ opacity: 0, y: 20, filter: "blur(12px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ delay: 1.35, duration: 1.05, ease: portalEase }}
                >
                  Not everyone gets access.
                </motion.p>
                <motion.p
                  className={styles.connectionLine}
                  initial={{ opacity: 0, y: 18, filter: "blur(10px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ delay: 2.15, duration: 1.05, ease: portalEase }}
                >
                  This is where real business connects.
                </motion.p>
              </div>

              <motion.div
                className={styles.portalStage}
                initial={{ opacity: 0, y: 24, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 2.85, duration: 1.35, ease: portalEase }}
              >
                <div className={styles.portalShadow} aria-hidden="true" />
                <motion.button
                  type="button"
                  className={styles.portalButton}
                  aria-label="Step inside The Business Circle"
                  data-pressed={portalOpened}
                  style={{ x: springX, y: springY }}
                  whileHover={reduceMotion ? undefined : { scale: 1.035, rotateX: -2 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.985 }}
                  exit={{
                    scale: reduceMotion ? 1 : 4.2,
                    opacity: 0,
                    filter: "blur(22px)"
                  }}
                  transition={{ duration: 0.92, ease: portalEase }}
                  onPointerMove={handlePortalMove}
                  onPointerLeave={resetPortalPosition}
                  onClick={handlePortalOpen}
                >
                  <span className={styles.portalRing} aria-hidden="true" />
                  <span className={styles.portalInnerRing} aria-hidden="true" />
                  <span className={styles.portalGlobe} aria-hidden="true" />
                  <span className={styles.portalCore} aria-hidden="true" />
                  <span className={styles.portalSweep} aria-hidden="true" />
                  <span className={styles.portalLabel}>Step inside.</span>
                </motion.button>
              </motion.div>

              <motion.p
                className={styles.enterHint}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 4.05, duration: 0.9 }}
              >
                The portal is the entrance
              </motion.p>
            </div>
          </motion.section>
        ) : (
          <motion.section
            key="reveal"
            className={cn(styles.scene, styles.revealScene)}
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.965, y: 38 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 1.05, ease: portalEase }}
          >
            <div className={styles.revealShell}>
              <motion.header
                className={styles.revealHeader}
                initial={reduceMotion ? false : { opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: reduceMotion ? 0 : 0.2, duration: 0.9, ease: portalEase }}
              >
                <div>
                  <span className={styles.kicker}>Membership entry</span>
                  <h2 className={styles.revealTitle}>Choose how you enter.</h2>
                  <p className={styles.revealCopy}>
                    The Circle is built for business owners who want more than noise, more than
                    content, and more than empty networking. Choose the path that fits where you
                    are now.
                  </p>
                </div>
                <p className={styles.revealAside}>
                  This is a private business ecosystem. The first choice is not about buying a
                  plan. It is about choosing the room you are ready to step into.
                </p>
              </motion.header>

              <div className={styles.composition}>
                <div className={styles.pathwayField} aria-label="Join pathways">
                  {pathways.map((pathway, index) => {
                    const selected = selectedPathway.tier === pathway.tier;

                    return (
                      <motion.button
                        key={pathway.tier}
                        type="button"
                        className={cn(styles.pathway, selected ? styles.selectedPathway : "")}
                        aria-pressed={selected}
                        initial={reduceMotion ? false : { opacity: 0, x: -24 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          delay: reduceMotion ? 0 : 0.38 + index * 0.16,
                          duration: 0.82,
                          ease: portalEase
                        }}
                        onClick={() => selectTier(pathway.tier)}
                      >
                        <span className={styles.pathIndex}>{pathway.sequence}</span>
                        <span className={styles.pathContent}>
                          <span>
                            <span className={styles.pathEyebrow}>{pathway.tierLabel}</span>
                            <span className={styles.pathTitle}>{pathway.title}</span>
                            <span className={styles.pathDescription}>{pathway.description}</span>
                          </span>
                          <span className={styles.pathMeta}>
                            <span className={styles.pathPrice}>{pathway.priceLabel}</span>
                            <span className={styles.pathIntent}>{pathway.intent}</span>
                            {selected ? (
                              <span className={styles.selectedGlyph}>
                                <CheckCircle2 size={13} />
                                Selected
                              </span>
                            ) : null}
                          </span>
                        </span>
                      </motion.button>
                    );
                  })}
                </div>

                <motion.aside
                  className={styles.entryPanel}
                  initial={reduceMotion ? false : { opacity: 0, y: 28, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: reduceMotion ? 0 : 0.68, duration: 0.92, ease: portalEase }}
                >
                  <div className={styles.entryPanelInner}>
                    <div className={styles.selectedSummary}>
                      <p className={styles.selectedLabel}>Selected entry</p>
                      <h3 className={styles.selectedTitle}>{selectedPathway.title}</h3>
                      <p className={styles.selectedDescription}>
                        {selectedPathway.description} {tierMicroCopy[selectedPathway.tier]}
                      </p>
                    </div>

                    {statusMessages.length ? (
                      <div className={styles.statusStack}>
                        {statusMessages.map((message) => (
                          <p
                            key={message.text}
                            className={cn(
                              styles.notice,
                              message.tone === "muted" ? styles.mutedNotice : ""
                            )}
                          >
                            {message.text}
                          </p>
                        ))}
                      </div>
                    ) : null}

                    {isAuthenticated ? (
                      <AuthenticatedPathwayAction
                        pathway={selectedPathway}
                        hasActiveSubscription={hasActiveSubscription}
                      />
                    ) : (
                      <>
                        <button type="button" className={styles.primaryAction} onClick={handlePrepareEntry}>
                          {selectedPathway.unauthenticatedLabel}
                          <ArrowRight size={15} />
                        </button>
                        <CinematicRegisterForm
                          selectedTier={selectedPathway.tier}
                          onTierChange={selectTier}
                          from={from}
                          inviteCode={inviteCode}
                          tierOptions={tierOptions}
                          loginHref={selectedPathway.loginHref}
                        />
                      </>
                    )}

                    <div className={styles.footerNote}>
                      <span>Private membership setup. No public feed. No noise.</span>
                      <span>
                        <Link href="/privacy-policy">Privacy</Link> ·{" "}
                        <Link href="/terms-of-service">Terms</Link>
                      </span>
                    </div>
                  </div>
                </motion.aside>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
