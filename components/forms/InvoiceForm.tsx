"use client";

import { useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
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
  invoiceSchema,
  type InvoiceInput,
  INVOICE_KINDS,
  INVOICE_STATUSES,
} from "@/lib/validators/invoice";
import { createInvoice, updateInvoice } from "@/lib/actions/invoices";

export type ClientOption = { id: string; name: string };
export type ProjectOption = { id: string; title: string; clientId: string };

type Props =
  | {
      mode: "create";
      id?: undefined;
      initial?: Partial<InvoiceInput>;
      clients: ClientOption[];
      projects: ProjectOption[];
    }
  | {
      mode: "edit";
      id: string;
      initial: InvoiceInput;
      clients: ClientOption[];
      projects: ProjectOption[];
    };

const KIND_LABEL: Record<(typeof INVOICE_KINDS)[number], string> = {
  advance: "Аванс",
  final: "Остаток",
  full: "Полная сумма",
  maintenance: "Поддержка",
};

const STATUS_LABEL: Record<(typeof INVOICE_STATUSES)[number], string> = {
  draft: "Черновик",
  sent: "Отправлен",
  paid: "Оплачен",
  cancelled: "Отменён",
};

const todayISO = () => new Date().toISOString().slice(0, 10);

function emptyInitial(): InvoiceInput {
  return {
    kind: "advance",
    clientId: "",
    projectId: null,
    issuedAt: todayISO(),
    dueAt: null,
    status: "draft",
    currency: "EUR",
    notes: null,
    items: [
      {
        title: "",
        description: null,
        qty: "1",
        unitPrice: "",
      },
    ],
  };
}

export function InvoiceForm(props: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const defaultValues: InvoiceInput =
    props.mode === "edit"
      ? props.initial
      : { ...emptyInitial(), ...(props.initial ?? {}) };

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isDirty },
    reset,
  } = useForm<InvoiceInput>({
    resolver: zodResolver(invoiceSchema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const selectedClientId = useWatch({ control, name: "clientId" });
  const items = useWatch({ control, name: "items" });
  const issuedAt = useWatch({ control, name: "issuedAt" });

  const projectsForClient = selectedClientId
    ? props.projects.filter((p) => p.clientId === selectedClientId)
    : [];

  // Auto-clear projectId если пользователь сменил клиента.
  // На initial mount НЕ трогаем — иначе `?clientId&projectId` query-prefill
  // затирается до того, как пользователь увидит форму.
  const initialClientRef = useRef(selectedClientId);
  useEffect(() => {
    if (props.mode === "edit") return;
    if (!selectedClientId) return;
    if (selectedClientId === initialClientRef.current) return; // first render with prefill
    setValue("projectId", null);
  }, [selectedClientId, props.mode, setValue]);

  const subtotal = (items ?? []).reduce<number>((acc, item) => {
    const q = Number(String(item?.qty ?? "0").replace(",", "."));
    const u = Number(String(item?.unitPrice ?? "0").replace(",", "."));
    if (Number.isFinite(q) && Number.isFinite(u)) return acc + q * u;
    return acc;
  }, 0);

  const onSubmit = (data: InvoiceInput) => {
    startTransition(async () => {
      const result =
        props.mode === "create"
          ? await createInvoice(data)
          : await updateInvoice(props.id, data);
      if (result.ok) {
        toast.success(props.mode === "create" ? "Счёт создан" : "Сохранено");
        if (props.mode === "create") {
          router.push(`/invoices/${result.data.id}`);
        } else {
          reset(data, { keepValues: true });
          router.refresh();
        }
      } else {
        toast.error(result.error);
      }
    });
  };

  const noClients = props.clients.length === 0;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6" noValidate>
      <Card>
        <CardHeader>
          <CardTitle>Параметры счёта</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
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
                    {INVOICE_KINDS.map((k) => (
                      <SelectItem key={k} value={k}>
                        {KIND_LABEL[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field id="status" label="Статус" error={errors.status?.message}>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INVOICE_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
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
                    {props.clients.map((c) => (
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
                            ? "У клиента нет проектов"
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
          <Field id="issuedAt" label="Išrašymo data" required error={errors.issuedAt?.message}>
            <Input id="issuedAt" type="date" {...register("issuedAt")} />
          </Field>
          <Field id="dueAt" label="Apmokėti iki" hint="Опционально" error={errors.dueAt?.message}>
            <Input
              id="dueAt"
              type="date"
              {...register("dueAt")}
              defaultValue={issuedAt ?? undefined}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Paslaugos</CardTitle>
          <CardDescription>Каждая позиция — отдельная строка в счёте.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {fields.map((row, idx) => (
            <div
              key={row.id}
              className="flex flex-col gap-3 rounded-lg border border-border bg-background-elevated p-3 sm:grid sm:grid-cols-[1fr_90px_120px_120px_auto] sm:items-start sm:gap-3"
            >
              <div className="space-y-2">
                <Input
                  placeholder="Название услуги"
                  {...register(`items.${idx}.title` as const)}
                />
                <Textarea
                  rows={2}
                  placeholder="Описание (опционально)"
                  {...register(`items.${idx}.description` as const)}
                  className="text-xs"
                />
                {errors.items?.[idx]?.title?.message ? (
                  <p className="text-xs text-[hsl(var(--danger))]">
                    {errors.items[idx]?.title?.message}
                  </p>
                ) : null}
              </div>
              <Input
                placeholder="Kiekis"
                inputMode="decimal"
                {...register(`items.${idx}.qty` as const)}
                className="font-mono"
              />
              <Input
                placeholder="Vnt. kaina"
                inputMode="decimal"
                {...register(`items.${idx}.unitPrice` as const)}
                className="font-mono"
              />
              <div className="tabular-nums text-right text-sm font-medium">
                <MoneyDisplay
                  value={
                    (Number(String(items?.[idx]?.qty ?? "0").replace(",", ".")) || 0) *
                    (Number(String(items?.[idx]?.unitPrice ?? "0").replace(",", ".")) || 0)
                  }
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Удалить позицию"
                onClick={() => remove(idx)}
                disabled={fields.length === 1}
                className="justify-self-end"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}

          {errors.items?.message ? (
            <p className="text-xs text-[hsl(var(--danger))]">{errors.items.message}</p>
          ) : null}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              append({
                title: "",
                description: null,
                qty: "1",
                unitPrice: "",
              })
            }
          >
            <Plus className="size-3.5" />
            Добавить позицию
          </Button>

          <div className="flex justify-end border-t border-border pt-3 text-sm">
            <div className="flex items-center gap-4">
              <span className="text-foreground-muted">Iš viso:</span>
              <span className="text-lg font-semibold">
                <MoneyDisplay value={subtotal} />
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pastabos</CardTitle>
          <CardDescription>
            Если пусто — будет подставлен текст «Заметка о банке» из настроек.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Field id="notes" label="Текст в Pastabos" error={errors.notes?.message}>
            <Textarea id="notes" rows={4} {...register("notes")} />
          </Field>
        </CardContent>
      </Card>

      <div className="sticky bottom-16 z-10 -mx-4 flex justify-end gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:bottom-4 sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Отмена
        </Button>
        <Button
          type="submit"
          disabled={isPending || (props.mode === "edit" && !isDirty)}
        >
          {isPending ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              Сохраняем…
            </span>
          ) : props.mode === "create" ? (
            "Создать счёт"
          ) : (
            "Сохранить"
          )}
        </Button>
      </div>
    </form>
  );
}
