import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata = {
  title: "Вход",
};

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <div className="text-2xl font-semibold tracking-tight">
          <span className="text-accent-gradient">webvibe</span>
          <span className="text-foreground-muted"> / CRM</span>
        </div>
        <p className="mt-2 text-sm text-foreground-muted">
          Внутренний инструмент. Доступ только владельцу.
        </p>
      </div>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
