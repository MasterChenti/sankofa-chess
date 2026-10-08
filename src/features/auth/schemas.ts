import { z } from "zod";
import { COUNTRY_CODES } from "@/config/countries";

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_.]{3,20}$/, "3–20 characters: letters, numbers, dots or underscores.");

export const chessLevelSchema = z.enum(["beginner", "intermediate", "advanced"], { error: "Choose your chess experience." });

export const signupSchema = z.object({
  displayName: z.string().trim().min(1, "Enter your first name.").max(40, "Keep it under 40 characters."),
  username: usernameSchema,
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address.")),
  password: z.string().min(8, "Use at least 8 characters.").max(72, "Use at most 72 characters."),
  country: z.string().refine((c) => COUNTRY_CODES.includes(c), "Choose your country."),
  chessLevel: chessLevelSchema,
});
export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address.")),
  password: z.string().min(1, "Enter your password."),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const onboardingSchema = z.object({
  chessLevel: chessLevelSchema,
  goal: z.enum(["basics", "tactics", "strategy", "tournaments", "fun"], { error: "Choose what you want to improve." }),
  timezone: z.string().max(64).optional(),
});
export type OnboardingInput = z.infer<typeof onboardingSchema>;

export const profileSchema = z.object({
  displayName: z.string().trim().min(1, "Enter your name.").max(40, "Keep it under 40 characters."),
  username: usernameSchema,
  country: z.string().refine((c) => COUNTRY_CODES.includes(c), "Choose your country."),
  chessLevel: chessLevelSchema,
});
export type ProfileInput = z.infer<typeof profileSchema>;

/** Only same-site relative paths are allowed as post-login redirects. */
export function safeNext(next: string | null | undefined, fallback = "/app/today") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
