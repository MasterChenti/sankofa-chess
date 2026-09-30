"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { FieldError, Label } from "@/components/ui/label";
import { COUNTRIES } from "@/config/countries";
import { profileSchema } from "@/features/auth/schemas";
import { updateProfile } from "@/features/auth/actions";
import type { z } from "zod";

type Values = z.input<typeof profileSchema>;

export function ProfileForm({ defaults }: { defaults: Values }) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const form = useForm<Values>({ resolver: zodResolver(profileSchema), defaultValues: defaults });
  const { register, handleSubmit, formState, setError } = form;
  const errors = formState.errors;

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const res = await updateProfile(values);
    if (res.fieldErrors) Object.entries(res.fieldErrors).forEach(([k, m]) => setError(k as keyof Values, { message: m }));
    else if (res.ok) toast("Profile saved.");
    else if (res.message) setServerError(res.message);
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="displayName">First name</Label>
          <Input id="displayName" autoComplete="given-name" aria-invalid={!!errors.displayName} {...register("displayName")} />
          <FieldError message={errors.displayName?.message} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="username">Username</Label>
          <Input id="username" autoComplete="username" aria-invalid={!!errors.username} {...register("username")} />
          <FieldError message={errors.username?.message} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="country">Country</Label>
          <Select id="country" aria-invalid={!!errors.country} {...register("country")}>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </Select>
          <FieldError message={errors.country?.message} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="chessLevel">Chess experience</Label>
          <Select id="chessLevel" {...register("chessLevel")}>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </Select>
        </div>
      </div>
      {serverError && <FieldError message={serverError} />}
      <Button type="submit" className="w-fit" disabled={formState.isSubmitting}>
        {formState.isSubmitting ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
