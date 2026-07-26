import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { SiteFooter } from "@/components/layout/SiteFooter";

export const metadata = {
  title: "Privacy Policy · Axon Careers",
  description: "How Axon Careers collects, uses, and protects your information.",
};

/* A detailed, legal-style privacy policy. It reflects what the product actually
   does, without naming individual sub-processors. Public page. */
export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b" style={{ borderColor: "var(--border)" }}>
        <div className="container-wide flex h-16 items-center justify-between">
          <Logo />
          <Link href="/" className="text-sm font-medium text-ink-2 hover:text-ink">← Back to home</Link>
        </div>
      </header>

      <main className="container-wide py-12 sm:py-16">
        <div className="mx-auto max-w-3xl">
          <p className="eyebrow">Legal</p>
          <h1 className="mt-3 font-serif text-4xl font-semibold text-ink">Privacy Policy</h1>
          <p className="mt-2 text-ink-3">Effective date: July 26, 2026. Last updated: July 26, 2026.</p>

          <p className="mt-8 leading-relaxed text-ink-2">
            This Privacy Policy describes how Axon Careers (&ldquo;Axon Careers,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo;
            or &ldquo;our&rdquo;) collects, uses, discloses, and safeguards information in connection with our interview
            practice application, website, and related services (collectively, the &ldquo;Services&rdquo;). By accessing
            or using the Services, you acknowledge that you have read and understood this Policy. If you do not agree with
            our practices, please do not use the Services.
          </p>

          <div className="mt-10 space-y-9">
            <Section n="1" title="Scope of this Policy">
              <p>
                This Policy applies to information we process about visitors, registered account holders, and prospective
                users of the Services. It does not apply to third-party websites, products, or services that we do not own
                or control, even where those services are linked from or integrated with the Services. Your use of any
                third-party service is governed by that party&apos;s own terms and privacy practices.
              </p>
            </Section>

            <Section n="2" title="Information we collect">
              <p>We collect the following categories of information, in each case only to the extent needed to provide and improve the Services:</p>
              <ul className="mt-3 list-disc space-y-2 pl-5">
                <li><strong className="text-ink">Account information.</strong> Your name, email address, and authentication credentials, which allow you to create and access your account and which we use to communicate with you about the Services.</li>
                <li><strong className="text-ink">Profile and preference information.</strong> Details you provide about your target role, industry, employer, seniority, situation, time since your last interview, and practice preferences, which we use to tailor the Services to you.</li>
                <li><strong className="text-ink">Practice content.</strong> The answers you type or speak, the questions presented to you, the scores and feedback generated, and your progress and history over time. This content is the core of the Services and is retained so that your metrics and coaching remain consistent across sessions and devices.</li>
                <li><strong className="text-ink">Usage and analytics information.</strong> Information about how you interact with the Services, including pages viewed, features used, session activity, and referring sources, which we use to understand engagement and improve the product.</li>
                <li><strong className="text-ink">Device and technical information.</strong> Information automatically collected when you access the Services, such as browser type, device characteristics, operating system, general location inferred from IP address, and similar technical identifiers.</li>
                <li><strong className="text-ink">Payment information.</strong> Where you purchase a subscription, billing is handled by our payment processor. We receive limited transaction and subscription-status information but do not collect or store your full payment card number.</li>
                <li><strong className="text-ink">Communications.</strong> Information you provide when you contact us for support or otherwise correspond with us.</li>
              </ul>
            </Section>

            <Section n="3" title="How we use your information">
              <p>We use the information described above to:</p>
              <ul className="mt-3 list-disc space-y-2 pl-5">
                <li>provide, operate, maintain, and secure the Services;</li>
                <li>personalize your experience, including generating tailored questions, scoring, feedback, and progress metrics;</li>
                <li>process transactions and manage your subscription and account status;</li>
                <li>communicate with you about the Services, including service-related notices and, where permitted, product updates;</li>
                <li>monitor and analyze usage and trends to develop and improve the Services;</li>
                <li>detect, investigate, and prevent fraud, abuse, security incidents, and other harmful or unlawful activity; and</li>
                <li>comply with our legal obligations and enforce our terms.</li>
              </ul>
            </Section>

            <Section n="4" title="Legal bases for processing">
              <p>
                Where applicable law requires a legal basis for processing (for example, under the EU/UK General Data
                Protection Regulation), we rely on one or more of the following: performance of a contract with you;
                your consent, where requested; our legitimate interests in operating, securing, and improving the
                Services in a manner not overridden by your rights; and compliance with legal obligations. Where we rely
                on consent, you may withdraw it at any time without affecting the lawfulness of prior processing.
              </p>
            </Section>

            <Section n="5" title="Voice and audio">
              <p>
                When you choose to practice by voice, your spoken answer is transcribed to text. We store the resulting
                text as part of your practice content; we do not retain the underlying audio recording after transcription
                is complete. Depending on your device and settings, transcription may be performed on your device or by a
                third-party processing service acting on our behalf under contractual confidentiality and security
                obligations. You may use the typed practice mode at any time if you prefer not to submit audio.
              </p>
            </Section>

            <Section n="6" title="How we share information">
              <p>
                We do not sell your personal information, and we do not share it with employers, recruiters, or your
                personal contacts. We disclose information only in the limited circumstances described below:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5">
                <li><strong className="text-ink">Service providers.</strong> We engage trusted third-party vendors to perform functions on our behalf, such as hosting, data storage, payment processing, transcription and language processing, analytics, and communications. These providers may process your information only as necessary to provide their services to us, under contractual obligations of confidentiality and data protection, and are not permitted to use it for their own purposes.</li>
                <li><strong className="text-ink">Legal and safety.</strong> We may disclose information where we believe in good faith that doing so is required by law, regulation, legal process, or governmental request, or is necessary to protect the rights, property, or safety of Axon Careers, our users, or others.</li>
                <li><strong className="text-ink">Business transfers.</strong> If we are involved in a merger, acquisition, financing, reorganization, or sale of assets, information may be transferred as part of that transaction, subject to the commitments in this Policy.</li>
                <li><strong className="text-ink">With your direction.</strong> We may share information at your request or with your consent.</li>
              </ul>
              <p className="mt-3">
                We do not publicly disclose the identities of our individual sub-processors in this Policy. We remain
                responsible for information processed on our behalf and require each provider to maintain appropriate
                safeguards.
              </p>
            </Section>

            <Section n="7" title="Cookies and similar technologies">
              <p>
                We and our service providers use cookies, local storage, and similar technologies to keep you signed in,
                remember your preferences, secure the Services, and measure usage. You can control cookies through your
                browser settings; disabling certain cookies may affect the functionality of the Services.
              </p>
            </Section>

            <Section n="8" title="Data retention">
              <p>
                We retain your information for as long as your account is active or as needed to provide the Services. When
                you delete your account, we delete or de-identify your profile and practice content within a commercially
                reasonable period, except where retention is required to comply with legal obligations, resolve disputes,
                prevent fraud and abuse, or enforce our agreements. Certain billing and transaction records may be retained
                for the period required by applicable law.
              </p>
            </Section>

            <Section n="9" title="Your rights and choices">
              <p>
                Depending on your location, you may have rights in respect of your personal information, including the
                rights to access, correct, export, restrict, or object to certain processing, and to request deletion. You
                can:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5">
                <li><strong className="text-ink">Access and export</strong> the information we hold about you from your account settings;</li>
                <li><strong className="text-ink">Delete</strong> your account and associated practice content from your account settings, which cannot be undone;</li>
                <li><strong className="text-ink">Correct</strong> your profile information at any time within the Services; and</li>
                <li><strong className="text-ink">Cancel</strong> your subscription at any time; you retain access until the end of the period you have paid for.</li>
              </ul>
              <p className="mt-3">
                To exercise any right that is not available in-product, contact us using the details below. We will respond
                consistent with applicable law and may need to verify your identity before acting on a request. You will
                not be discriminated against for exercising your rights.
              </p>
            </Section>

            <Section n="10" title="Security">
              <p>
                We maintain administrative, technical, and organizational measures designed to protect information against
                unauthorized access, disclosure, alteration, and destruction, including encryption in transit and access
                controls that restrict data to the owner of an account. No method of transmission or storage is completely
                secure, however, and we cannot guarantee absolute security. You are responsible for keeping your account
                credentials confidential.
              </p>
            </Section>

            <Section n="11" title="International data transfers">
              <p>
                We may process and store information in countries other than the one in which you reside. Where we transfer
                information across borders, we take steps to ensure that it receives an adequate level of protection,
                including through appropriate contractual safeguards where required by applicable law.
              </p>
            </Section>

            <Section n="12" title="Children's privacy">
              <p>
                The Services are intended for adults and are not directed to children under the age of 16. We do not
                knowingly collect personal information from children. If you believe a child has provided us with personal
                information, please contact us and we will take appropriate steps to delete it.
              </p>
            </Section>

            <Section n="13" title="Changes to this Policy">
              <p>
                We may update this Policy from time to time. When we make material changes, we will revise the &ldquo;Last
                updated&rdquo; date above and, where appropriate, provide additional notice. Your continued use of the
                Services after an update constitutes acceptance of the revised Policy.
              </p>
            </Section>

            <Section n="14" title="Contact us">
              <p>
                If you have questions about this Policy or our privacy practices, or wish to exercise your rights, contact
                us at{" "}
                <a href="mailto:keshav@axonservices.dev" className="link">keshav@axonservices.dev</a>. We will respond
                within a reasonable timeframe.
              </p>
            </Section>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-serif text-xl font-semibold text-ink">
        <span className="mr-2 text-ink-3">{n}.</span>{title}
      </h2>
      <div className="mt-3 leading-relaxed text-ink-2">{children}</div>
    </section>
  );
}
