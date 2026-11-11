import { PublicShell } from "@/components/domain/public-shell";
export default function Layout({ children }: { children: React.ReactNode }) {
  return <PublicShell>{children}</PublicShell>;
}
