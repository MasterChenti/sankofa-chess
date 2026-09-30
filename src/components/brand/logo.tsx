import { cn } from "@/lib/utils";

/**
 * Sankofa Chess mark: a knight that looks back toward the egg of knowledge,
 * standing on the twin spirals of the Sankofa heart. Works in monochrome
 * (pass egg="currentColor") and as an app icon.
 */
export function LogoMark({ className, egg = "var(--gold)", title }: { className?: string; egg?: string; title?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("size-8", className)} role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      <g transform="translate(64 0) scale(-1 1)">
        <path
          fill="currentColor"
          d="M20 50c.7-7.4 4.7-11.4 8.7-14.8-3.4 0-8.7 1.4-12.1-.1-3.5-1.4-4-4.6-2.7-7.3l6.7-10 1.3-6 4 3.3c10.7-2 18.7 6 18 19.4L42.6 50z"
        />
        <circle cx="22.1" cy="23.4" r="1.6" fill="var(--background)" />
      </g>
      <ellipse cx="47.5" cy="17.2" rx="4.3" ry="5.4" fill={egg} transform="rotate(18 47.5 17.2)" />
      <path
        d="M12 58c0-4 3-6 6-6s4 2.6 2.2 4.2M52 58c0-4-3-6-6-6s-4 2.6-2.2 4.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path d="M18 53.5h28" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 text-foreground", className)}>
      <LogoMark className="size-8" />
      <span className="font-display text-[1.15rem] font-semibold tracking-tight">Sankofa Chess</span>
    </span>
  );
}
