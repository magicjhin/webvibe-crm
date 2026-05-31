"use client";

import { useEffect, useRef, useTransition } from "react";
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
import { cn } from "@/lib/utils";
import {
  contractSchema,
  type ContractInput,
  type ContractKind,
} from "@/lib/validators/contract";
import { createContract, updateContract } from "@/lib/actions/contracts";

export type ClientOption = { id: string; name: string };
export type ProjectOption = { id: string; title: string; clientId: string };

type Props =
  | {
      mode: "create";
      id?: undefined;
      initial?: Partial<ContractInput>;
      clients: ClientOption[];
      projects: ProjectOption[];
    }
  | {
      mode: "edit";
      id: string;
      initial: ContractInput;
      clients: ClientOption[];
      projects: ProjectOption[];
    };

const KIND_META: Record<ContractKind, { title: string; description: string }> = {
  STAGED: {
    title: "Поэтапный",
    description: "Произвольный список платёжных этапов (как DSK).",
  },
  ADVANCE: {
    title: "Аванс 70/30",
    description: "Аванс 70% + остаток 30% (автозаполняется, можно менять).",
  },
  MAINTENANCE: {
    title: "Поддержка",
    description: "Ежемесячный платёж, короткий бойлерплейт (как Carenta).",
  },
};

const DEFAULT_MAINTENANCE_INCLUDES = [
  "Saito prieglobos ir veikimo priežiūra",
  "Saugumo atnaujinimai ir kopijos",
  "Smulkūs turinio pakeitimai",
];

const todayISO = () => new Date().toISOString().slice(0, 10);

const toNum = (v: string | undefined) =>
  Number(String(v ?? "0").replace(/[\s ]/g, "").replace(",", "."));

function emptyInitial(kind: ContractKind): ContractInput {
  const base = {
    kind,
    clientId: "",
    projectId: null,
    issuedAt: todayISO(),
    status: "draft" as const,
    currency: "EUR" as const,
    amount: "",
  };
  if (kind === "MAINTENANCE") {
    return {
      ...base,
      kind: "MAINTENANCE",
      terms: {
        kind: "MAINTENANCE",
        subject: "",
        monthlyAmount: "",
        includes: [...DEFAULT_MAINTENANCE_INCLUDES],
        warranty: null,
        termsNote: null,
        excluded: [],
      },
    };
  }
  return {
    ...base,
    kind,
    terms: {
      kind,
      subject: "",
      scope: [{ title: "", description: null }],
      paymentTerms:
        kind === "ADVANCE"
          ? [
              { label: "Avansas (70%)", amount: "", dueLabel: null },
              { label: "Likutis (30%)", amount: "", dueLabel: null },
            ]
          : [{ label: "", amount: "", dueLabel: null }],
      warranty: null,
      termsNote: null,
      excluded: [],
    },
  };
}

export function ContractForm(props: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const initialKind: ContractKind =
    props.mode === "edit"
      ? props.initial.kind
      : (props.initial?.kind ?? "STAGED");

  const defaultValues: ContractInput =
    props.mode === "edit"
      ? props.initial
      : { ...emptyInitial(initialKind), ...(props.initial ?? {}) };

  const {
    register,
    control,
    handleSubmit,
    setValue,
    reset,
    getValues,
    formState: { errors, isDirty },
  } = useForm<ContractInput>({
    resolver: zodResolver(contractSchema),
    defaultValues,
  });

  const kind = useWatch({ control, name: "kind" });
  const selectedClientId = useWatch({ control, name: "clientId" });
  const amount = useWatch({ control, name: "amount" });
  const monthlyAmount = useWatch({ control, name: "terms.monthlyAmount" as never }) as
    | string
    | undefined;

  const projectsForClient = selectedClientId
    ? props.projects.filter((p) => p.clientId === selectedClientId)
    : [];

  const initialClientRef = useRef(selectedClientId);
  useEffect(() => {
    if (props.mode === "edit") return;
    if (!selectedClientId) return;
    if (selectedClientId === initialClientRef.current) return;
    setValue("projectId", null);
  }, [selectedClientId, props.mode, setValue]);

  // ADVANCE: суммы этапов 70/30 считаются от amount автоматически (только create,
  // чтобы не перетирать ручные правки на edit). Так paymentTerms не приходят
  // пустыми в Zod — закрывает баг "min(1) + пустые суммы".
  useEffect(() => {
    if (props.mode !== "create") return;
    if (kind !== "ADVANCE") return;
    const a = toNum(amount);
    if (!(a > 0)) return;
    const adv = Math.round(a * 0.7 * 100) / 100;
    const rem = Math.round((a - adv) * 100) / 100;
    setValue("terms.paymentTerms.0.amount" as never, adv.toFixed(2) as never, {
      shouldDirty: true,
    });
    setValue("terms.paymentTerms.1.amount" as never, rem.toFixed(2) as never, {
      shouldDirty: true,
    });
  }, [kind, amount, props.mode, setValue]);

  // MAINTENANCE: amount == monthlyAmount (сервер тоже деривирует). Зеркалим
  // видимое поле "Ежемесячная сумма" в канонический amount.
  useEffect(() => {
    if (kind !== "MAINTENANCE") return;
    setValue("amount", monthlyAmount ?? "", { shouldDirty: true });
  }, [kind, monthlyAmount, setValue]);

  // Сменили kind на шаге выбора (только create) — пересобираем terms-блок,
  // сохраняя общие поля (client, project, amount, subject).
  const onKindChange = (next: ContractKind) => {
    if (next === kind) return;
    const current = getValues();
    const fresh = emptyInitial(next);
    const subject = current.terms?.subject ?? "";
    reset({
      ...fresh,
      clientId: current.clientId,
      projectId: current.projectId ?? null,
      issuedAt: current.issuedAt,
      amount: current.amount,
      terms: { ...fresh.terms, subject },
    });
  };

  const onSubmit = (data: ContractInput) => {
    startTransition(async () => {
      const result =
        props.mode === "create"
          ? await createContract(data)
          : await updateContract(props.id, data);
      if (result.ok) {
        toast.success(props.mode === "create" ? "Договор создан" : "Сохранено");
        if (props.mode === "create") {
          router.push(`/contracts/${result.data.id}`);
        } else {
          reset(data, { keepValues: true });
          router.refresh();
        }
      } else {
        toast.error(result.error);
        if (result.fieldErrors) {
          const first = Object.values(result.fieldErrors).find(
            (v) => v && v.length,
          )?.[0];
          if (first) toast.error(first);
        }
      }
    });
  };

  const noClients = props.clients.length === 0;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6" noValidate>
      {/* Step: kind picker (only on create; on edit kind is frozen with the draft). */}
      {props.mode === "create" ? (
        <Card>
          <CardHeader>
            <CardTitle>Тип договора</CardTitle>
            <CardDescription>
              Поля формы подстроятся под выбранный тип.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            {(Object.keys(KIND_META) as ContractKind[]).map((k) => {
              const active = kind === k;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => onKindChange(k)}
                  aria-pressed={active}
                  className={cn(
                    "flex flex-col gap-1 rounded-lg border p-4 text-left transition-colors",
                    active
                      ? "border-accent bg-sidebar-accent"
                      : "border-border bg-background-elevated hover:border-foreground-subtle",
                  )}
                >
                  <span className="font-medium">{KIND_META[k].title}</span>
                  <span className="text-xs text-foreground-muted">
                    {KIND_META[k].description}
                  </span>
                </button>
              );
            })}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Параметры договора</CardTitle>
          {props.mode === "edit" ? (
            <CardDescription>
              Тип ({KIND_META[kind].title}) у черновика не меняется.
            </CardDescription>
          ) : null}
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
          <Field id="issuedAt" label="Įsigaliojimo data" required error={errors.issuedAt?.message}>
            <Input id="issuedAt" type="date" {...register("issuedAt")} />
          </Field>
          {/* Для MAINTENANCE сумму задаёт поле «Ежемесячная сумма» ниже (amount зеркалится). */}
          {kind !== "MAINTENANCE" ? (
            <Field
              id="amount"
              label="Сумма договора, EUR"
              required
              hint={
                kind === "STAGED"
                  ? "Должна совпадать с суммой всех платёжных этапов"
                  : "70/30 рассчитываются от этой суммы"
              }
              error={errors.amount?.message}
            >
              <Input
                id="amount"
                inputMode="decimal"
                placeholder="1234.56"
                {...register("amount")}
                className="font-mono"
              />
            </Field>
          ) : null}
        </CardContent>
      </Card>

      {/* §2 Subject — always editable, multiline. */}
      <Card>
        <CardHeader>
          <CardTitle>Sutarties dalykas (§2)</CardTitle>
          <CardDescription>Что именно делаем по договору.</CardDescription>
        </CardHeader>
        <CardContent>
          <Field
            id="terms.subject"
            label="Предмет договора"
            required
            error={errors.terms?.subject?.message}
          >
            <Textarea
              id="terms.subject"
              rows={4}
              placeholder="Svetainės kūrimas pagal pateiktą techninę užduotį…"
              {...register("terms.subject")}
            />
          </Field>
        </CardContent>
      </Card>

      {kind === "MAINTENANCE" ? (
        <MaintenanceTerms control={control} register={register} errors={errors} />
      ) : (
        <WorkTerms
          control={control}
          register={register}
          errors={errors}
          amount={amount}
        />
      )}

      {/* §9 Warranty + notes — shared. */}
      <Card>
        <CardHeader>
          <CardTitle>Garantija ir pastabos</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field
            id="terms.warranty"
            label="Garantija (§9)"
            hint="Например: 12 mėnesių"
            error={errors.terms?.warranty?.message}
          >
            <Textarea id="terms.warranty" rows={2} {...register("terms.warranty")} />
          </Field>
          <Field
            id="terms.termsNote"
            label="Доп. условия / примечания"
            hint="Опционально"
            error={errors.terms?.termsNote?.message}
          >
            <Textarea id="terms.termsNote" rows={3} {...register("terms.termsNote")} />
          </Field>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2 md:sticky md:bottom-4">
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
            "Создать договор"
          ) : (
            "Сохранить"
          )}
        </Button>
      </div>
    </form>
  );
}

// react-hook-form helpers are typed against ContractInput; the sub-forms below
// only touch the work/maintenance branches, so a constrained handle is enough.
type FormHandle = {
  control: ReturnType<typeof useForm<ContractInput>>["control"];
  register: ReturnType<typeof useForm<ContractInput>>["register"];
  errors: ReturnType<typeof useForm<ContractInput>>["formState"]["errors"];
};

function WorkTerms({
  control,
  register,
  errors,
  amount,
}: FormHandle & { amount: string | undefined }) {
  const scope = useFieldArray({ control, name: "terms.scope" as never });
  const payments = useFieldArray({ control, name: "terms.paymentTerms" as never });
  const paymentValues = useWatch({ control, name: "terms.paymentTerms" as never }) as
    | { amount?: string }[]
    | undefined;

  const paymentsSum = (paymentValues ?? []).reduce<number>((acc, p) => {
    const v = Number(String(p?.amount ?? "0").replace(/[\s ]/g, "").replace(",", "."));
    return Number.isFinite(v) ? acc + v : acc;
  }, 0);
  const amountNum = Number(String(amount ?? "0").replace(/[\s ]/g, "").replace(",", "."));
  const mismatch =
    Number.isFinite(amountNum) &&
    amountNum > 0 &&
    Math.abs(paymentsSum - amountNum) > 0.005;

  // errors for the work branch
  const termErrors = errors.terms as
    | {
        scope?: { message?: string } & Record<number, { title?: { message?: string } }>;
        paymentTerms?: { message?: string } & Record<
          number,
          { label?: { message?: string }; amount?: { message?: string } }
        >;
      }
    | undefined;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Darbų apimtis (§3)</CardTitle>
          <CardDescription>Список работ. Нумеруется автоматически 3.1, 3.2…</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {scope.fields.map((row, idx) => (
            <div
              key={row.id}
              className="flex flex-col gap-2 rounded-lg border border-border bg-background-elevated p-3"
            >
              <div className="flex items-start gap-2">
                <span className="mt-2 w-8 shrink-0 font-mono text-xs text-foreground-muted">
                  3.{idx + 1}
                </span>
                <div className="flex-1 space-y-2">
                  <Input
                    placeholder="Название этапа работ"
                    {...register(`terms.scope.${idx}.title` as never)}
                  />
                  <Textarea
                    rows={2}
                    placeholder="Описание (опционально)"
                    className="text-xs"
                    {...register(`terms.scope.${idx}.description` as never)}
                  />
                  {termErrors?.scope?.[idx]?.title?.message ? (
                    <p className="text-xs text-[hsl(var(--danger))]">
                      {termErrors.scope[idx]?.title?.message}
                    </p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Удалить пункт"
                  onClick={() => scope.remove(idx)}
                  disabled={scope.fields.length === 1}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
          {termErrors?.scope?.message ? (
            <p className="text-xs text-[hsl(var(--danger))]">{termErrors.scope.message}</p>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => scope.append({ title: "", description: null } as never)}
          >
            <Plus className="size-3.5" />
            Добавить пункт работ
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Atsiskaitymo tvarka (§4)</CardTitle>
          <CardDescription>
            Платёжные этапы. Сумма всех этапов должна равняться сумме договора.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {payments.fields.map((row, idx) => (
            <div
              key={row.id}
              className="flex flex-col gap-3 rounded-lg border border-border bg-background-elevated p-3 sm:grid sm:grid-cols-[1fr_140px_1fr_auto] sm:items-start sm:gap-3"
            >
              <div className="space-y-1">
                <Input
                  placeholder="Метка (Avansas…)"
                  {...register(`terms.paymentTerms.${idx}.label` as never)}
                />
                {termErrors?.paymentTerms?.[idx]?.label?.message ? (
                  <p className="text-xs text-[hsl(var(--danger))]">
                    {termErrors.paymentTerms[idx]?.label?.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-1">
                <Input
                  placeholder="Сумма"
                  inputMode="decimal"
                  className="font-mono"
                  {...register(`terms.paymentTerms.${idx}.amount` as never)}
                />
                {termErrors?.paymentTerms?.[idx]?.amount?.message ? (
                  <p className="text-xs text-[hsl(var(--danger))]">
                    {termErrors.paymentTerms[idx]?.amount?.message}
                  </p>
                ) : null}
              </div>
              <Input
                placeholder="Срок (po sutarties…)"
                {...register(`terms.paymentTerms.${idx}.dueLabel` as never)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Удалить этап"
                onClick={() => payments.remove(idx)}
                disabled={payments.fields.length === 1}
                className="justify-self-end"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          {termErrors?.paymentTerms?.message ? (
            <p className="text-xs text-[hsl(var(--danger))]">
              {termErrors.paymentTerms.message}
            </p>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              payments.append({ label: "", amount: "", dueLabel: null } as never)
            }
          >
            <Plus className="size-3.5" />
            Добавить этап
          </Button>

          <div className="flex flex-col items-end gap-1 border-t border-border pt-3 text-sm">
            <div className="flex items-center gap-4">
              <span className="text-foreground-muted">Сумма этапов:</span>
              <span className="text-lg font-semibold">
                <MoneyDisplay value={paymentsSum} />
              </span>
            </div>
            {mismatch ? (
              <p className="text-xs text-[hsl(var(--danger))]">
                Не совпадает с суммой договора (<MoneyDisplay value={amountNum} />)
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function MaintenanceTerms({ control, register, errors }: FormHandle) {
  const includes = useFieldArray({ control, name: "terms.includes" as never });
  const termErrors = errors.terms as
    | { monthlyAmount?: { message?: string } }
    | undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Priežiūros sąlygos</CardTitle>
        <CardDescription>Ежемесячный платёж и что входит в поддержку.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Field
          id="terms.monthlyAmount"
          label="Ежемесячная сумма, EUR/мес"
          required
          error={termErrors?.monthlyAmount?.message}
        >
          <Input
            id="terms.monthlyAmount"
            inputMode="decimal"
            placeholder="49.00"
            className="font-mono"
            {...register("terms.monthlyAmount" as never)}
          />
        </Field>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Что входит</span>
          {includes.fields.map((row, idx) => (
            <div key={row.id} className="flex items-center gap-2">
              <span aria-hidden className="text-foreground-muted">
                •
              </span>
              <Input
                placeholder="Пункт поддержки"
                {...register(`terms.includes.${idx}` as never)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Удалить пункт"
                onClick={() => includes.remove(idx)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() => includes.append("" as never)}
          >
            <Plus className="size-3.5" />
            Добавить пункт
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
