import type { Metadata } from "next";
import { LoginForm } from "@/features/auth/components/auth-forms";
import { env } from "@/config/env";
import { safeNext } from "@/features/auth/schemas";

export const metadata: Metadata = { title: "Log in" };

const NOTICES: Record<string, string> = {
  auth: "That sign-in link didn’t work. Please try again.",
  confirm: "That confirmation link has expired. Log in or sign up again to get a new one.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return <LoginForm googleEnabled={env.googleAuthEnabled} next={safeNext(next)} notice={error ? NOTICES[error] ?? null : null} />;
}
