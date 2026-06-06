import Link from "next/link";
import { ArrowLeft, ArrowRight, Video, ListChecks, Bot, Webcam, MessageCircleQuestion, Phone, Heart } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";

export const metadata = {
  title: "What changed since you last interviewed",
  description: "A two-minute, plain-English catch-up on how interviews work now.",
};

const ITEMS = [
  { icon: Video, title: "A lot of interviews are on video now", body: "Zoom, Teams, or Google Meet. Test your camera and sound the day before. Look at the camera, not the screen, and it feels like eye contact." },
  { icon: ListChecks, title: "They love the STAR method", body: "For 'tell me about a time' questions, answer in four parts: the Situation, your Task, the Action you took, and the Result. It keeps you from rambling." },
  { icon: Bot, title: "A computer may read your resume first", body: "Before a person sees it, software scans for words from the job post. Use the same words they use, in plain text. This is upstream of us, but good to know." },
  { icon: Webcam, title: "Some first rounds are recorded, with no human", body: "You get a question on screen and record your answer. It feels strange. Our Interview Day mode rehearses that exact pressure." },
  { icon: MessageCircleQuestion, title: "They will ask 'do you have questions?'", body: "Always say yes, and have two ready. It shows you care. Our Company Briefing gives you smart ones to ask." },
  { icon: Phone, title: "A short phone screen often comes first", body: "A recruiter calls for 15 minutes before the real interview. Treat it like the real thing. Same prep works." },
];

export default function WhatsChangedPage() {
  return (
    <>
      <div className="container-wide flex items-center justify-between py-6">
        <Logo />
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink">
          <ArrowLeft size={15} /> Home
        </Link>
      </div>

      <main className="container-content pb-16">
        <Reveal>
          <p className="eyebrow">A 2-minute catch-up</p>
        </Reveal>
        <Reveal delay={0.05}>
          <h1 className="mt-3 text-balance font-serif text-display font-semibold text-ink">
            What changed since you last interviewed.
          </h1>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mt-4 text-lg leading-relaxed text-ink-2">
            If your last interview was years ago, a few things are new. None of it is hard. Here is the short version.
          </p>
        </Reveal>

        <div className="mt-10 space-y-4">
          {ITEMS.map((it, i) => {
            const Icon = it.icon;
            return (
              <Reveal key={it.title} delay={i * 0.05}>
                <article className="card flex gap-4 p-6">
                  <span
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white shadow-sm"
                    style={{ background: "linear-gradient(140deg, var(--primary-bright), var(--primary-ink))" }}
                  >
                    <Icon size={20} />
                  </span>
                  <div>
                    <h2 className="font-serif text-lg font-semibold text-ink">{it.title}</h2>
                    <p className="mt-1 leading-relaxed text-ink-2">{it.body}</p>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>

        <Reveal delay={0.1}>
          <div className="mt-8 rounded-2xl border-2 p-6 text-center" style={{ borderColor: "var(--primary)", background: "var(--primary-soft)" }}>
            <Heart size={22} className="mx-auto text-primary-ink" />
            <h2 className="mt-2 font-serif text-xl font-semibold text-ink">The basics did not change.</h2>
            <p className="mx-auto mt-2 max-w-prose text-ink-2">
              Be clear. Be specific. Sound like yourself. That is what gets the job, and it is exactly what you can practice here.
            </p>
            <ButtonLink href="/onboarding" size="lg" className="mt-5">
              Practice it now, free <ArrowRight size={18} />
            </ButtonLink>
          </div>
        </Reveal>
      </main>
      <SiteFooter />
    </>
  );
}
