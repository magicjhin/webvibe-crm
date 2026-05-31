"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Link2, Loader2, PenLine, Share2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field } from "@/components/forms/Field";
import { SignaturePad, type SignaturePadHandle } from "@/components/sign/SignaturePad";
import { generateContractSignToken } from "@/lib/actions/contracts";

/**
 * Owner-facing signing panel on /contracts/[id]:
 *   1. Generate a shareable /sign/{token} link (TTL 7 days) for the client.
 *   2. Sign in-app (the owner signs the contract themselves, no token to send).
 * Only rendered for draft/sent contracts.
 */
export function ContractSignPanel({
  contractId,
}: {
  contractId: string;
}) {
  const router = useRouter();
  const [isGenerating, startGenerate] = useTransition();
  const [signUrl, setSignUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const padRef = useRef<SignaturePadHandle>(null);
  const [signerName, setSignerName] = useState("");
  const [isSigning, setIsSigning] = useState(false);

  const onGenerate = () => {
    startGenerate(async () => {
      const result = await generateContractSignToken(contractId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const url = `${window.location.origin}/sign/${result.data.token}`;
      setSignUrl(url);
      setExpiresAt(result.data.expiresAt);
      toast.success("Ссылка создана. Действует 7 дней.");
      router.refresh();
    });
  };

  const onCopy = async () => {
    if (!signUrl) return;
    try {
      await navigator.clipboard.writeText(signUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Не удалось скопировать");
    }
  };

  const onShare = async () => {
    if (!signUrl) return;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "Sutarties pasirašymas", url: signUrl });
      } catch {
        /* user cancelled */
      }
    } else {
      await onCopy();
    }
  };

  const onSelfSign = async () => {
    if (signerName.trim().length < 2) {
      toast.error("Укажи имя подписанта");
      return;
    }
    const png = padRef.current?.toDataURL();
    if (!png) {
      toast.error("Поставь подпись");
      return;
    }
    setIsSigning(true);
    try {
      const res = await fetch(`/api/contracts/${contractId}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signerName: signerName.trim(), signaturePng: png }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !json.ok) {
        toast.error(json.error ?? "Не удалось подписать");
        return;
      }
      toast.success("Договор подписан");
      router.refresh();
    } catch {
      toast.error("Ошибка сети");
    } finally {
      setIsSigning(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Link2 className="size-4" />
            Ссылка для подписи
          </CardTitle>
          <CardDescription>
            Отправь клиенту — он подпишет пальцем на телефоне. TTL 7 дней, одноразовая.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {signUrl ? (
            <>
              <div className="flex gap-2">
                <Input readOnly value={signUrl} className="font-mono text-xs" />
                <Button type="button" variant="outline" size="icon" onClick={onCopy} aria-label="Скопировать">
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                </Button>
                <Button type="button" variant="outline" size="icon" onClick={onShare} aria-label="Поделиться">
                  <Share2 className="size-4" />
                </Button>
              </div>
              {expiresAt ? (
                <p className="text-xs text-foreground-muted">
                  Действует до {new Date(expiresAt).toLocaleString("lt-LT")}
                </p>
              ) : null}
              <Button type="button" variant="ghost" size="sm" className="self-start" onClick={onGenerate} disabled={isGenerating}>
                Сгенерировать новую ссылку
              </Button>
            </>
          ) : (
            <Button type="button" onClick={onGenerate} disabled={isGenerating}>
              {isGenerating ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Создаём…
                </span>
              ) : (
                <>
                  <Link2 className="size-4" />
                  Сгенерировать ссылку
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PenLine className="size-4" />
            Подписать самому
          </CardTitle>
          <CardDescription>
            Подпиши договор прямо здесь, без отправки ссылки клиенту.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Field id="selfSignerName" label="Имя подписанта" required>
            <Input
              id="selfSignerName"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="Vardas Pavardė"
            />
          </Field>
          <SignaturePad ref={padRef} />
          <Button type="button" onClick={onSelfSign} disabled={isSigning} className="self-end">
            {isSigning ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                Подписываем…
              </span>
            ) : (
              "Подписать"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
