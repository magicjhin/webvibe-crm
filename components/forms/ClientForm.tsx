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
  clientSchema,
  type ClientInput,
  CLIENT_KINDS,
  CLIENT_STATUSES,
} from "@/lib/validators/client";
import { createClient, updateClient } from "@/lib/actions/clients";

type Props =
  | { mode: "create"; initial?: undefined; id?: undefined }
  | { mode: "edit"; initial: ClientInput; id: string };

const KIND_LABEL: Record<(typeof CLIENT_KINDS)[number], string> = {
  individual: "Физлицо",
  company: "Компания",
};

const STATUS_LABEL: Record<(typeof CLIENT_STATUSES)[number], string> = {
  active: "Активен",
  archived: "В архиве",
};

const EMPTY: ClientInput = {
  kind: "individual",
  name: "",
  email: null,
  phone: null,
  website: null,
  vatId: null,
  regNumber: null,
  address: null,
  language: "lt",
  status: "active",
  source: null,
  notes: null,
};

export function ClientForm(props: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<ClientInput>({
    resolver: zodResolver(clientSchema),
    defaultValues: props.mode === "edit" ? props.initial : EMPTY,
  });

  const onSubmit = (data: ClientInput) => {
    startTransition(async () => {
      const result =
        props.mode === "create"
          ? await createClient(data)
          : await updateClient(props.id, data);
      if (result.ok) {
        toast.success(props.mode === "create" ? "Клиент создан" : "Сохранено");
        if (props.mode === "create") {
          router.push(`/clients/${result.data.id}`);
        } else {
          reset(data, { keepValues: true });
          router.refresh();
        }
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6" noValidate>
      <Card>
        <CardHeader>
          <CardTitle>Основное</CardTitle>
          <CardDescription>Имя и тип клиента — обязательны.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field id="kind" label="Тип" required error={errors.kind?.message}>
            <Controller
              control={control}
              name="kind"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="kind">
                    <SelectValue placeholder="Выбери" />
                  </SelectTrigger>
                  <SelectContent>
                    {CLIENT_KINDS.map((k) => (
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
                    <SelectValue placeholder="Выбери" />
                  </SelectTrigger>
                  <SelectContent>
                    {CLIENT_STATUSES.map((s) => (
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
            id="name"
            label="Имя / название"
            required
            className="sm:col-span-2"
            error={errors.name?.message}
          >
            <Input id="name" {...register("name")} placeholder="Иван Иванов / UAB «...»" />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Контакты</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field id="email" label="Email" error={errors.email?.message}>
            <Input id="email" type="email" {...register("email")} />
          </Field>
          <Field id="phone" label="Телефон" error={errors.phone?.message}>
            <Input id="phone" {...register("phone")} />
          </Field>
          <Field
            id="website"
            label="Сайт"
            hint="https://…"
            className="sm:col-span-2"
            error={errors.website?.message}
          >
            <Input id="website" {...register("website")} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Реквизиты</CardTitle>
          <CardDescription>
            Понадобятся для PDF-документов. Можно заполнить позже.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field id="vatId" label="VAT ID" error={errors.vatId?.message}>
            <Input id="vatId" {...register("vatId")} className="font-mono" />
          </Field>
          <Field id="regNumber" label="Рег. номер" error={errors.regNumber?.message}>
            <Input id="regNumber" {...register("regNumber")} className="font-mono" />
          </Field>
          <Field
            id="address"
            label="Адрес"
            className="sm:col-span-2"
            error={errors.address?.message}
          >
            <Textarea id="address" rows={2} {...register("address")} />
          </Field>
          <Field id="language" label="Язык документов" hint="ISO-код (lt, en, ru)" error={errors.language?.message}>
            <Input id="language" {...register("language")} className="font-mono uppercase" />
          </Field>
          <Field id="source" label="Откуда пришёл" error={errors.source?.message}>
            <Input id="source" {...register("source")} placeholder="Instagram / друг / поиск" />
          </Field>
          <Field
            id="notes"
            label="Заметки"
            className="sm:col-span-2"
            error={errors.notes?.message}
          >
            <Textarea id="notes" rows={3} {...register("notes")} />
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
            "Создать клиента"
          ) : (
            "Сохранить"
          )}
        </Button>
      </div>
    </form>
  );
}
