"use client";

import { useRef, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { SignaturePad, type SignaturePadHandle } from "@/components/sign/SignaturePad";

/**
 * Public client-side signing flow used on /sign/[token].
 * Captures name + consent + signature, then POSTs to /api/sign which uploads
 * the PNG to Blob and consumes the token server-side.
 */
export function SignFlow({ token }: { token: string }) {
  const padRef = useRef<SignaturePadHandle>(null);
  const [name, setName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const onSubmit = async () => {
    setError(null);
    if (name.trim().length < 2) {
      setError("Įveskite savo vardą ir pavardę.");
      return;
    }
    if (!agreed) {
      setError("Pažymėkite, kad sutinkate su sąlygomis.");
      return;
    }
    const png = padRef.current?.toDataURL();
    if (!png) {
      setError("Pasirašykite parašo lauke.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          signerName: name.trim(),
          signaturePng: png,
          agreed: true,
        }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Nepavyko pasirašyti. Bandykite dar kartą.");
        return;
      }
      setDone(true);
    } catch {
      setError("Ryšio klaida. Patikrinkite internetą ir bandykite dar kartą.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-background-elevated p-6 text-center">
        <CheckCircle2 className="size-10 text-[var(--color-status-paid)]" />
        <p className="text-lg font-semibold">Pasirašyta sėkmingai</p>
        <p className="text-sm text-foreground-muted">
          Ačiū! Sutartis pasirašyta. Galite uždaryti šį langą.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-background-elevated p-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="signerName">Vardas, pavardė</Label>
        <Input
          id="signerName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Vardas Pavardė"
          autoComplete="name"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Parašas</Label>
        <SignaturePad ref={padRef} clearLabel="Išvalyti" />
      </div>

      <label className="flex items-start gap-2 text-sm">
        <Checkbox
          checked={agreed}
          onCheckedChange={(v) => setAgreed(v === true)}
          className="mt-0.5"
        />
        <span>Susipažinau su sutarties sąlygomis ir sutinku.</span>
      </label>

      {error ? (
        <p className="text-sm text-[hsl(var(--danger))]" role="alert">
          {error}
        </p>
      ) : null}

      <Button type="button" onClick={onSubmit} disabled={submitting} className="w-full">
        {submitting ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" />
            Pasirašoma…
          </span>
        ) : (
          "Pasirašyti"
        )}
      </Button>
    </div>
  );
}
