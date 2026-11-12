"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  UsersRound,
  CalendarDays,
  UserRound,
} from "lucide-react";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarInset,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Brand } from "./brand";
import { Logout } from "./logout";
const navigation = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/students", label: "Mahasiswa", icon: UsersRound },
  { href: "/admin/games", label: "War", icon: CalendarDays },
];
function AdminSidebar({ name }: { name: string }) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="h-18 justify-center border-b px-3 group-data-[collapsible=icon]:px-1.5">
        <Brand compact href="/admin" />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="pt-5">
          <SidebarGroupContent>
            <nav aria-label="Navigasi admin">
              <SidebarMenu className="gap-1">
                {navigation.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.label}
                      isActive={
                        item.href === "/admin"
                          ? pathname === item.href
                          : pathname.startsWith(item.href)
                      }
                      className="h-11 font-medium data-active:font-medium"
                    >
                      <Link
                        href={item.href}
                        aria-current={
                          (
                            item.href === "/admin"
                              ? pathname === item.href
                              : pathname.startsWith(item.href)
                          )
                            ? "page"
                            : undefined
                        }
                        onClick={() => setOpenMobile(false)}
                      >
                        <item.icon className="size-4" aria-hidden="true" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </nav>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="gap-3 border-t p-3 group-data-[collapsible=icon]:p-2">
        <div className="flex min-w-0 items-center gap-2.5 group-data-[collapsible=icon]:justify-center">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
            <UserRound className="size-4" aria-hidden="true" />
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p
              className="truncate text-sm font-medium text-foreground"
              title={name}
            >
              {name}
            </p>
            <p className="text-xs text-muted-foreground">Administrator</p>
          </div>
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <Logout sidebar />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
function AdminBreadcrumbs() {
  const path = usePathname();
  const section = path.startsWith("/admin/students")
    ? "Mahasiswa"
    : path.startsWith("/admin/games")
      ? "War"
      : "Dashboard";
  const detail =
    path === "/admin/games/new"
      ? "Buat War"
      : /^\/admin\/games\/.+/.test(path)
        ? "Detail War"
        : null;
  return (
    <Breadcrumb aria-label="Lokasi halaman">
      <BreadcrumbList className="flex-nowrap text-sm">
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/admin">Admin</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          {detail ? (
            <BreadcrumbLink asChild>
              <Link href="/admin/games">War</Link>
            </BreadcrumbLink>
          ) : (
            <BreadcrumbPage>{section}</BreadcrumbPage>
          )}
        </BreadcrumbItem>
        {detail && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem className="min-w-0">
              <BreadcrumbPage className="truncate">{detail}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
export function AdminShell({
  name,
  children,
}: {
  name: string;
  children: React.ReactNode;
}) {
  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen>
        <AdminSidebar name={name} />
        <SidebarInset id="konten" className="min-w-0 bg-background">
          <header className="sticky top-0 z-20 flex h-18 shrink-0 items-center gap-3 border-b bg-card px-4 sm:px-6">
            <SidebarTrigger className="size-10 shrink-0" />
            <Separator
              orientation="vertical"
              className="h-5! data-vertical:self-center"
            />
            <AdminBreadcrumbs />
          </header>
          <div className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6 lg:p-8">
            <div className="page-stack">{children}</div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
