"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  projectSchema,
  type ProjectInput,
  PROJECT_TYPES,
  PROJECT_STATUSES,
  PROJECT_LINK_KEYS,
  PROJECT_LINK_LABELS,
} from "@/lib/validators/project";
import { createProject, updateProject } from "@/lib/actions/projects";

export type ClientOption = { id: string; name: string };

type Props =
  | { mode: "create"; initial?: Partial<ProjectInput>; id?: undefined; clients: ClientOption[] }
  | { mode: "edit"; initial: ProjectInput; id: string; clients: ClientOption[] };

const TYPE_LABEL: Record<(typeof PROJECT_TYPES)[number], string> = {
  landing: "Лендинг",
  website: "Сайт",
  corporate: "Корпоративный",
  wordpress: "WordPress",
  headless_wp: "Headless WP",
  nextjs: "Next.js",
  crm_dashboard: "CRM / dashboard",
  booking: "Бронирование",
  quiz_funnel: "Quiz / воронка",
  maintenance: "Поддержка",
  other: "Другое",
};

const STATUS_LABEL: Record<(typeof PROJECT_STATUSES)[number], string> = {
  idea: "Идея",
  estimating: "Оценка",
  awaiting_advance: "Ждёт аванс",
  in_progress: "В работе",
  waiting_client: "Ждёт клиента",
  review: "Ревью",
  revisions: "Правки",
  ready: "Готов",
  paid: "Оплачен",
  archived: "В архиве",
};

const EMPTY: ProjectInput = {
  title: "",
  clientId: "",
  type: "landing",
  stack: null,
  status: "idea",
  price: "0",
  advance: "0",
  currency: "EUR",
  startedAt: null,
  deadlineAt: null,
  completedAt: null,
  links: {},
  hasMaintenance: false,
  notes: null,
};

export function ProjectForm(props: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const defaultValues: ProjectInput = {
    ...EMPTY,
    ...(props.mode === "edit" ? props.initial : props.initial ?? {}),
  };

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<ProjectInput>({
    resolver: zodResolver(projectSchema),
    defaultValues,
  });

  const onSubmit = (data: ProjectInput) => {
    startTransition(async () => {
      const result =
        props.mode === "create"
          ? await createProject(data)
          : await updateProject(props.id, data);
      if (result.ok) {
        toast.success(props.mode === "create" ? "Проект создан" : "Сохранено");
        if (props.mode === "create") {
          router.push(`/projects/${result.data.id}`);
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
          <CardTitle>Основное</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field
            id="title"
            label="Название"
            required
            className="sm:col-span-2"
            error={errors.title?.message}
          >
            <Input id="title" {...register("title")} placeholder="Лендинг для…" />
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
                      placeholder={
                        noClients ? "Сначала создай клиента" : "Выбери клиента"
                      }
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
          <Field id="type" label="Тип" required error={errors.type?.message}>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {TYPE_LABEL[t]}
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
                    {PROJECT_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field
            id="stack"
            label="Стек"
            hint="Свободная строка — Next.js, WordPress…"
            error={errors.stack?.message}
          >
            <Input id="stack" {...register("stack")} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Деньги и сроки</CardTitle>
          <CardDescription>
            Суммы вводи как <span className="font-mono">1234.56</span> (или с запятой).
            Валюта — EUR (берётся из настроек).
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field
            id="price"
            label="Цена, EUR"
            error={errors.price?.message}
          >
            <Input id="price" {...register("price")} className="font-mono" inputMode="decimal" />
          </Field>
          <Field
            id="advance"
            label="Заявленный аванс, EUR"
            error={errors.advance?.message}
          >
            <Input id="advance" {...register("advance")} className="font-mono" inputMode="decimal" />
          </Field>
          <Field id="startedAt" label="Начало" error={errors.startedAt?.message}>
            <Input id="startedAt" type="date" {...register("startedAt")} />
          </Field>
          <Field id="deadlineAt" label="Дедлайн" error={errors.deadlineAt?.message}>
            <Input id="deadlineAt" type="date" {...register("deadlineAt")} />
          </Field>
          <Field id="completedAt" label="Завершён" error={errors.completedAt?.message}>
            <Input id="completedAt" type="date" {...register("completedAt")} />
          </Field>
          <Field id="hasMaintenance" label="Поддержка">
            <Controller
              control={control}
              name="hasMaintenance"
              render={({ field }) => (
                <label className="flex h-9 items-center gap-2 text-sm">
                  <Checkbox
                    id="hasMaintenance"
                    checked={field.value}
                    onCheckedChange={(v) => field.onChange(v === true)}
                  />
                  <span>На поддержке</span>
                </label>
              )}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ссылки</CardTitle>
          <CardDescription>
            Пустые поля не сохраняются. Все ссылки должны быть с протоколом (https://…).
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {PROJECT_LINK_KEYS.map((key) => {
            const id = `links.${key}`;
            const error = (errors.links as Record<string, { message?: string } | undefined> | undefined)?.[key]?.message;
            return (
              <Field key={key} id={id} label={PROJECT_LINK_LABELS[key]} error={error}>
                <Input
                  id={id}
                  type="url"
                  placeholder="https://…"
                  {...register(`links.${key}` as const)}
                />
              </Field>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Заметки</CardTitle>
        </CardHeader>
        <CardContent>
          <Field id="notes" label="Заметки" error={errors.notes?.message}>
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
            "Создать проект"
          ) : (
            "Сохранить"
          )}
        </Button>
      </div>
    </form>
  );
}
