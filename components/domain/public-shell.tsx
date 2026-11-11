import Link from "next/link";
import { Brand } from "./brand";
import { Button } from "@/components/ui/button";
import { application } from "@/modules/platform";
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-18 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Brand />
          <Button variant="ghost" asChild>
            <Link href="/login">Masuk</Link>
          </Button>
        </div>
      </header>
      <main
        id="konten"
        className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-4 py-10 sm:px-6 sm:py-16"
      >
        {children}
      </main>
      <footer className="border-t px-5 py-5 text-center text-xs leading-relaxed text-muted-foreground">
        <p className="mx-auto max-w-2xl">{application.boundary}</p>
      </footer>
    </div>
  );
}
