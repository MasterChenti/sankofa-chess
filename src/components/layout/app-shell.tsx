"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Settings, Trophy, User, Users } from "lucide-react";
import { Wordmark } from "@/components/brand/logo";
import { BOTTOM_NAV, PRIMARY_NAV, isActiveNav } from "@/config/nav";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { signOut } from "@/features/auth/actions";
import { cn } from "@/lib/utils";

type ShellUser = { displayName: string; username: string; level: number; levelName: string; levelProgress: number; xp: number };

export function AppHeader({ user }: { user: ShellUser }) {
  const pathname = usePathname();
  return (
    <header className="pt-safe sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href="/app/today" className="shrink-0" aria-label="Sankofa Chess home">
          <Wordmark />
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {PRIMARY_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActiveNav(pathname, item) ? "page" : undefined}
              className={cn(
                "rounded-[var(--radius-sm)] px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground",
                isActiveNav(pathname, item) && "bg-surface-2 text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-4">
          <Link href="/app/challenges" className="hidden items-center gap-2 sm:flex" aria-label={`Sankofa Level ${user.level}, ${user.levelName}`}>
            <span className="text-xs font-semibold text-muted-foreground">Lv {user.level}</span>
            <Progress value={user.levelProgress} className="w-16" />
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger
              className="grid size-10 place-items-center rounded-full bg-brown font-display text-base font-semibold text-ivory ring-offset-2 ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Account menu"
            >
              {user.displayName.slice(0, 1).toUpperCase()}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                <p className="font-semibold">{user.displayName}</p>
                <p className="text-xs text-muted-foreground">
                  @{user.username} · Level {user.level} {user.levelName}
                </p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/app/profile">
                  <User /> Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/app/challenges">
                  <Trophy /> Challenges
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="lg:hidden">
                <Link href="/app/community">
                  <Users /> Community
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/app/settings">
                  <Settings /> Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => void signOut()} data-testid="logout">
                <LogOut /> Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/92 backdrop-blur-md lg:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {BOTTOM_NAV.map((item) => {
          const { href, label, icon: Icon } = item;
          const active = isActiveNav(pathname, item);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-[0.72rem] font-semibold text-faint transition-colors",
                  active && "text-accent-foreground",
                )}
              >
                <Icon className="size-[22px]" strokeWidth={active ? 2.2 : 1.8} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
