"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { formatInTimeZone } from "date-fns-tz";
import { toast } from "sonner";
import { Loader2, Paperclip, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  expenseSchema,
  type ExpenseInput,
  EXPENSE_CATEGORIES,
} from "@/lib/validators/expense";
import {
  createExpense,
  deleteExpenseBlob,
  updateExpense,
  uploadExpenseFile,
} from "@/lib/actions/expenses";

const CATEGORY_LABEL: Record<(typeof EXPENSE_CATEGORIES)[number], string> = {
  ai_tools: "AI-инструменты",
  hosting: "Хостинг",
  domains: "Домены",
  software: "Софт / подписки",
  hardware: "Железо",
  ads: "Реклама",
  transport: "Транспорт",
  other: "Другое",
};

const RECURRENCE_LABEL = { monthly: "Ежемесячно", yearly: "Ежегодно" } as const;

const PROJECT_TZ = "Europe/Vilnius";
const todayISO = () => formatInTimeZone(new Date(), PROJECT_TZ, "yyyy-MM-dd");

type Props =
  | { mode: "create"; id?: undefined; initial?: Partial<ExpenseInput> }
  | { mode: "edit"; id: string; initial: ExpenseInput };

function emptyInitial(): ExpenseInput {
  return {
    category: "software",
    vendor: null,
    amount: "",
    currency: "EUR",
    occurredAt: todayISO(),
    description: "",
    fileUrl: null,
    fileName: null,
    recurring: false,
    recurrence: null,
  };
}

export function ExpenseForm(props: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const defaultValues: ExpenseInput =
    props.mode === "edit"
      ? props.initial
      : { ...emptyInitial(), ...(props.initial ?? {}) };

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<ExpenseInput>({
    resolver: zodResolver(expenseSchema),
    defaultValues,
  });

  const fileUrl = watch("fileUrl");
  const fileName = watch("fileName");
  const recurring = watch("recurring");

  const handleFile = async (file: File) => {
    setIsUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const previousUrl = fileUrl;
    try {
      const result = await uploadExpenseFile(fd);
      if (result.ok) {
        // Перед заменой — попробовать удалить старый файл, чтобы не плодить orphan blobs.
        if (previousUrl) void deleteExpenseBlob(previousUrl);
        setValue("fileUrl", result.data.url, { shouldDirty: true });
        setValue("fileName", result.data.fileName, { shouldDirty: true });
        toast.success("Файл загружен");
      } else {
        toast.error(result.error);
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const clearFile = () => {
    // Best-effort удалить blob тоже — иначе он остаётся public, но недостижим.
    if (fileUrl) void deleteExpenseBlob(fileUrl);
    setValue("fileUrl", null, { shouldDirty: true });
    setValue("fileName", null, { shouldDirty: true });
  };

  const onSubmit = (data: ExpenseInput) => {
    startTransition(async () => {
      const result =
        props.mode === "create"
          ? await createExpense(data)
          : await updateExpense(props.id, data);
      if (result.ok) {
        toast.success(props.mode === "create" ? "Расход добавлен" : "Сохранено");
        router.push("/expenses");
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6" noValidate>
      <Card>
        <CardHeader>
          <CardTitle>Расход</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field id="category" label="Категория" required error={errors.category?.message}>
            <Controller
              control={control}
              name="category"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {CATEGORY_LABEL[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field
            id="vendor"
            label="Поставщик"
            hint="Anthropic, OpenAI, Vercel, ..."
            error={errors.vendor?.message}
          >
            <Input id="vendor" {...register("vendor")} placeholder="Anthropic" />
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
          <Field id="occurredAt" label="Дата" required error={errors.occurredAt?.message}>
            <Input id="occurredAt" type="date" {...register("occurredAt")} />
          </Field>
          <Field
            id="description"
            label="Описание"
            required
            className="sm:col-span-2"
            error={errors.description?.message}
          >
            <Textarea
              id="description"
              rows={2}
              placeholder="Claude API · ноябрь"
              {...register("description")}
            />
          </Field>

          <div className="sm:col-span-2 flex flex-col gap-3 rounded-lg border border-border bg-background-elevated p-3">
            <div className="flex items-center gap-2">
              <Controller
                control={control}
                name="recurring"
                render={({ field }) => (
                  <Checkbox
                    id="recurring"
                    checked={field.value}
                    onCheckedChange={(v) => field.onChange(v === true)}
                  />
                )}
              />
              <label htmlFor="recurring" className="text-sm">
                Регулярный расход
              </label>
            </div>
            {recurring ? (
              <Field
                id="recurrence"
                label="Периодичность"
                error={errors.recurrence?.message}
              >
                <Controller
                  control={control}
                  name="recurrence"
                  render={({ field }) => (
                    <Select
                      value={field.value ?? "monthly"}
                      onValueChange={(v) => field.onChange(v as "monthly" | "yearly")}
                    >
                      <SelectTrigger id="recurrence">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">{RECURRENCE_LABEL.monthly}</SelectItem>
                        <SelectItem value="yearly">{RECURRENCE_LABEL.yearly}</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Чек / документ</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {fileUrl ? (
            <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-background-elevated px-3 py-2 text-sm">
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 hover:underline"
              >
                <Paperclip className="size-4" />
                {fileName ?? "Файл"}
              </a>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={clearFile}
                aria-label="Удалить файл"
              >
                <X className="size-4" />
              </Button>
            </div>
          ) : null}

          <div>
            <input
              ref={fileInputRef}
              type="file"
              className="sr-only"
              accept="application/pdf,image/jpeg,image/png,image/webp,image/heic"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Загружаем…
                </>
              ) : (
                <>
                  <Upload className="size-4" />
                  {fileUrl ? "Заменить файл" : "Прикрепить файл"}
                </>
              )}
            </Button>
            <p className="mt-2 text-xs text-foreground-subtle">
              PDF / JPEG / PNG / WebP / HEIC · до 8 MB. Файл сохраняется на Vercel Blob.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending}>
          Отмена
        </Button>
        <Button
          type="submit"
          disabled={isPending || isUploading || (props.mode === "edit" && !isDirty)}
        >
          {isPending ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              Сохраняем…
            </span>
          ) : props.mode === "create" ? (
            "Добавить расход"
          ) : (
            "Сохранить"
          )}
        </Button>
      </div>
    </form>
  );
}
