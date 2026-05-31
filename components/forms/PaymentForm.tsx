"use client";

import { useEffect, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { formatInTimeZone } from "date-fns-tz";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field } from "@/components/forms/Field";
import { MoneyDisplay } from "@/components/data/MoneyDisplay";
import {
  paymentSchema,
  type PaymentInput,
  PAYMENT_KINDS,
} from "@/lib/validators/payment";
import { createPayment } from "@/lib/actions/payments";

export type ClientOption = { id: string; name: string };
export type ProjectOption = { id: string; title: string; clientId: string };
export type InvoiceOption = {
  id: string;
  number: string;
  clientId: string;
  projectId: string | null;
  total: string;
  paid: string;
};

type Props = {
  clients: ClientOption[];
  projects: ProjectOption[];
  invoices: InvoiceOption[];
  initial?: Partial<PaymentInput>;
};

const KIND_LABEL: Record<(typeof PAYMENT_KINDS)[number], string> = {
  advance: "Аванс",
  final: "Остаток",
  full: "Полная оплата",
  maintenance: "Поддержка",
  other: "Другое",
};

// Date-only "today" в проектной TZ; UTC slice сдвигает день около полуночи.
const PROJECT_TZ = "Europe/Vilnius";
const todayISO = () => formatInTimeZone(new Date(), PROJECT_TZ, "yyyy-MM-dd");

export function PaymentForm({ clients, projects, invoices, initial }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Если invoice предзадан через ?invoiceId — посчитать остаток сразу на mount,
  // чтобы пользователь увидел сумму без необходимости трогать select.
  const prefillInvoice = initial?.invoiceId
    ? invoices.find((i) => i.id === initial.invoiceId)
    : null;
  const prefillAmount = prefillInvoice
    ? Math.max(0, Number(prefillInvoice.total) - Number(prefillInvoice.paid)).toFixed(2)
    : (initial?.amount ?? "");

  const defaultValues: PaymentInput = {
    clientId: prefillInvoice?.clientId ?? initial?.clientId ?? "",
    projectId: prefillInvoice
      ? prefillInvoice.projectId
      : (initial?.projectId ?? null),
    invoiceId: initial?.invoiceId ?? null,
    kind: initial?.kind ?? "advance",
    amount: prefillAmount,
    currency: "EUR",
    paidAt: initial?.paidAt ?? todayISO(),
    note: initial?.note ?? null,
  };

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<PaymentInput>({
    resolver: zodResolver(paymentSchema),
    defaultValues,
  });

  const selectedClientId = useWatch({ control, name: "clientId" });
  const selectedProjectId = useWatch({ control, name: "projectId" });
  const selectedInvoiceId = useWatch({ control, name: "invoiceId" });

  const projectsForClient = useMemo(
    () => (selectedClientId ? projects.filter((p) => p.clientId === selectedClientId) : []),
    [projects, selectedClientId],
  );

  const invoicesForContext = useMemo(() => {
    if (!selectedClientId) return [] as InvoiceOption[];
    return invoices.filter(
      (i) =>
        i.clientId === selectedClientId &&
        (!selectedProjectId || i.projectId === selectedProjectId),
    );
  }, [invoices, selectedClientId, selectedProjectId]);

  // Reset cascading selects when client changes (unless edit-style pre-fill).
  useEffect(() => {
    if (!selectedClientId) return;
    // Drop project if it doesn't belong to the new client
    const projectOk = selectedProjectId
      ? projectsForClient.some((p) => p.id === selectedProjectId)
      : true;
    if (!projectOk) setValue("projectId", null);
    // Drop invoice if it doesn't match the new context
    const invoiceOk = selectedInvoiceId
      ? invoicesForContext.some((i) => i.id === selectedInvoiceId)
      : true;
    if (!invoiceOk) setValue("invoiceId", null);
  }, [selectedClientId, selectedProjectId, projectsForClient, invoicesForContext, selectedInvoiceId, setValue]);

  const selectedInvoice = selectedInvoiceId
    ? invoices.find((i) => i.id === selectedInvoiceId) ?? null
    : null;

  const remaining = selectedInvoice
    ? Math.max(0, Number(selectedInvoice.total) - Number(selectedInvoice.paid))
    : null;

  const onSubmit = (data: PaymentInput) => {
    startTransition(async () => {
      const result = await createPayment(data);
      if (result.ok) {
        toast.success("Платёж добавлен");
        if (data.invoiceId) router.push(`/invoices/${data.invoiceId}`);
        else router.push("/payments");
      } else {
        toast.error(result.error);
      }
    });
  };

  const noClients = clients.length === 0;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6" noValidate>
      <Card>
        <CardHeader>
          <CardTitle>Параметры платежа</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field id="clientId" label="Клиент" required error={errors.clientId?.message}>
            <Controller
              control={control}
              name="clientId"
              render={({ field }) => (
                <Select
                  value={field.value || undefined}
                  onValueChange={field.onChange}
                  disabled={noClients}
                >
                  <SelectTrigger id="clientId">
                    <SelectValue
                      placeholder={noClients ? "Сначала создай клиента" : "Выбери клиента"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field id="projectId" label="Проект" hint="Опционально" error={errors.projectId?.message}>
            <Controller
              control={control}
              name="projectId"
              render={({ field }) => (
                <Select
                  value={field.value ?? "__none"}
                  onValueChange={(v) => field.onChange(v === "__none" ? null : v)}
                  disabled={!selectedClientId || projectsForClient.length === 0}
                >
                  <SelectTrigger id="projectId">
                    <SelectValue
                      placeholder={
                        !selectedClientId
                          ? "Сначала выбери клиента"
                          : projectsForClient.length === 0
                            ? "Нет проектов"
                            : "Без проекта"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Без проекта</SelectItem>
                    {projectsForClient.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field
            id="invoiceId"
            label="Счёт"
            hint={
              selectedInvoice && remaining !== null
                ? `Остаток к оплате: ${remaining.toFixed(2)} EUR`
                : "Если оплата по конкретному счёту"
            }
            error={errors.invoiceId?.message}
          >
            <Controller
              control={control}
              name="invoiceId"
              render={({ field }) => (
                <Select
                  value={field.value ?? "__none"}
                  onValueChange={(v) => {
                    const next = v === "__none" ? null : v;
                    field.onChange(next);
                    // Auto-fill amount = remaining when invoice picked
                    if (next) {
                      const inv = invoices.find((i) => i.id === next);
                      if (inv) {
                        const rem = Math.max(0, Number(inv.total) - Number(inv.paid));
                        if (rem > 0) setValue("amount", rem.toFixed(2));
                        // Sync client/project to the invoice
                        setValue("clientId", inv.clientId);
                        setValue("projectId", inv.projectId);
                      }
                    }
                  }}
                  disabled={!selectedClientId || invoicesForContext.length === 0}
                >
                  <SelectTrigger id="invoiceId">
                    <SelectValue
                      placeholder={
                        !selectedClientId
                          ? "Сначала выбери клиента"
                          : invoicesForContext.length === 0
                            ? "Нет счетов"
                            : "Без привязки к счёту"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Без счёта</SelectItem>
                    {invoicesForContext.map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.number} — {Number(i.total).toFixed(2)} EUR
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field id="kind" label="Тип" required error={errors.kind?.message}>
            <Controller
              control={control}
              name="kind"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="kind">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_KINDS.map((k) => (
                      <SelectItem key={k} value={k}>
                        {KIND_LABEL[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field id="amount" label="Сумма" required error={errors.amount?.message}>
            <Input
              id="amount"
              inputMode="decimal"
              placeholder="0.00"
              {...register("amount")}
              className="font-mono"
            />
          </Field>
          <Field id="paidAt" label="Дата платежа" required error={errors.paidAt?.message}>
            <Input id="paidAt" type="date" {...register("paidAt")} />
          </Field>
          <Field id="note" label="Заметка" className="sm:col-span-2" error={errors.note?.message}>
            <Textarea id="note" rows={2} {...register("note")} />
          </Field>
        </CardContent>
      </Card>

      {selectedInvoice ? (
        <div className="rounded-md border border-border bg-background-elevated p-3 text-xs text-foreground-muted">
          Привязка: счёт <span className="font-mono text-foreground">{selectedInvoice.number}</span> ·{" "}
          сумма счёта <MoneyDisplay value={selectedInvoice.total} /> · уже оплачено{" "}
          <MoneyDisplay value={selectedInvoice.paid} />
        </div>
      ) : null}

      <div className="sticky bottom-16 z-10 -mx-4 flex justify-end gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:bottom-4 sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending}>
          Отмена
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              Сохраняем…
            </span>
          ) : (
            "Сохранить платёж"
          )}
        </Button>
      </div>
    </form>
  );
}
