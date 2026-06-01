"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { FileText, Loader2, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  importContractSchema,
  importInvoiceSchema,
} from "@/lib/validators/import";
import {
  uploadDocumentPdf,
  deleteDocumentBlob,
  importContract,
  importInvoice,
} from "@/lib/actions/imports";

type ClientOpt = { id: string; name: string };
type ProjectOpt = { id: string; title: string; clientId: string };

type FormValues = {
  number: string;
  clientId: string;
  projectId: string | null;
  amount: string;
  currency: "EUR";
  issuedAt: string;
  importedPdfUrl: string;
  fileName: string | null;
  // contract-only
  signedAt?: string | null;
  signerName?: string | null;
  // invoice-only
  dueAt?: string | null;
  status?: "sent" | "paid";
};

type Props = {
  docType: "contract" | "invoice";
  clients: ClientOpt[];
  projects: ProjectOpt[];
  initial: { issuedAt: string; clientId?: string; projectId?: string | null };
};

export function ImportDocumentForm({ docType, clients, projects, initial }: Props) {
  const router = useRouter();
  const isContract = docType === "contract";
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const schema = isContract ? importContractSchema : importInvoiceSchema;

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    // Схема зависит от типа документа; форма разделяет общие поля.
    resolver: zodResolver(schema) as unknown as Resolver<FormValues>,
    defaultValues: {
      number: "",
      clientId: initial.clientId ?? "",
      projectId: initial.projectId ?? null,
      amount: "",
      currency: "EUR",
      issuedAt: initial.issuedAt,
      importedPdfUrl: "",
      fileName: null,
      signedAt: null,
      signerName: null,
      dueAt: null,
      status: "paid",
    },
  });

  const clientId = watch("clientId");
  const pdfUrl = watch("importedPdfUrl");
  const fileName = watch("fileName");

  const clientProjects = useMemo(
    () => projects.filter((p) => p.clientId === clientId),
    [projects, clientId],
  );

  const handleFile = async (file: File) => {
    setIsUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const previous = pdfUrl;
    try {
      const res = await uploadDocumentPdf(fd);
      if (res.ok) {
        if (previous) void deleteDocumentBlob(previous);
        setValue("importedPdfUrl", res.data.url, { shouldValidate: true });
        setValue("fileName", res.data.fileName);
        toast.success("PDF загружен");
      } else {
        toast.error(res.error);
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const clearFile = () => {
    if (pdfUrl) void deleteDocumentBlob(pdfUrl);
    setValue("importedPdfUrl", "", { shouldValidate: true });
    setValue("fileName", null);
  };

  const onSubmit = (data: FormValues) => {
    startTransition(async () => {
      const res = isContract
        ? await importContract(data)
        : await importInvoice(data);
      if (res.ok) {
        toast.success(isContract ? "Договор импортирован" : "Счёт импортирован");
        router.push(isContract ? "/contracts" : "/invoices");
      } else {
        toast.error(res.error);
      }
    });
  };

  const numberPlaceholder = isContract ? "WVS000001" : "WV-001";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6" noValidate>
      <Card>
        <CardHeader>
          <CardTitle>{isContract ? "Старый договор" : "Старый счёт"}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field id="number" label="Номер документа" required error={errors.number?.message}>
            <Input id="number" placeholder={numberPlaceholder} {...register("number")} />
          </Field>

          <Field id="amount" label="Сумма (EUR)" required error={errors.amount?.message}>
            <Input
              id="amount"
              inputMode="decimal"
              placeholder="0.00"
              className="font-mono"
              {...register("amount")}
            />
          </Field>

          <Field id="clientId" label="Клиент" required error={errors.clientId?.message}>
            <Controller
              control={control}
              name="clientId"
              render={({ field }) => (
                <Select
                  value={field.value || undefined}
                  onValueChange={(v) => {
                    field.onChange(v);
                    setValue("projectId", null);
                  }}
                >
                  <SelectTrigger id="clientId">
                    <SelectValue placeholder="Выбери клиента" />
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

          <Field id="projectId" label="Проект" hint="Необязательно" error={errors.projectId?.message}>
            <Controller
              control={control}
              name="projectId"
              render={({ field }) => (
                <Select
                  value={field.value ?? "none"}
                  onValueChange={(v) => field.onChange(v === "none" ? null : v)}
                  disabled={!clientId}
                >
                  <SelectTrigger id="projectId">
                    <SelectValue placeholder="Без проекта" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Без проекта</SelectItem>
                    {clientProjects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>

          <Field id="issuedAt" label="Дата выставления" required error={errors.issuedAt?.message}>
            <Input id="issuedAt" type="date" {...register("issuedAt")} />
          </Field>

          {isContract ? (
            <Field id="signedAt" label="Дата подписания" hint="По умолчанию = дата выставления" error={errors.signedAt?.message}>
              <Input id="signedAt" type="date" {...register("signedAt")} />
            </Field>
          ) : (
            <Field id="dueAt" label="Срок оплаты" hint="Необязательно" error={errors.dueAt?.message}>
              <Input id="dueAt" type="date" {...register("dueAt")} />
            </Field>
          )}

          {isContract ? (
            <Field id="signerName" label="Кто подписал (клиент)" hint="Необязательно" className="sm:col-span-2" error={errors.signerName?.message}>
              <Input id="signerName" placeholder="Vardas Pavardė" {...register("signerName")} />
            </Field>
          ) : (
            <Field id="status" label="Статус" required error={errors.status?.message}>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value ?? "paid"} onValueChange={field.onChange}>
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">Оплачен</SelectItem>
                      <SelectItem value="sent">Отправлен</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>PDF документа</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {pdfUrl ? (
            <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-background-elevated px-3 py-2 text-sm">
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 hover:underline"
              >
                <FileText className="size-4" />
                {fileName ?? "Документ.pdf"}
              </a>
              <Button type="button" variant="ghost" size="icon-sm" onClick={clearFile} aria-label="Удалить файл">
                <X className="size-4" />
              </Button>
            </div>
          ) : null}

          <div>
            <input
              ref={fileInputRef}
              type="file"
              className="sr-only"
              accept="application/pdf"
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
                  {pdfUrl ? "Заменить PDF" : "Загрузить PDF"}
                </>
              )}
            </Button>
            <p className="mt-2 text-xs text-foreground-subtle">
              Только PDF · до 12 MB. Файл сохраняется на Vercel Blob и отдаётся при открытии документа.
            </p>
            {errors.importedPdfUrl?.message ? (
              <p className="mt-1 text-xs text-destructive">{errors.importedPdfUrl.message}</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="sticky bottom-16 z-10 -mx-4 flex justify-end gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:bottom-4 sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending}>
          Отмена
        </Button>
        <Button type="submit" disabled={isPending || isUploading}>
          {isPending ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              Импортируем…
            </span>
          ) : (
            "Импортировать"
          )}
        </Button>
      </div>
    </form>
  );
}
