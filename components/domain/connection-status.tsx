import { CloudOff, RefreshCw, Check } from "lucide-react";
export function ConnectionStatus({ message }: { message: string }) {
  const ok = message === "Tersinkron dengan server";
  const offline = message.startsWith("Offline");
  const Icon = ok ? Check : offline ? CloudOff : RefreshCw;
  return (
    <p
      role="status"
      className={`flex min-h-5 items-center gap-1.5 text-xs leading-relaxed ${ok ? "text-muted-foreground" : "text-warning"}`}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </p>
  );
}
