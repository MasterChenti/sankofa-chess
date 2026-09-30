import type { Metadata } from "next";
import { SignupForm } from "@/features/auth/components/auth-forms";
import { env } from "@/config/env";

export const metadata: Metadata = { title: "Join" };

export default function SignupPage() {
  return <SignupForm googleEnabled={env.googleAuthEnabled} />;
}
