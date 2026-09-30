"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { FieldError, FieldHint, Label } from "@/components/ui/label";
import { COUNTRIES } from "@/config/countries";
import { loginSchema, signupSchema } from "@/features/auth/schemas";
import { logIn, signInWithGoogle, signUp, type ActionState } from "@/features/auth/actions";
import type { z } from "zod";
import { cn } from "@/lib/utils";

export function GoogleButton({ enabled, next }: { enabled: boolean; next?: string }) {
  const [pending, start] = React.useTransition();
  const [msg, setMsg] = React.useState<string | null>(null);
  return (
    <div className="flex flex-col gap-1.5">
      <Button
        type="button"
        variant="secondary"
        className="w-full"
        disabled={!enabled || pending}
        onClick={() =>
          start(async () => {
            const r = await signInWithGoogle(next);
            if (r?.message) setMsg(r.message);
          })
        }
      >
        <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden>
          <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.3 12 2.3 6.6 2.3 2.3 6.6 2.3 12s4.3 9.7 9.7 9.7c5.6 0 9.3-3.9 9.3-9.5 0-.6-.1-1.1-.2-1.6z" />
        </svg>
        Continue with Google
      </Button>
      {!enabled && <p className="text-center text-xs text-faint">Google sign-in is coming soon.</p>}
      {msg && <FieldError message={msg} />}
    </div>
  );
}

function Divider({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-xs text-faint">
      <span className="h-px flex-1 bg-border" />
      {children}
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

type SignupValues = z.input<typeof signupSchema>;

export function SignupForm({ googleEnabled }: { googleEnabled: boolean }) {
  const [state, setState] = React.useState<ActionState>({});
  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { displayName: "", username: "", email: "", password: "", country: "", chessLevel: undefined as unknown as SignupValues["chessLevel"] },
  });
  const { register, handleSubmit, formState, setError, watch, setValue } = form;
  const errors = formState.errors;
  const level = watch("chessLevel");

  const onSubmit = handleSubmit(async (values) => {
    setState({});
    const res = await signUp(values);
    if (!res) return;
    if (res.fieldErrors) Object.entries(res.fieldErrors).forEach(([k, m]) => setError(k as keyof SignupValues, { message: m }));
    setState(res);
  });

  if (state.checkEmail) {
    return (
      <div className="flex flex-col items-start gap-4">
        <MailCheck className="size-10 text-accent-foreground" />
        <h1 className="text-3xl font-semibold">Check your email.</h1>
        <p className="text-muted-foreground">
          We sent a confirmation link to <span className="font-semibold text-foreground">{watch("email")}</span>. Open it on this device to finish creating your account.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[2.2rem] font-semibold leading-tight">Create your account</h1>
        <p className="text-muted-foreground">It takes a minute. Your progress is saved from your first move.</p>
      </div>
      <GoogleButton enabled={googleEnabled} next="/onboarding" />
      <Divider>or with email</Divider>
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="displayName">First name</Label>
            <Input id="displayName" autoComplete="given-name" aria-invalid={!!errors.displayName} {...register("displayName")} />
            <FieldError message={errors.displayName?.message} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="username">Username</Label>
            <Input id="username" autoComplete="username" autoCapitalize="none" aria-invalid={!!errors.username} {...register("username")} />
            <FieldError message={errors.username?.message} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" inputMode="email" aria-invalid={!!errors.email} {...register("email")} />
          <FieldError message={errors.email?.message} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" autoComplete="new-password" aria-invalid={!!errors.password} {...register("password")} />
          {!errors.password && <FieldHint>At least 8 characters.</FieldHint>}
          <FieldError message={errors.password?.message} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="country">Country</Label>
          <Select id="country" aria-invalid={!!errors.country} {...register("country")}>
            <option value="">Choose your country</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </Select>
          <FieldError message={errors.country?.message} />
        </div>
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-sm font-semibold">Chess experience</legend>
          <div className="grid grid-cols-3 gap-2">
            {(["beginner", "intermediate", "advanced"] as const).map((l) => (
              <button
                key={l}
                type="button"
                aria-pressed={level === l}
                onClick={() => setValue("chessLevel", l, { shouldValidate: true })}
                className={cn(
                  "h-11 rounded-[var(--radius-md)] border text-sm font-semibold capitalize transition-colors",
                  level === l ? "border-gold bg-accent text-accent-foreground" : "border-border-strong hover:bg-surface-2",
                )}
              >
                {l}
              </button>
            ))}
          </div>
          <FieldError message={errors.chessLevel?.message} />
        </fieldset>
        {state.message && <FieldError message={state.message} />}
        <Button type="submit" size="lg" className="mt-1 w-full" disabled={formState.isSubmitting} data-testid="signup-submit">
          {formState.isSubmitting ? "Creating your account…" : "Create account"}
        </Button>
        <p className="text-xs text-muted-foreground">
          We only ask for what we need to run your account. We never show your email publicly.
        </p>
      </form>
      <p className="text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-accent-foreground hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}

type LoginValues = z.input<typeof loginSchema>;

export function LoginForm({ googleEnabled, next, notice }: { googleEnabled: boolean; next?: string; notice?: string | null }) {
  const [state, setState] = React.useState<ActionState>({});
  const form = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });
  const { register, handleSubmit, formState, setError } = form;
  const errors = formState.errors;

  const onSubmit = handleSubmit(async (values) => {
    setState({});
    const res = await logIn(values, next);
    if (!res) return;
    if (res.fieldErrors) Object.entries(res.fieldErrors).forEach(([k, m]) => setError(k as keyof LoginValues, { message: m }));
    setState(res);
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[2.2rem] font-semibold leading-tight">Welcome back</h1>
        <p className="text-muted-foreground">Log in to continue your streak.</p>
      </div>
      {notice && <p className="rounded-[var(--radius-md)] bg-surface-2 px-4 py-3 text-sm">{notice}</p>}
      <GoogleButton enabled={googleEnabled} next={next} />
      <Divider>or with email</Divider>
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" inputMode="email" aria-invalid={!!errors.email} {...register("email")} />
          <FieldError message={errors.email?.message} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" autoComplete="current-password" aria-invalid={!!errors.password} {...register("password")} />
          <FieldError message={errors.password?.message} />
        </div>
        {state.message && <FieldError message={state.message} />}
        <Button type="submit" size="lg" className="mt-1 w-full" disabled={formState.isSubmitting} data-testid="login-submit">
          {formState.isSubmitting ? "Logging in…" : "Log in"}
        </Button>
      </form>
      <p className="text-sm text-muted-foreground">
        New to Sankofa Chess?{" "}
        <Link href="/signup" className="font-semibold text-accent-foreground hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
