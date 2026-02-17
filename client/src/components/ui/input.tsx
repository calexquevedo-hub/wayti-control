import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, id, name, ...props }, ref) => {
    const reactId = React.useId();
    const fallbackId = `input-${reactId.replace(/[:]/g, "")}`;
    const resolvedId = id ?? fallbackId;
    const resolvedName = name ?? resolvedId;

    return (
      <input
        type={type}
        id={resolvedId}
        name={resolvedName}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
