import Link from "next/link";
import { LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-5 px-6 text-center">
      <LogoMark className="size-14 text-foreground" />
      <h1 className="text-3xl font-semibold">This square is empty.</h1>
      <p className="text-muted-foreground">The page you were looking for isn’t here. Go back and get it — from the start.</p>
      <Button asChild>
        <Link href="/">Back to Sankofa Chess</Link>
      </Button>
    </main>
  );
}
