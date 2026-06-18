import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { LoginForm } from "@/components/auth/LoginForm";

export async function generateMetadata() {
  const t = await getTranslations("auth");
  return { title: t("metaTitle") };
}

export default async function LoginPage() {
  const t = await getTranslations("auth");
  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <div className="text-2xl font-semibold tracking-tight">
          <span className="text-accent-gradient">webvibe</span>
          <span className="text-foreground-muted"> / CRM</span>
        </div>
        <p className="mt-2 text-sm text-foreground-muted">
          {t("subtitle")}
        </p>
      </div>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
