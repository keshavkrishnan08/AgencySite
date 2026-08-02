import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Footer, Glyph, Wordmark } from '@/components/Chrome';
import { BRAND } from '@/lib/brand';

const COMPANY = BRAND.name;
const CONTACT = BRAND.supportEmail;

interface Doc {
  title: string;
  updated: string;
  sections: { h: string; p: string[] }[];
}

const DOCS: Record<string, Doc> = {
  terms: {
    title: 'Terms of Service',
    updated: '31 July 2026',
    sections: [
      {
        h: 'What this service is',
        p: [
          `${COMPANY} computes an astrological birth chart, numerology life path and Chinese zodiac sign from the birth date, time and place you provide, and generates written material interpreting them in business terms.`,
          'The service is provided for self-reflection and planning. It is not financial, legal, medical, tax, or investment advice, and it does not predict events. No business outcome, income, or result is promised or implied. Every decision you make remains yours.',
        ],
      },
      {
        h: 'Your account',
        p: [
          'You must be at least 18 to hold an account. You are responsible for keeping your credentials secure and for all activity under your account.',
          'You may not resell, redistribute, or systematically extract the generated content, or use the service to build a competing product.',
        ],
      },
      {
        h: 'Subscriptions and billing',
        p: [
          'Paid access is billed through Stripe on a recurring basis — weekly at $7.99 or annually at $78.99 — until cancelled. Where a free trial applies, you will be charged when the trial ends unless you cancel before then.',
          'You can cancel at any time from the billing portal in your settings. Cancelling stops future renewals; access continues until the end of the period you have already paid for.',
        ],
      },
      {
        h: 'Generated content',
        p: [
          'Written interpretations are produced by an automated language model using your chart as input. They may contain errors and should be treated as a prompt for your own judgement, not as fact.',
          'You own the content generated for your chart and may use it for your own purposes.',
        ],
      },
      {
        h: 'Availability and liability',
        p: [
          'The service is provided as-is, without warranties of any kind. We do not guarantee uninterrupted availability.',
          `To the fullest extent permitted by law, ${COMPANY}'s total liability arising out of the service is limited to the amount you paid in the twelve months preceding the claim.`,
        ],
      },
      {
        h: 'Changes and contact',
        p: [
          'We may update these terms. Material changes will be notified by email or in the product before they take effect.',
          `Questions: ${CONTACT}.`,
        ],
      },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    updated: '31 July 2026',
    sections: [
      {
        h: 'What we collect',
        p: [
          'Birth data: your first name, date of birth, time of birth (if known), and place of birth. This is the input to your chart and is the only reason we ask for it.',
          'Account data: your email address, and a Stripe customer reference if you subscribe. We never see or store your card details — those go directly to Stripe.',
          'Usage data: pages viewed and funnel events, via PostHog and the Meta Pixel, used to understand where the product loses people.',
        ],
      },
      {
        h: 'How we use it',
        p: [
          'Birth data is used to compute your chart and to generate your reading, daily briefings and chat responses. Your chart is sent to Anthropic as context for generating that text.',
          'Your email is used for transactional messages, your daily briefing if you are subscribed, and — for free users who did not convert — a short sequence of follow-up emails you can unsubscribe from at any time.',
        ],
      },
      {
        h: 'What we never do',
        p: [
          'We do not sell your birth data or your email address. We do not share your birth data with advertisers. We do not use your data to train models.',
        ],
      },
      {
        h: 'Processors',
        p: [
          'Supabase (database and authentication), Stripe (payments), Anthropic (text generation), Resend (email), Vercel (hosting), PostHog (analytics), Meta (advertising measurement), and Open-Meteo (city-to-coordinate lookup).',
        ],
      },
      {
        h: 'Your rights',
        p: [
          'You can access, correct, export, or delete your data at any time. Deleting your account removes your birth data, charts, readings, briefings and chat history.',
          `To exercise any of these rights, email ${CONTACT}. If you are in the EEA or UK, you also have the right to complain to your local data protection authority.`,
        ],
      },
      {
        h: 'Retention',
        p: [
          'We keep your data while your account is active. If you delete your account, we remove it within 30 days, except where we are required to keep billing records for tax purposes.',
        ],
      },
    ],
  },
  refunds: {
    title: 'Refund Policy',
    updated: '31 July 2026',
    sections: [
      {
        h: 'The short version',
        p: [
          'If the product is not what you expected, email us within 7 days of your first payment and we will refund it in full. No form, no interrogation.',
        ],
      },
      {
        h: 'How to request one',
        p: [
          `Email ${CONTACT} from the address on your account. Refunds are processed to your original payment method and usually appear within 5–10 business days.`,
        ],
      },
      {
        h: 'Renewals',
        p: [
          'Cancel any time in the billing portal to stop future charges. If a renewal caught you by surprise, tell us within 7 days of the charge and we will refund that period.',
        ],
      },
      {
        h: 'Credit packs',
        p: [
          'Unused oracle credit packs are refundable within 7 days of purchase. Credits already spent are not.',
        ],
      },
    ],
  },
};

export function generateStaticParams() {
  return Object.keys(DOCS).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = DOCS[slug];
  return { title: doc ? `${doc.title} · ${BRAND.name}` : 'Not found' };
}

export default async function LegalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = DOCS[slug];
  if (!doc) notFound();

  return (
    <>
      <header className="border-b rule">
        <div className="mx-auto flex max-w-band items-center justify-center px-5 py-4">
          <Link href="/" className="flex items-center gap-2">
            <Glyph size={20} />
            <Wordmark className="text-lg" />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 py-14 sm:py-20">
        <h1 className="font-serif text-4xl">{doc.title}</h1>
        <p className="eyebrow mt-3">Last updated {doc.updated}</p>

        <div className="mt-12 space-y-10">
          {doc.sections.map((s) => (
            <section key={s.h}>
              <h2 className="font-serif text-2xl">{s.h}</h2>
              <div className="mt-3 space-y-3">
                {s.p.map((p, i) => (
                  <p key={i} className="text-[15px] leading-relaxed text-ink/75">
                    {p}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>

      <Footer />
    </>
  );
}
