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
import { proposalSchema, type ProposalInput } from "@/lib/validators/proposal";
import { createProposal, updateProposal } from "@/lib/actions/proposals";

export type ClientOption = { id: string; name: string };
export type ProjectOption = { id: string; title: string; clientId: string };

type Props =
  | {
      mode: "create";
      id?: undefined;
      initial?: Partial<ProposalInput>;
      clients: ClientOption[];
      projects: ProjectOption[];
    }
  | {
      mode: "edit";
      id: string;
      initial: ProposalInput;
      clients: ClientOption[];
      projects: ProjectOption[];
    };

function emptyInitial(): ProposalInput {
  return {
    clientId: "",
    projectId: null,
    title: "",
    status: "draft",
    currency: "EUR",
    total: "",
    validUntil: null,
    scopeIncluded: [{ title: "", description: null }],
    scopeExcluded: [],
    milestones: [],
    paymentPlan: [],
    warranty: null,
    portfolioLinks: [],
  };
}

export function ProposalForm(props: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const defaultValues: ProposalInput =
    props.mode === "edit"
      ? props.initial
      : { ...emptyInitial(), ...(props.initial ?? {}) };

  const {
    register,
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProposalInput>({
    resolver: zodResolver(proposalSchema),
    defaultValues,
  });

  const included = useFieldArray({ control, name: "scopeIncluded" });
  const excluded = useFieldArray({ control, name: "scopeExcluded" });
  const milestones = useFieldArray({ control, name: "milestones" });
  const payments = useFieldArray({ control, name: "paymentPlan" });
  const links = useFieldArray({ control, name: "portfolioLinks" });

  const selectedClientId = useWatch({ control, name: "clientId" });
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

  const onSubmit = (data: ProposalInput) => {
    startTransition(async () => {
      const result =
        props.mode === "create"
          ? await createProposal(data)
          : await updateProposal(props.id, data);
      if (result.ok) {
        toast.success(props.mode === "create" ? "КП создано" : "Сохранено");
        if (props.mode === "create") {
          router.push(`/proposals/${result.data.id}`);
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

  const scopeIncludedErrors = errors.scopeIncluded as
    | ({ message?: string } & Record<number, { title?: { message?: string } }>)
    | undefined;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6" noValidate>
      <Card>
        <CardHeader>
          <CardTitle>Параметры КП</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field id="title" label="Название" required error={errors.title?.message} className="sm:col-span-2">
            <Input id="title" placeholder="Pasiūlymas: svetainės kūrimas" {...register("title")} />
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
          <Field id="total" label="Suma, EUR" required error={errors.total?.message}>
            <Input
              id="total"
              inputMode="decimal"
              placeholder="1234.56"
              className="font-mono"
              {...register("total")}
            />
          </Field>
          <Field id="validUntil" label="Galioja iki" hint="Опционально" error={errors.validUntil?.message}>
            <Input id="validUntil" type="date" {...register("validUntil")} />
          </Field>
        </CardContent>
      </Card>

      {/* Scope included */}
      <Card>
        <CardHeader>
          <CardTitle>Į kainą įeina</CardTitle>
          <CardDescription>Что входит в предложение.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {included.fields.map((row, idx) => (
            <div
              key={row.id}
              className="flex items-start gap-2 rounded-lg border border-border bg-background-elevated p-3"
            >
              <div className="flex-1 space-y-2">
                <Input placeholder="Пункт" {...register(`scopeIncluded.${idx}.title`)} />
                <Textarea
                  rows={2}
                  className="text-xs"
                  placeholder="Описание (опционально)"
                  {...register(`scopeIncluded.${idx}.description`)}
                />
                {scopeIncludedErrors?.[idx]?.title?.message ? (
                  <p className="text-xs text-[hsl(var(--danger))]">
                    {scopeIncludedErrors[idx]?.title?.message}
                  </p>
                ) : null}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Удалить пункт"
                onClick={() => included.remove(idx)}
                disabled={included.fields.length === 1}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          {scopeIncludedErrors?.message ? (
            <p className="text-xs text-[hsl(var(--danger))]">{scopeIncludedErrors.message}</p>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => included.append({ title: "", description: null })}
          >
            <Plus className="size-3.5" />
            Добавить пункт
          </Button>
        </CardContent>
      </Card>

      {/* Scope excluded */}
      <Card>
        <CardHeader>
          <CardTitle>Į kainą neįeina</CardTitle>
          <CardDescription>Опционально — что не входит.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {excluded.fields.map((row, idx) => (
            <div
              key={row.id}
              className="flex items-start gap-2 rounded-lg border border-border bg-background-elevated p-3"
            >
              <div className="flex-1 space-y-2">
                <Input placeholder="Пункт" {...register(`scopeExcluded.${idx}.title`)} />
                <Textarea
                  rows={2}
                  className="text-xs"
                  placeholder="Описание (опционально)"
                  {...register(`scopeExcluded.${idx}.description`)}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Удалить пункт"
                onClick={() => excluded.remove(idx)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => excluded.append({ title: "", description: null })}
          >
            <Plus className="size-3.5" />
            Добавить пункт
          </Button>
        </CardContent>
      </Card>

      {/* Milestones */}
      <Card>
        <CardHeader>
          <CardTitle>Etapai</CardTitle>
          <CardDescription>Опционально — этапы с результатом и сроком.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {milestones.fields.map((row, idx) => (
            <div
              key={row.id}
              className="flex flex-col gap-3 rounded-lg border border-border bg-background-elevated p-3 sm:grid sm:grid-cols-[1fr_1fr_140px_auto] sm:items-start sm:gap-3"
            >
              <Input placeholder="Название этапа" {...register(`milestones.${idx}.name`)} />
              <Input placeholder="Результат (deliverable)" {...register(`milestones.${idx}.deliverable`)} />
              <Input placeholder="Срок" {...register(`milestones.${idx}.dueLabel`)} />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Удалить этап"
                onClick={() => milestones.remove(idx)}
                className="justify-self-end"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => milestones.append({ name: "", deliverable: null, dueLabel: null })}
          >
            <Plus className="size-3.5" />
            Добавить этап
          </Button>
        </CardContent>
      </Card>

      {/* Payment plan */}
      <Card>
        <CardHeader>
          <CardTitle>Atsiskaitymo planas</CardTitle>
          <CardDescription>Опционально — например аванс 50% / остаток 50%.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {payments.fields.map((row, idx) => (
            <div
              key={row.id}
              className="flex flex-col gap-3 rounded-lg border border-border bg-background-elevated p-3 sm:grid sm:grid-cols-[1fr_140px_1fr_auto] sm:items-start sm:gap-3"
            >
              <Input placeholder="Метка" {...register(`paymentPlan.${idx}.label`)} />
              <Input
                placeholder="Сумма"
                inputMode="decimal"
                className="font-mono"
                {...register(`paymentPlan.${idx}.amount`)}
              />
              <Input placeholder="Срок" {...register(`paymentPlan.${idx}.dueLabel`)} />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Удалить пункт"
                onClick={() => payments.remove(idx)}
                className="justify-self-end"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => payments.append({ label: "", amount: "", dueLabel: null })}
          >
            <Plus className="size-3.5" />
            Добавить пункт
          </Button>
        </CardContent>
      </Card>

      {/* Portfolio links + warranty */}
      <Card>
        <CardHeader>
          <CardTitle>Portfelis ir garantija</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            <span className="text-sm font-medium">Ссылки на портфолио</span>
            {links.fields.map((row, idx) => (
              <div
                key={row.id}
                className="flex flex-col gap-2 sm:grid sm:grid-cols-[200px_1fr_auto] sm:items-start sm:gap-3"
              >
                <Input placeholder="Метка" {...register(`portfolioLinks.${idx}.label`)} />
                <Input placeholder="https://…" {...register(`portfolioLinks.${idx}.url`)} />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Удалить ссылку"
                  onClick={() => links.remove(idx)}
                  className="justify-self-end"
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
              onClick={() => links.append({ label: "", url: "" })}
            >
              <Plus className="size-3.5" />
              Добавить ссылку
            </Button>
          </div>

          <Field id="warranty" label="Garantija" hint="Опционально" error={errors.warranty?.message}>
            <Textarea id="warranty" rows={2} {...register("warranty")} />
          </Field>
        </CardContent>
      </Card>

      <div className="sticky bottom-16 z-10 -mx-4 flex justify-end gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:bottom-4 sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending}>
          Отмена
        </Button>
        <Button type="submit" disabled={isPending || (props.mode === "edit" && !isDirty)}>
          {isPending ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              Сохраняем…
            </span>
          ) : props.mode === "create" ? (
            "Создать КП"
          ) : (
            "Сохранить"
          )}
        </Button>
      </div>
    </form>
  );
}
