import Link from "next/link";
import { Wordmark } from "@/components/brand/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="pt-safe mx-auto flex h-16 max-w-6xl items-center px-4 sm:px-6">
        <Link href="/" aria-label="Sankofa Chess home">
          <Wordmark />
        </Link>
      </header>
      <main className="mx-auto w-full max-w-[460px] px-4 pb-20 pt-6 sm:pt-12">{children}</main>
    </div>
  );
}
