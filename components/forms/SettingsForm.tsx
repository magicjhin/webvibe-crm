"use client";

import { useTransition } from "react";
import { useForm, useWatch, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

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
import { Field } from "@/components/forms/Field";
import { updateSettings } from "@/lib/actions/settings";
import { settingsSchema, type SettingsInput } from "@/lib/validators/settings";

type Props = {
  initial: SettingsInput;
};

export function SettingsForm({ initial }: Props) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isDirty },
    reset,
  } = useForm<SettingsInput>({
    resolver: zodResolver(settingsSchema),
    defaultValues: initial,
  });

  const [isPending, startTransition] = useTransition();

  const onSubmit = (data: SettingsInput) => {
    startTransition(async () => {
      const result = await updateSettings(data);
      if (result.ok) {
        reset(data, { keepValues: true });
        toast.success("Настройки сохранены");
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-6"
      noValidate
    >

      {/* Brand / requisites */}
      <Card>
        <CardHeader>
          <CardTitle>Реквизиты</CardTitle>
          <CardDescription>Данные владельца / компании для документов.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field id="companyName" label="Название компании" required error={errors.companyName?.message}>
            <Input id="companyName" {...register("companyName")} />
          </Field>
          <Field id="ownerName" label="Имя владельца" required error={errors.ownerName?.message}>
            <Input id="ownerName" {...register("ownerName")} />
          </Field>
          <Field id="vatId" label="VAT ID" error={errors.vatId?.message}>
            <Input id="vatId" {...register("vatId")} />
          </Field>
          <Field id="regNumber" label="Регистрационный номер" error={errors.regNumber?.message}>
            <Input id="regNumber" {...register("regNumber")} />
          </Field>
          <Field
            id="address"
            label="Адрес"
            required
            className="sm:col-span-2"
            error={errors.address?.message}
          >
            <Textarea id="address" rows={2} {...register("address")} />
          </Field>
          <Field id="iban" label="IBAN" required error={errors.iban?.message}>
            <Input id="iban" {...register("iban")} className="font-mono" />
          </Field>
          <Field id="swift" label="SWIFT/BIC" error={errors.swift?.message}>
            <Input id="swift" {...register("swift")} className="font-mono" />
          </Field>
          <Field id="email" label="Email" required error={errors.email?.message}>
            <Input id="email" type="email" {...register("email")} />
          </Field>
          <Field id="phone" label="Телефон" error={errors.phone?.message}>
            <Input id="phone" {...register("phone")} />
          </Field>
          <Field id="website" label="Сайт" hint="https://…" error={errors.website?.message}>
            <Input id="website" {...register("website")} />
          </Field>
          <Field id="logoUrl" label="URL логотипа" hint="Iter 4 заменит на загрузку файла" error={errors.logoUrl?.message}>
            <Input id="logoUrl" {...register("logoUrl")} />
          </Field>
          <Field
            id="signatureUrl"
            label="URL подписи"
            hint="Iter 4 заменит на canvas-подпись"
            error={errors.signatureUrl?.message}
            className="sm:col-span-2"
          >
            <Input id="signatureUrl" {...register("signatureUrl")} />
          </Field>
        </CardContent>
      </Card>

      {/* Numbering */}
      <Card>
        <CardHeader>
          <CardTitle>Нумерация документов</CardTitle>
          <CardDescription>
            Префиксы и стартовые счётчики. Можешь задать текущий последний номер, дальше — автоинкремент.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <NumberingRow kind="invoice"  label="Счета"                    control={control} register={register} errors={errors} />
          <NumberingRow kind="contract" label="Договоры"                control={control} register={register} errors={errors} />
          <NumberingRow kind="proposal" label="Коммерческие предложения" control={control} register={register} errors={errors} />
        </CardContent>
      </Card>

      {/* Documents */}
      <Card>
        <CardHeader>
          <CardTitle>Документы</CardTitle>
          <CardDescription>
            Документы выставляются <span className="text-foreground">без PVM</span> (ADR-007).
            Multi-currency и en-документы — Phase 2.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field id="defaultCurrency" label="Валюта по умолчанию">
            <Input id="defaultCurrency" value="EUR" disabled readOnly />
          </Field>
          <Field id="documentLanguage" label="Язык документов">
            <Input id="documentLanguage" value="lt" disabled readOnly />
          </Field>
          <Field
            id="pdfFooterNote"
            label="Подпись в футере PDF"
            className="sm:col-span-2"
            hint="Опционально. Будет выведено мелким шрифтом внизу документа."
            error={errors.pdfFooterNote?.message}
          >
            <Textarea id="pdfFooterNote" rows={2} {...register("pdfFooterNote")} />
          </Field>
          {/* Locked fields still need to be submitted */}
          <input type="hidden" {...register("defaultCurrency")} value="EUR" />
          <input type="hidden" {...register("documentLanguage")} value="lt" />
        </CardContent>
      </Card>

      {/* Mobile keeps save inline (above bottom nav 64px + safe-area);
          desktop pins it to the bottom of the form viewport. */}
      <div className="flex justify-end md:sticky md:bottom-4">
        <Button type="submit" disabled={isPending || !isDirty}>
          {isPending ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              Сохраняем…
            </span>
          ) : (
            "Сохранить"
          )}
        </Button>
      </div>
    </form>
  );
}

function NumberingRow({
  kind,
  label,
  control,
  register,
  errors,
}: {
  kind: "invoice" | "contract" | "proposal";
  label: string;
  control: Control<SettingsInput>;
  register: ReturnType<typeof useForm<SettingsInput>>["register"];
  errors: ReturnType<typeof useForm<SettingsInput>>["formState"]["errors"];
}) {
  const prefixKey = `${kind}Prefix` as const;
  const counterKey = `${kind}Counter` as const;
  const paddingKey = `${kind}Padding` as const;

  const prefix = useWatch({ control, name: prefixKey });
  const counter = useWatch({ control, name: counterKey });
  const padding = useWatch({ control, name: paddingKey });

  const preview = formatNumberingPreview(prefix, counter, padding);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">{label}</div>
        <div className="font-mono text-xs text-foreground-muted">
          Следующий: <span className="text-foreground">{preview}</span>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field id={prefixKey} label="Префикс" error={errors[prefixKey]?.message}>
          <Input id={prefixKey} {...register(prefixKey)} className="font-mono" />
        </Field>
        <Field
          id={counterKey}
          label="Текущий счётчик"
          hint="Последний выданный номер"
          error={errors[counterKey]?.message}
        >
          <Input
            id={counterKey}
            type="number"
            inputMode="numeric"
            min={0}
            {...register(counterKey, { valueAsNumber: true })}
            className="font-mono"
          />
        </Field>
        <Field
          id={paddingKey}
          label="Padding"
          hint="Кол-во нулей в номере"
          error={errors[paddingKey]?.message}
        >
          <Input
            id={paddingKey}
            type="number"
            inputMode="numeric"
            min={1}
            max={10}
            {...register(paddingKey, { valueAsNumber: true })}
            className="font-mono"
          />
        </Field>
      </div>
    </div>
  );
}

function formatNumberingPreview(
  prefix: string | undefined,
  counter: number | undefined,
  padding: number | undefined
): string {
  if (!prefix || padding == null || Number.isNaN(padding)) return "—";
  const next = Number.isFinite(counter) ? (counter ?? 0) + 1 : 1;
  const sep = prefix.endsWith("-") ? "" : "-";
  return `${prefix}${sep}${String(next).padStart(padding, "0")}`;
}
