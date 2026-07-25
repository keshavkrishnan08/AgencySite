"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, Mail, Lock, User, CheckCircle2, Star } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth";
import { identify, track } from "@/lib/analytics";

type Mode = "signin" | "signup";

function SignInInner() {
  const router = useRouter();
  const params = useSearchParams();
  // Returning sign-ins go where they were headed (or the app). A brand-new
  // account goes to PAYMENT first — never straight into the app — since the
  // product is paid. The checkout's success_url brings them back into the app.
  const nextParam = params.get("next");
  const signinNext = nextParam || "/dashboard";
  const signupNext = nextParam && nextParam !== "/dashboard" ? nextParam : "/upgrade";
  const { configured, signIn, signUp, signInWithLink } = useAuth();

  const [mode, setMode] = useState<Mode>(params.get("mode") === "signup" ? "signup" : "signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    try {
      if (mode === "signup") {
        const r = await signUp(email.trim(), password, name.trim());
        if (r.error) {
          track("account:signup_error", { reason: r.error.slice(0, 80) });
          return setError(r.error);
        }
        // Join the anonymous pre-signup journey (ads -> onboarding) to the real
        // person. This is the alias moment: everything before now was anon.
        identify(email.trim(), { name: name.trim() || undefined });
        track("account_created", { next: signupNext });
        if (r.needsConfirm) return setNotice("Check your email to confirm your account, then sign in.");
        router.push(signupNext);
      } else {
        const r = await signIn(email.trim(), password);
        if (r.error) {
          track("account:signin_error", { reason: r.error.slice(0, 80) });
          return setError(r.error);
        }
        identify(email.trim());
        track("account:signin", { next: signinNext });
        router.push(signinNext);
      }
    } finally {
      setBusy(false);
    }
  };

  const magicLink = async () => {
    setError("");
    setNotice("");
    if (!email.trim()) return setError("Enter your email first.");
    setBusy(true);
    const r = await signInWithLink(email.trim());
    setBusy(false);
    if (r.error) return setError(r.error);
    identify(email.trim());
    track("account:magic_link_sent", {});
    setNotice("We sent you a sign-in link. Check your email.");
  };

  return (
    <main className="min-h-screen lg:grid lg:grid-cols-2">
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-5 py-12">
      {/* ambient glow */}
      <div
        className="pointer-events-none absolute -top-32 left-1/2 h-96 w-[36rem] -translate-x-1/2 rounded-full opacity-50 blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(25,169,184,0.22), transparent 70%)" }}
      />

      <Link href="/" className="mb-8">
        <Logo href={null} size={34} />
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm"
      >
        <h1 className="text-center font-serif text-3xl font-semibold text-ink">
          {mode === "signup" ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-2 text-center text-ink-2">
          {mode === "signup"
            ? "Save your progress and pick up on any device."
            : "Sign in to see your scores and your plan."}
        </p>

        {!configured && (
          <div className="mt-5 rounded-xl border bg-amber-soft p-4 text-center text-sm text-amber-ink" style={{ borderColor: "var(--amber)" }}>
            Accounts come online the moment the Supabase key is set. For now you can{" "}
            <Link href="/onboarding" className="font-semibold underline">start the questions</Link>.
          </div>
        )}

        <form onSubmit={submit} className="mt-7 space-y-4">
          {mode === "signup" && (
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink-2">Your name</span>
              <div className="relative">
                <User size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" />
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jordan" className="field pl-10" autoComplete="name" />
              </div>
            </label>
          )}
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink-2">Email</span>
            <div className="relative">
              <Mail size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" />
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className="field pl-10" autoComplete="email" />
            </div>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink-2">Password</span>
            <div className="relative">
              <Lock size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" />
              <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" className="field pl-10" autoComplete={mode === "signup" ? "new-password" : "current-password"} />
            </div>
          </label>

          {error && <p className="text-sm font-medium text-coral-ink">{error}</p>}
          {notice && (
            <p className="flex items-center gap-2 text-sm font-medium text-sage-ink">
              <CheckCircle2 size={16} /> {notice}
            </p>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={busy || !configured}>
            {busy ? <><Loader2 size={18} className="animate-spin" /> Working…</> : <>{mode === "signup" ? "Create account" : "Sign in"} <ArrowRight size={18} /></>}
          </Button>
        </form>

        {configured && (
          <button onClick={magicLink} disabled={busy} className="mt-3 w-full text-center text-sm font-medium text-primary-ink hover:underline">
            Email me a sign-in link instead
          </button>
        )}

        <p className="mt-6 text-center text-sm text-ink-2">
          {mode === "signup" ? "Already have an account?" : "New here?"}{" "}
          <button
            onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setError(""); setNotice(""); }}
            className="font-semibold text-primary-ink hover:underline"
          >
            {mode === "signup" ? "Sign in" : "Create one free"}
          </button>
        </p>
      </motion.div>

      <p className="mt-6 text-center text-xs text-ink-3">
        New here?{" "}
        <Link href="/onboarding" className="font-medium text-ink-2 hover:text-ink">See how it works</Link>
      </p>
    </div>

    <SignInReviews />
    </main>
  );
}

/* The reviews half of the create-account screen. Teal panel matching the
   onboarding aesthetic, hidden on small screens where the form stands alone. */
const SIGNIN_REVIEWS = [
  { quote: "I hadn't interviewed in six years. Watching my score climb from 44 to 81 is what got me to walk in calm.", name: "Rachel M.", role: "Office Manager" },
  { quote: "It counted every 'um' I said. I had no idea. Two weeks later they were gone.", name: "David K.", role: "Operations Lead" },
  { quote: "The gap question used to wreck me. Now I have an answer I actually believe.", name: "Priya N.", role: "Account Manager" },
];

function SignInReviews() {
  return (
    <aside className="relative hidden overflow-hidden lg:block" style={{ background: "linear-gradient(160deg, #19a9b8 0%, #14808e 50%, #0c5660 120%)" }}>
      <div className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full opacity-40 blur-3xl" style={{ background: "radial-gradient(circle, #ffffff66, transparent)" }} />
      <div className="pointer-events-none absolute -bottom-28 -left-20 h-80 w-80 rounded-full opacity-30 blur-3xl" style={{ background: "radial-gradient(circle, #ffe0a655, transparent)" }} />
      <div className="sticky top-0 flex min-h-screen flex-col justify-center px-12 py-16 text-white xl:px-16">
        <div className="flex items-center gap-1.5">
          {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={16} className="fill-white text-white" />)}
          <span className="ml-2 text-sm font-medium text-white/85">Loved by 12,000+ job seekers</span>
        </div>
        <h2 className="mt-6 max-w-md font-serif text-[2.1rem] font-semibold leading-tight">
          Your progress, saved and waiting.
        </h2>
        <div className="mt-9 space-y-5">
          {SIGNIN_REVIEWS.map((r) => (
            <figure key={r.name} className="glass-card rounded-2xl p-5">
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={12} className="fill-white text-white" />)}
              </div>
              <p className="mt-2.5 text-[0.95rem] leading-relaxed text-white/90">&ldquo;{r.quote}&rdquo;</p>
              <figcaption className="mt-3 text-xs font-medium text-white/70">{r.name} · {r.role}</figcaption>
            </figure>
          ))}
        </div>
        <p className="mt-10 flex items-center gap-2 text-sm text-white/75"><CheckCircle2 size={16} /> Private by design. Cancel anytime.</p>
      </div>
    </aside>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<main className="min-h-screen" />}>
      <SignInInner />
    </Suspense>
  );
}
