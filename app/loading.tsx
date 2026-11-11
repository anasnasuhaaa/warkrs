import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Memuat halaman dari server"
      className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6"
    >
      <span className="sr-only">Memuat halaman dari server…</span>
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((n) => (
          <Skeleton key={n} className="h-32 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  );
}
