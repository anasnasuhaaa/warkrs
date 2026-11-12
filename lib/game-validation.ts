import { z } from "zod";
export const draftInput = z.object({
  title: z.string().trim().min(1, "Judul wajib diisi.").max(150),
  termsText: z.string().trim().max(10000),
  startsAt: z.iso.datetime({ offset: true, error: "Pilih tanggal dan waktu mulai." }),
  endsAt: z.iso.datetime({ offset: true, error: "Pilih tanggal dan waktu selesai." }),
  packages: z.array(z.object({
    name: z.string().trim().min(1, "Nama paket wajib diisi.").max(100),
    capacity: z.number({ error: "Kuota harus berupa angka." }).int("Kuota harus bilangan bulat.").min(1, "Kuota minimal 1.").max(100000),
  })).max(50),
  userIds: z.array(z.uuid()).max(5000),
});
export const draftFormInput = draftInput.superRefine((value, ctx) => {
  if (new Date(value.endsAt) <= new Date(value.startsAt))
    ctx.addIssue({ code: "custom", path: ["endsAt"], message: "Waktu selesai harus setelah waktu mulai." });
  const seen = new Set<string>();
  value.packages.forEach((p, i) => {
    const name = p.name.normalize("NFKC").toLowerCase();
    if (seen.has(name)) ctx.addIssue({ code: "custom", path: ["packages", i, "name"], message: "Nama paket harus berbeda." });
    seen.add(name);
  });
  if (new Set(value.userIds).size !== value.userIds.length)
    ctx.addIssue({ code: "custom", path: ["userIds"], message: "Peserta tidak boleh duplikat." });
});
export const publicationInput = draftFormInput.superRefine((value, ctx) => {
  if (!value.termsText) ctx.addIssue({ code: "custom", path: ["termsText"], message: "Ketentuan wajib diisi sebelum publikasi." });
  if (!value.packages.length) ctx.addIssue({ code: "custom", path: ["packages"], message: "Tambahkan minimal satu paket." });
  if (!value.userIds.length) ctx.addIssue({ code: "custom", path: ["userIds"], message: "Pilih minimal satu peserta." });
  if (value.packages.reduce((sum, p) => sum + p.capacity, 0) < value.userIds.length)
    ctx.addIssue({ code: "custom", path: ["packages"], message: "Total kuota harus mencakup seluruh peserta." });
});
export const endWarInput = z.object({
  reason: z.string().trim().min(10, "Alasan minimal 10 karakter.").max(500, "Alasan maksimal 500 karakter."),
  confirmed: z.literal(true),
});
export type DraftInput = z.infer<typeof draftInput>;

export const visibilityInput = z.object({ isHidden: z.boolean() }).strict();
export const deleteWarInput = z.object({
  confirmation: z.string().min(1, "Ketik judul War.").max(150),
  reason: z.string().trim().min(10, "Alasan minimal 10 karakter.").max(500),
  simulationConfirmed: z.literal(true, { error: "Pastikan War ini simulasi atau pengujian." }),
}).strict();
