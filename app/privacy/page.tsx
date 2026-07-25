import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { SiteFooter } from "@/components/layout/SiteFooter";

export const metadata = {
  title: "Privacy Policy · Axon Careers",
  description: "How Axon Careers handles your data.",
};

/* A real privacy policy reflecting what the app actually does. Public page. */
export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b" style={{ borderColor: "var(--border)" }}>
        <div className="container-wide flex h-16 items-center justify-between">
          <Logo />
          <Link href="/" className="text-sm font-medium text-ink-2 hover:text-ink">← Back to home</Link>
        </div>
      </header>

      <main className="container-content py-12 sm:py-16">
        <p className="eyebrow">Legal</p>
        <h1 className="mt-3 font-serif text-4xl font-semibold text-ink">Privacy Policy</h1>
        <p className="mt-2 text-ink-3">Last updated: July 25, 2026</p>

        <div className="mt-10 space-y-9">
          <Section title="The short version">
            <p>
              Axon Careers is a private place to practice interviews. We collect what we need to run the
              product and bill you, nothing more. We don&apos;t sell your data, we don&apos;t post anything
              publicly, and we never email your contacts. You can export or delete everything at any time
              from <Link href="/settings" className="link">Settings</Link>.
            </p>
          </Section>

          <Section title="What we collect">
            <ul className="list-disc space-y-2 pl-5">
              <li><strong className="text-ink">Account info</strong> — your name and email, so you can sign in and we can reach you about billing.</li>
              <li><strong className="text-ink">What you tell us</strong> — your target role, company, situation, and how long since you last interviewed, so practice is tailored to you.</li>
              <li><strong className="text-ink">Your practice</strong> — the answers you type or speak, their scores, and your progress over time. This is the core of the product.</li>
              <li><strong className="text-ink">Usage</strong> — which pages and features you use, to understand what&apos;s working and fix what isn&apos;t.</li>
              <li><strong className="text-ink">Payment info</strong> — handled entirely by Stripe. We never see or store your full card number.</li>
            </ul>
          </Section>

          <Section title="Voice practice">
            <p>
              When you practice by voice, we transcribe your answer to text and store the text, not the audio.
              For the best, most consistent quality, the recording is sent to OpenAI for transcription and then
              discarded. If that isn&apos;t available, transcription falls back to an on-device model (the audio
              never leaves your browser) or your browser&apos;s built-in speech recognition. We never keep the
              audio itself.
            </p>
          </Section>

          <Section title="Who we share it with">
            <p>We use a small set of trusted providers to run the service. We share only what each one needs:</p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li><strong className="text-ink">Anthropic &amp; OpenAI</strong> — your answers (and, for voice, the recording to transcribe) are sent to Anthropic&apos;s Claude and/or OpenAI to be transcribed, scored, and coached. They process it to return feedback and don&apos;t use it to train their models under our API terms.</li>
              <li><strong className="text-ink">Stripe</strong> — payments and subscription management.</li>
              <li><strong className="text-ink">Supabase</strong> — secure storage of your account and practice history.</li>
              <li><strong className="text-ink">Mixpanel &amp; Vercel</strong> — product analytics, so we can improve the experience.</li>
            </ul>
            <p className="mt-3">We do not sell your personal data, and we never share it with employers, recruiters, or your contacts.</p>
          </Section>

          <Section title="Your rights">
            <p>You&apos;re in control of your data:</p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li><strong className="text-ink">Export</strong> — download everything we store about you from Settings.</li>
              <li><strong className="text-ink">Delete</strong> — permanently delete your account and all practice history from Settings. This can&apos;t be undone.</li>
              <li><strong className="text-ink">Cancel</strong> — cancel your subscription anytime; you keep access until the end of the period you paid for.</li>
            </ul>
          </Section>

          <Section title="Data retention">
            <p>
              We keep your data for as long as your account is active. When you delete your account, your
              profile and practice history are removed. Some billing records are retained where required by law.
            </p>
          </Section>

          <Section title="Contact">
            <p>
              Questions about your privacy? Email{" "}
              <a href="mailto:keshav@axonservices.dev" className="link">keshav@axonservices.dev</a> and we&apos;ll get back to you.
            </p>
          </Section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-serif text-xl font-semibold text-ink">{title}</h2>
      <div className="mt-3 leading-relaxed text-ink-2">{children}</div>
    </section>
  );
}
