import Link from "next/link";
import { WifiOff } from "lucide-react";

export const metadata = {
  title: "Offline",
};

/**
 * Offline shell — rendered when the service worker (Iteration 6) can't
 * reach the network. On bootstrap this is a static fallback only; the SW
 * itself is not yet registered.
 */
export default function OfflinePage() {
  return (
    <div className="grid min-h-dvh place-items-center bg-background px-6 text-center">
      <div className="flex max-w-sm flex-col items-center gap-4">
        <div className="grid size-14 place-items-center rounded-full border border-border bg-card text-foreground-muted">
          <WifiOff className="size-6" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Нет соединения</h1>
        <p className="text-sm text-foreground-muted">
          Нет соединения с сетью. Ранее открытые страницы доступны из кеша;
          для новых данных проверь соединение и попробуй ещё раз.
        </p>
        <Link
          href="/"
          className="mt-2 inline-flex h-10 items-center rounded-md border border-border-strong bg-secondary px-4 text-sm font-medium hover:bg-secondary/80"
        >
          Попробовать снова
        </Link>
      </div>
    </div>
  );
}
