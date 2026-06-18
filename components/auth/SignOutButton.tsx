import { LogOut } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { signOutAction } from "@/lib/actions/auth";

export async function SignOutButton() {
  const t = await getTranslations("common");
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        aria-label={t("signOut")}
        className="inline-flex size-9 items-center justify-center rounded-md text-foreground-muted transition-colors hover:bg-secondary hover:text-foreground"
      >
        <LogOut className="size-4" />
      </button>
    </form>
  );
}
