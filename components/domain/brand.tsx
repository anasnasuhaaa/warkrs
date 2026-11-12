import Link from "next/link";
import { GraduationCap } from "lucide-react";
export function Brand({ compact = false, href = "/" }: { compact?: boolean; href?: string }) {
  return (
    <Link
      href={href}
      aria-label="War KRS, beranda"
      className="flex min-w-0 items-center gap-2.5 rounded-md font-semibold text-foreground"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <GraduationCap className="size-5" aria-hidden="true" />
      </span>
      <span
        className={
          compact
            ? "truncate group-data-[collapsible=icon]:hidden"
            : "text-lg tracking-tight"
        }
      >
        War KRS
      </span>
    </Link>
  );
}
