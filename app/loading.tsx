export default function Loading() {
  return (
    <p
      role="status"
      aria-live="polite"
      className="rounded-lg border p-6 text-sm text-muted-foreground"
    >
      Memuat halaman dari server…
    </p>
  );
}
