import * as React from "react";
import { cn } from "../../lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-10 w-full rounded-xl border bg-card px-3 text-sm shadow-line outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:opacity-60",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";
