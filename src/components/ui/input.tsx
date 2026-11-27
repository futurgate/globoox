import * as React from "react"

import { cn } from "@/lib/utils"

export const fieldStyles = cn(
  "placeholder:text-[var(--app-text-muted)] selection:bg-[var(--app-accent)] selection:text-[var(--primary-foreground)] border-[var(--app-border)] bg-[var(--app-input-bg)] text-[var(--app-text)] w-full min-w-0 rounded-md border px-3 py-1 text-base shadow-xs transition-[color,box-shadow,background-color,border-color] outline-none disabled:pointer-events-none disabled:opacity-50 md:text-sm",
  "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
  "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
)

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        fieldStyles,
        "h-9 file:text-[var(--app-text)] file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        className
      )}
      {...props}
    />
  )
}

export { Input }
