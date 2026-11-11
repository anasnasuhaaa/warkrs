import { Inbox } from "lucide-react";
export function EmptyState({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed bg-card px-5 py-12 text-center">
      <span className="mb-4 flex size-11 items-center justify-center rounded-full bg-muted">
        <Inbox className="size-5 text-muted-foreground" aria-hidden="true" />
      </span>
      <h2 className="font-medium">{title}</h2>
      <div className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </div>
  );
}
