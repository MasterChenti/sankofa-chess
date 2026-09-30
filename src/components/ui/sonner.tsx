"use client";

import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      position="top-center"
      offset={72}
      toastOptions={{
        classNames: {
          toast:
            "!rounded-full !border !border-border !bg-foreground !text-background !shadow-float !px-4 !py-2.5 !text-sm !font-semibold !w-auto !min-h-0",
          description: "!text-background/70",
        },
      }}
    />
  );
}
