import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <Logo href="/" />
      <p className="mt-10 font-serif text-7xl font-semibold text-primary-ink">404</p>
      <h1 className="mt-4 font-serif text-2xl font-semibold text-ink">This page took a different path.</h1>
      <p className="mt-2 max-w-sm text-ink-2">
        The page you&apos;re looking for isn&apos;t here. But your next practice session is.
      </p>
      <ButtonLink href="/" className="mt-8">
        <ArrowLeft size={16} /> Back home
      </ButtonLink>
    </main>
  );
}
