"use client";

import { useImperativeHandle, useRef, useState, forwardRef } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Eraser } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type SignaturePadHandle = {
  /** Returns a PNG data URL, or null if the pad is empty. */
  toDataURL: () => string | null;
  clear: () => void;
  isEmpty: () => boolean;
};

/**
 * Touch/stylus signature pad. White background so the exported PNG embeds
 * cleanly into the (light) PDF. Parent grabs the PNG via ref on submit.
 */
export const SignaturePad = forwardRef<
  SignaturePadHandle,
  { className?: string; clearLabel?: string }
>(function SignaturePad({ className, clearLabel = "Очистить" }, ref) {
  const padRef = useRef<SignatureCanvas | null>(null);
  const [hasInk, setHasInk] = useState(false);

  useImperativeHandle(ref, () => ({
    toDataURL: () => {
      const pad = padRef.current;
      if (!pad || pad.isEmpty()) return null;
      // Use the full canvas (trim API has known sizing issues in the alpha build).
      return pad.toDataURL("image/png");
    },
    clear: () => {
      padRef.current?.clear();
      setHasInk(false);
    },
    isEmpty: () => padRef.current?.isEmpty() ?? true,
  }));

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="relative overflow-hidden rounded-lg border border-border bg-white">
        <SignatureCanvas
          ref={padRef}
          penColor="#111827"
          onEnd={() => setHasInk(true)}
          canvasProps={{
            className: "h-48 w-full touch-none",
            "aria-label": "Signature pad",
          }}
        />
        {!hasInk ? (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-neutral-400">
            Pasirašykite čia
          </span>
        ) : null}
      </div>
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            padRef.current?.clear();
            setHasInk(false);
          }}
        >
          <Eraser className="size-3.5" />
          {clearLabel}
        </Button>
      </div>
    </div>
  );
});
