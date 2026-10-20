"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { helpCategories } from "@/lib/bcn-v2/validation";
async function post(path: string, data: unknown) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error || "Unable to save. Please try again.");
  return result;
}
function Category({ value }: { value?: string }) {
  return (
    <label className="v2-field">
      Type of help
      <select
        name="category"
        defaultValue={
          helpCategories.includes(value as (typeof helpCategories)[number])
            ? value
            : "other"
        }
      >
        {helpCategories.map((x) => (
          <option value={x} key={x}>
            {x[0].toUpperCase() + x.slice(1)}
          </option>
        ))}
      </select>
    </label>
  );
}
function Honeypot() {
  return (
    <div aria-hidden="true" style={{ position: "absolute", left: -9999 }}>
      <label>
        Leave this blank
        <input name="website" autoComplete="off" tabIndex={-1} />
      </label>
    </div>
  );
}
export function HelpForm({ category }: { category?: string }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(e.currentTarget);
    try {
      await post("/api/bcn/help", {
        ...Object.fromEntries(form),
        consent: form.get("consent") === "on",
      });
      setSent(true);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to save.");
    } finally {
      setBusy(false);
    }
  }
  return sent ? (
    <div className="v2-success" role="status">
      <h2>Your request is in.</h2>
      <p>
        BCN will review it before suggesting a provider. No contact details have
        been sent to a provider. If we find a suitable match, we will ask your
        permission to introduce you.
      </p>
      <Link href="/tools" className="v2-text-link">
        Use a free tool while you wait
      </Link>
    </div>
  ) : (
    <form className="v2-card" onSubmit={submit}>
      <div className="v2-form-grid">
        <label className="v2-field">
          Your name
          <input
            name="name"
            minLength={2}
            maxLength={100}
            autoComplete="name"
            required
          />
        </label>
        <label className="v2-field">
          Email address
          <input
            name="email"
            type="email"
            maxLength={254}
            autoComplete="email"
            required
          />
        </label>
        <label className="v2-field">
          Business name
          <input
            name="business"
            minLength={2}
            maxLength={160}
            autoComplete="organization"
            required
          />
        </label>
        <Category value={category} />
        <label className="v2-field v2-field-full">
          What do you need help with?
          <textarea
            name="summary"
            minLength={20}
            maxLength={4000}
            required
            placeholder="What are you trying to do, what is getting in the way and when do you need help?"
          />
          <small>
            Please leave out passwords, payment details and sensitive customer
            information.
          </small>
        </label>
      </div>
      <Honeypot />
      <label className="v2-check">
        <input type="checkbox" name="consent" required />
        <span>
          I ask The Business Circle to store and review this request and contact
          me about it. I understand that sharing with a named provider will
          require a separate choice.
          <small>
            We keep closed requests for up to 12 months for follow-up and
            dispute handling.{" "}
            <Link href="/privacy-policy">Read our privacy information</Link>. No
            marketing opt-in is included.
          </small>
        </span>
      </label>
      <p className="v2-note">
        Requesting help is free. A provider may charge for their work. BCN may
        receive an agreed referral fee; we will disclose it before you agree to
        an introduction. Matching and response times are not guaranteed.
      </p>
      <button className="v2-button" disabled={busy}>
        {busy ? "Saving your request…" : "Ask for business help ↗"}
      </button>
      {message && (
        <p className="v2-error" role="alert">
          {message}
        </p>
      )}
    </form>
  );
}
export function RegisterForm() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    const f = new FormData(e.currentTarget);
    try {
      const r = await post("/api/bcn/register", {
        ...Object.fromEntries(f),
        acceptedTerms: f.get("acceptedTerms") === "on",
        adult: f.get("adult") === "on",
      });
      setMessage(r.message);
      setDone(true);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to create account.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="v2-card v2-auth">
      <h1 style={{ fontSize: 30 }}>Your free BCN account</h1>
      <p className="v2-note">
        Create an optional business profile. Every tool and guide is already
        free without an account.
      </p>
      {done ? (
        <div className="v2-success" role="status">
          <p>{message}</p>
          <Link href="/login" className="v2-button">
            Sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={submit}>
          <label className="v2-field">
            Name
            <input
              name="name"
              required
              minLength={2}
              maxLength={100}
              autoComplete="name"
            />
          </label>
          <label className="v2-field">
            Email
            <input
              name="email"
              type="email"
              required
              maxLength={254}
              autoComplete="email"
            />
          </label>
          <label className="v2-field">
            Password
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={10}
              maxLength={72}
            />
            <small>
              At least 10 characters with uppercase, lowercase, a number and a
              symbol.
            </small>
          </label>
          <Honeypot />
          <label className="v2-check">
            <input name="adult" type="checkbox" required />I am at least 18 and
            using BCN for business purposes.
          </label>
          <label className="v2-check">
            <input name="acceptedTerms" type="checkbox" required />
            <span>
              I accept the <Link href="/terms-of-service">terms</Link> and have
              read the <Link href="/privacy-policy">privacy policy</Link>.
            </span>
          </label>
          <button className="v2-button" disabled={busy}>
            {busy ? "Creating account…" : "Create free account"}
          </button>
          {message && (
            <p className="v2-error" role="alert">
              {message}
            </p>
          )}
        </form>
      )}
      <p className="v2-note">
        Already a member?{" "}
        <Link href="/login">Sign in with your existing BCN details.</Link>
      </p>
    </div>
  );
}
export function LoginFormV2({ notice }: { notice?: string }) {
  const [message, setMessage] = useState(notice || "");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    const f = new FormData(e.currentTarget);
    try {
      const result = await signIn("credentials", {
        email: f.get("email"),
        password: f.get("password"),
        redirect: false,
      });
      if (result?.error) {
        setMessage(
          "We could not sign you in. Check your details or reset your password.",
        );
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setMessage("Sign-in is temporarily unavailable. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="v2-card v2-auth">
      <h1 style={{ fontSize: 30 }}>Welcome back.</h1>
      <p className="v2-note">Sign in to your Business Circle account.</p>
      <form onSubmit={submit}>
        <label className="v2-field">
          Email
          <input name="email" type="email" required autoComplete="email" />
        </label>
        <label className="v2-field">
          Password
          <input
            name="password"
            type="password"
            required
            maxLength={72}
            autoComplete="current-password"
          />
        </label>
        <button className="v2-button" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
        {message && (
          <p className="v2-error" role="alert">
            {message}
          </p>
        )}
      </form>
      <p className="v2-note">
        <Link href="/forgot-password">Forgot password?</Link> ·{" "}
        <Link href="/register">Create a free account</Link>
      </p>
    </div>
  );
}
export type ProfileData = {
  business: string;
  category: string;
  location: string;
  description: string;
  website: string;
  publicConsent: boolean;
};
export function FreeProfileForm({ initial }: { initial?: ProfileData }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      const r = await post("/api/bcn/profile", {
        ...Object.fromEntries(f),
        publicConsent: f.get("publicConsent") === "on",
      });
      setMessage(r.message);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to save.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="v2-card" onSubmit={submit}>
      <div className="v2-form-grid">
        {[
          ["business", "Business name"],
          ["location", "Town or service area"],
          ["website", "Website (HTTPS, optional)"],
        ].map(([key, label]) => (
          <label className="v2-field" key={key}>
            {label}
            <input
              name={key}
              defaultValue={
                (initial?.[key as keyof ProfileData] as string) || ""
              }
              maxLength={key === "website" ? 500 : 160}
              required={key !== "website"}
            />
          </label>
        ))}
        <Category value={initial?.category} />
        <label className="v2-field v2-field-full">
          How does your business help?
          <textarea
            name="description"
            minLength={20}
            maxLength={1500}
            defaultValue={initial?.description}
            required
          />
        </label>
      </div>
      <label className="v2-check">
        <input
          type="checkbox"
          name="publicConsent"
          defaultChecked={initial?.publicConsent}
        />
        <span>
          Make these business details publicly visible after moderation. My
          account email will not be displayed.
          <small>
            Untick and save to withdraw publication. Changes to published
            details return the listing to moderation.
          </small>
        </span>
      </label>
      <button className="v2-button" disabled={busy}>
        {busy ? "Saving…" : "Save free profile"}
      </button>
      {message && (
        <p className="v2-success" role="status">
          {message}
        </p>
      )}
    </form>
  );
}
export function ConsentChoice({ token }: { token: string }) {
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  async function choose(decision: "agree" | "decline") {
    setBusy(true);
    try {
      await post("/api/bcn/consent", { token, decision });
      setMessage(
        decision === "agree"
          ? "Your permission has been recorded. BCN can now arrange this introduction."
          : "Your details will not be shared with this provider. BCN can review another option with you.",
      );
      setDone(true);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to save.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {!done && (
        <div className="v2-actions">
          <button
            className="v2-button"
            disabled={busy}
            onClick={() => choose("agree")}
          >
            Yes, share my request with this provider
          </button>
          <button
            className="v2-button v2-button-outline"
            disabled={busy}
            onClick={() => choose("decline")}
          >
            No, do not share
          </button>
        </div>
      )}
      {message && (
        <p className={done ? "v2-success" : "v2-error"} role="status">
          {message}
        </p>
      )}
    </>
  );
}
