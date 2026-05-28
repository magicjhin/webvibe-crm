"use client";

import { cloneElement, isValidElement } from "react";
import type { ReactElement } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Lightweight form-row wrapper used in place of shadcn/ui's <Form>
 * (which is absent from the v4 registry). Label + control + error message.
 *
 * Wires aria-invalid + aria-describedby onto the immediate child control,
 * so screen readers announce the error message.
 */
export function Field({
  id,
  label,
  hint,
  error,
  required,
  className,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const errorId = error ? `${id}-error` : undefined;
  const hintId = hint && !error ? `${id}-hint` : undefined;
  const describedBy = errorId ?? hintId;

  // Best-effort: forward aria attrs to a single direct child control.
  const enhanced = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
      })
    : children;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={id} className="flex items-center gap-1">
        {label}
        {required ? <span className="text-foreground-muted">*</span> : null}
      </Label>
      {enhanced}
      {hintId ? (
        <p id={hintId} className="text-xs text-foreground-subtle">
          {hint}
        </p>
      ) : null}
      {errorId ? (
        <p id={errorId} className="text-xs text-[hsl(var(--danger))]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
