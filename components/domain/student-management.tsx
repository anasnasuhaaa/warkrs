"use client";
import { toast } from "sonner";
import { fieldErrors } from "@/lib/form-errors";
import { FieldError } from "./field-error";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Mail } from "lucide-react";
import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  LoaderCircle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import {
  StudentImport,
  TemplateButton,
} from "./student-import";
import { studentInput } from "@/lib/account-validation";
import { api, ApiError } from "@/lib/api-client";
export type Student = {
  id: string;
  name: string;
  nim: string | null;
  email: string;
  active: boolean;
};
function StudentForm({
  student,
  onSaved,
  controlledOpen,
  onOpen,
}: {
  controlledOpen?: boolean;
  onOpen?: (open: boolean) => void;
  student?: Student;
  onSaved?: (message: string) => void;
}) {
  const [localOpen, setLocalOpen] = useState(false);
  const open = controlledOpen ?? localOpen;
  const setOpen = onOpen ?? setLocalOpen;
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [fields, setFields] = useState({
    name: student?.name ?? "",
    nim: student?.nim ?? "",
    email: student?.email ?? "",
  });
  const formId = useId();
  const router = useRouter();
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (pending) return;
        setOpen(value);
        if (value) {
          setFields({
            name: student?.name ?? "",
            nim: student?.nim ?? "",
            email: student?.email ?? "",
          });
          setMessage("");
          setErrors({});
        }
      }}
    >
      {controlledOpen === undefined && <DialogTrigger asChild>
        {student ? (
          <Button
            size="icon"
            variant="ghost"
            aria-label={`Ubah ${student.name}`}
          >
            <Pencil className="size-4" aria-hidden="true" />
          </Button>
        ) : (
          <Button>
            <Plus className="size-4" aria-hidden="true" />
            Tambah Mahasiswa
          </Button>
        )}
      </DialogTrigger>}
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {student ? "Ubah Mahasiswa" : "Tambah Mahasiswa"}
          </DialogTitle>
          <DialogDescription>
            {student
              ? "Perbarui identitas mahasiswa. Perubahan email mengharuskan aktivasi ulang."
              : "Akun baru belum aktif. Email aktivasi dikirim secara terpisah."}
          </DialogDescription>
        </DialogHeader>
        <form noValidate
          className="space-y-5"
          onSubmit={async (e) => {
            e.preventDefault();
            if (pending) return;
            setMessage("");
            setErrors({});
            const parsed = studentInput.safeParse(fields);
            if (!parsed.success) {
              setErrors(fieldErrors(parsed.error));
              return;
            }
            setPending(true);
            try {
              const result = await api<{ message: string }>(
                student
                  ? `/api/admin/students/${student.id}`
                  : "/api/admin/students",
                parsed.data,
                student ? "PATCH" : "POST",
              );
              toast.success(result.message);
              onSaved?.(result.message);
              setOpen(false);
              router.refresh();
            } catch (error) {
              if (error instanceof ApiError) setErrors(error.fields);
              toast.error(error instanceof Error ? error.message : "Data gagal disimpan.");
              setMessage(
                error instanceof Error ? error.message : "Data gagal disimpan.",
              );
            } finally {
              setPending(false);
            }
          }}
        >
          {(
            [
              ["name", "Nama Lengkap", 150],
              ["nim", "NIM", 50],
              ["email", "Email", 254],
            ] as const
          ).map(([key, label, max]) => (
            <div className="space-y-2" key={key}>
              <Label htmlFor={`${formId}-${key}`}>{label}</Label>
              <Input
                aria-invalid={Boolean(errors[key])}
                aria-describedby={errors[key] ? `${formId}-${key}-error` : undefined}
                id={`${formId}-${key}`}
                name={key}
                type={key === "email" ? "email" : "text"}
                autoComplete={
                  key === "email" ? "email" : key === "name" ? "name" : "off"
                }
                value={fields[key]}
                required
                maxLength={max}
                disabled={pending}
                onChange={(e) =>
                  setFields({ ...fields, [key]: e.target.value })
                }
              />
              <FieldError id={`${formId}-${key}-error`} message={errors[key]} />
            </div>
          ))}
          {student && fields.email.trim().toLowerCase() !== student.email && (
            <p className="rounded-md bg-warning-subtle p-3 text-sm leading-relaxed text-warning">
              Email baru belum terverifikasi. Seluruh sesi, kata sandi, dan
              tautan aktivasi/pemulihan lama akan dicabut. Kirim aktivasi
              setelah menyimpan.
            </p>
          )}
          {message && (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Batal
            </Button>
            <Button disabled={pending}>
              {pending && (
                <LoaderCircle
                  className="size-4 animate-spin"
                  aria-hidden="true"
                />
              )}
              {pending ? "Menyimpan…" : "Simpan Mahasiswa"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
function DeleteStudent({
  student,
  onDeleted,
  controlledOpen,
  onOpen,
}: {
  student: Student;
  onDeleted: (message: string) => void;
  controlledOpen?: boolean;
  onOpen?: (open: boolean) => void;
}) {
  const [localOpen, setLocalOpen] = useState(false);
  const open = controlledOpen ?? localOpen;
  const setOpen = onOpen ?? setLocalOpen;
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();
  return (
    <AlertDialog
      open={open}
      onOpenChange={(value) => {
        if (!pending) {
          setOpen(value);
          setMessage("");
        }
      }}
    >
      {controlledOpen === undefined && <AlertDialogTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          aria-label={`Hapus ${student.name}`}
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </Button>
      </AlertDialogTrigger>}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus mahasiswa?</AlertDialogTitle>
          <AlertDialogDescription>
            Akun {student.name} ({student.nim || "NIM belum diisi"}) akan
            dihapus. Mahasiswa yang memiliki relasi atau riwayat War tidak dapat
            dihapus.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {message && (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Batal</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-white hover:bg-destructive/90"
            disabled={pending}
            onClick={async (e) => {
              e.preventDefault();
              if (pending) return;
              setPending(true);
              setMessage("");
              try {
                const result = await api<{ message: string }>(
                  `/api/admin/students/${student.id}`,
                  {},
                  "DELETE",
                );
                setOpen(false);
                toast.success(result.message);
                onDeleted(result.message);
                router.refresh();
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Mahasiswa gagal dihapus.");
                setMessage(
                  error instanceof Error
                    ? error.message
                    : "Mahasiswa gagal dihapus.",
                );
              } finally {
                setPending(false);
              }
            }}
          >
            {pending ? "Menghapus…" : "Ya, Hapus Mahasiswa"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
export function StudentActions() {
  const [message, setMessage] = useState("");
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <TemplateButton />
        <StudentImport />
        <StudentForm onSaved={setMessage} />
      </div>
      {message && (
        <p role="status" className="text-sm text-success">
          {message}
        </p>
      )}
    </div>
  );
}
export function StudentsTable({ students }: { students: Student[] }) {
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(50);
  const [message, setMessage] = useState("");
  const shown = students.filter((s) =>
    `${s.name} ${s.nim ?? ""} ${s.email}`
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  );
  return (
    <Card className="overflow-hidden py-0">
      <CardContent className="space-y-4 px-0">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-5 sm:px-6">
          <div className="relative w-full sm:max-w-sm">
            <Search
              className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Label htmlFor="student-search" className="sr-only">
              Cari nama, NIM, atau email
            </Label>
            <Input
              id="student-search"
              placeholder="Cari nama, NIM, atau email…"
              className="pl-9"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setLimit(50);
              }}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {students.length.toLocaleString("id-ID")} mahasiswa
          </p>
        </div>
        {message && (
          <p role="status" className="px-4 text-sm text-success sm:px-6">
            {message}
          </p>
        )}
        <Table className="min-w-[52rem]">
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="pl-4 sm:pl-6">Nama Lengkap</TableHead>
              <TableHead>NIM</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status Akun</TableHead>
              <TableHead className="pr-4 sm:pr-6">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.slice(0, limit).map((s) => (
              <TableRow key={s.id}>
                <TableCell className="min-w-44 max-w-72 whitespace-normal py-4 pl-4 font-medium sm:pl-6">
                  {s.name}
                </TableCell>
                <TableCell className="min-w-32 max-w-40 whitespace-normal font-medium">
                  {s.nim || (
                    <span className="whitespace-nowrap text-sm font-normal text-warning">
                      Belum diisi
                    </span>
                  )}
                </TableCell>
                <TableCell className="min-w-56 max-w-64 break-all whitespace-normal">
                  {s.email}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={
                      s.active
                        ? "gap-1 bg-success-subtle text-success"
                        : "bg-muted text-muted-foreground"
                    }
                  >
                    {s.active && (
                      <CheckCircle2 className="size-3" aria-hidden="true" />
                    )}
                    {s.active ? "Aktif" : "Belum aktif"}
                  </Badge>
                </TableCell>
                <TableCell className="pr-4 sm:pr-6">
                  <StudentRowActions student={s} onSaved={setMessage} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!shown.length && (
          <p className="px-6 py-10 text-center text-sm text-muted-foreground">
            {students.length
              ? "Tidak ada mahasiswa yang sesuai."
              : "Belum ada mahasiswa. Tambahkan akun atau impor berkas Excel."}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-4 sm:px-6">
          <p className="text-xs text-muted-foreground">
            Menampilkan {Math.min(limit, shown.length)} dari {shown.length}{" "}
            mahasiswa
          </p>
          {shown.length > limit && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setLimit((n) => n + 50)}
            >
              Tampilkan berikutnya
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StudentRowActions({ student, onSaved }: { student: Student; onSaved: (message: string) => void }) {
  const [edit, setEdit] = useState(false);
  const [remove, setRemove] = useState(false);
  const [pending, setPending] = useState(false);
  return <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-11" disabled={pending} aria-label={`Aksi ${student.name}`}><MoreHorizontal aria-hidden="true" /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => setEdit(true)}><Pencil aria-hidden="true" />Ubah mahasiswa</DropdownMenuItem>
        {!student.active && <DropdownMenuItem onSelect={async () => {
          setPending(true);
          try { const result = await api<{ message: string }>("/api/admin/students/activation-email", { userId: student.id }); toast.success(result.message); }
          catch (error) { toast.error(error instanceof Error ? error.message : "Email gagal dikirim."); }
          finally { setPending(false); }
        }}><Mail aria-hidden="true" />Kirim aktivasi</DropdownMenuItem>}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => setRemove(true)}><Trash2 aria-hidden="true" />Hapus mahasiswa</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    <StudentForm student={student} onSaved={onSaved} controlledOpen={edit} onOpen={setEdit} />
    <DeleteStudent student={student} onDeleted={onSaved} controlledOpen={remove} onOpen={setRemove} />
  </>;
}
