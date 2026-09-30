"use client";

import * as React from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

type Theme = "dark" | "light" | "system";

function apply(t: Theme) {
  const resolved = t === "system" ? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark") : t;
  document.documentElement.dataset.theme = resolved;
}

export function ThemeToggle() {
  const [theme, setTheme] = React.useState<Theme>("dark");
  React.useEffect(() => {
    try {
      setTheme((localStorage.getItem("sankofa-theme") as Theme) || "dark");
    } catch {
      /* ignore */
    }
  }, []);
  function choose(t: Theme) {
    setTheme(t);
    try {
      localStorage.setItem("sankofa-theme", t);
    } catch {
      /* ignore */
    }
    apply(t);
  }
  const opts: [Theme, string, React.ElementType][] = [
    ["dark", "Dark", Moon],
    ["light", "Light", Sun],
    ["system", "System", Monitor],
  ];
  return (
    <div role="radiogroup" aria-label="Theme" className="inline-flex gap-1 rounded-[var(--radius-md)] bg-surface-2 p-1">
      {opts.map(([v, l, Icon]) => (
        <button
          key={v}
          role="radio"
          aria-checked={theme === v}
          onClick={() => choose(v)}
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-[calc(var(--radius-md)-4px)] px-3.5 text-sm font-semibold text-muted-foreground",
            theme === v && "bg-card text-foreground shadow-card",
          )}
        >
          <Icon className="size-4" /> {l}
        </button>
      ))}
    </div>
  );
}
