import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { WelcomePoller } from '@/components/WelcomePoller';
import { Glyph, Wordmark } from '@/components/Chrome';
import { getEntitlement } from '@/lib/entitlement';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Unlocking your access',
  robots: { index: false, follow: false },
};

/**
 * Where Stripe returns after a successful checkout.
 *
 * This is the single highest-stakes screen in the product: the card has been
 * charged and the user is waiting. The Stripe webhook that flips their
 * entitlement usually lands within a second or two, but it is asynchronous, so
 * this page holds them with a real explanation and polls until access is live
 * rather than dumping them somewhere that still says "locked".
 */
export default async function WelcomePage() {
  // If the webhook already landed before the redirect resolved — which is the
  // common case — skip the poller entirely and go straight in.
  const ent = await getEntitlement();
  if (ent.isPaid) redirect('/chart');

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <header className="flex items-center justify-center py-6">
        <div className="flex items-center gap-2 opacity-80">
          <Glyph size={20} />
          <Wordmark className="text-lg" />
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 pb-16">
        <WelcomePoller />
      </main>
    </div>
  );
}
