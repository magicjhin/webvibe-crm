import { LogOut } from "lucide-react";
import { signOutAction } from "@/lib/actions/auth";

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        aria-label="Выйти"
        className="inline-flex size-9 items-center justify-center rounded-md text-foreground-muted transition-colors hover:bg-secondary hover:text-foreground"
      >
        <LogOut className="size-4" />
      </button>
    </form>
  );
}
