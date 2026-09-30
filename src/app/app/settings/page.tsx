import type { Metadata } from "next";
import { LogOut } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePlayer } from "@/features/auth/session";
import { signOut } from "@/features/auth/actions";
import { ProfileForm } from "@/features/profile/components/profile-form";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { profile, user } = await requirePlayer();
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <PageHeader title="Settings" />
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>How other players see you on the leaderboard.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm
            defaults={{
              displayName: profile.display_name,
              username: profile.username,
              country: profile.country,
              chessLevel: profile.chess_level,
            }}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Dark is the Sankofa default. Light works well outdoors.</CardDescription>
        </CardHeader>
        <CardContent>
          <ThemeToggle />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Signed in as {user.email}.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <form action={signOut}>
            <Button type="submit" variant="secondary">
              <LogOut /> Log out
            </Button>
          </form>
          <p className="text-xs text-muted-foreground">
            To delete your account and all your data, contact support. Self-service deletion is planned before public launch.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
