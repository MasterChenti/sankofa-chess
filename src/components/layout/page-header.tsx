import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  back,
  actions,
  className,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  back?: { href: string; label: string };
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex flex-col gap-3 sm:mb-8", className)}>
      {back && (
        <Link href={back.href} className="inline-flex w-fit items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" />
          {back.label}
        </Link>
      )}
      {(title || description || actions) && (
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            {title && <h1 className="text-[2rem] font-semibold leading-[1.05] sm:text-[2.6rem]">{title}</h1>}
            {description && <p className="text-muted-foreground">{description}</p>}
          </div>
          {actions}
        </div>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
  className,
}: {
  title: string;
  body?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-2 rounded-[var(--radius-lg)] border border-dashed border-border-strong px-6 py-10 text-center", className)}>
      <p className="font-semibold">{title}</p>
      {body && <p className="max-w-sm text-sm text-muted-foreground">{body}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
