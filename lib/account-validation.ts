import { z } from "zod";

// Practical credential-provider syntax: dots, plus, hyphens, underscores and
// apostrophes, with DNS-style domains and no provider/TLD allowlist.
// Normalize before validation, consistently with users.email_normalized and auth.
export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}
const localPart = /^(?:[a-z0-9_'+-]+\.)*[a-z0-9_'+-]*[a-z0-9_+-]$/i;
const domainLabel = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;
export const emailSchema = z
  .string({ error: "Email wajib diisi." })
  .transform(normalizeEmail)
  .pipe(
    z
      .string()
      .min(1, "Email wajib diisi.")
      .max(254, "Email maksimal 254 karakter.")
      .refine((email) => {
        const parts = email.split("@");
        if (
          parts.length !== 2 ||
          parts[0].length > 64 ||
          !localPart.test(parts[0])
        )
          return false;
        const labels = parts[1].split(".");
        return (
          labels.length >= 2 &&
          labels.every((label) => domainLabel.test(label)) &&
          /^[a-z]{2,63}$/i.test(labels.at(-1)!)
        );
      }, "Format email tidak valid."),
  );
export const nimSchema = z
  .string({ error: "NIM wajib diisi." })
  .trim()
  .toUpperCase()
  .min(1, "NIM wajib diisi.")
  .max(50, "NIM maksimal 50 karakter.")
  .regex(
    /^[A-Z0-9]+(?:[.-][A-Z0-9]+)*$/,
    "NIM hanya boleh berisi huruf, angka, titik, atau tanda hubung di antara huruf/angka.",
  );
export const studentInput = z.object({
  name: z
    .string({ error: "Nama lengkap wajib diisi." })
    .trim()
    .min(1, "Nama lengkap wajib diisi.")
    .max(150, "Nama lengkap maksimal 150 karakter.")
    .refine(
      (name) => !/[\u0000-\u001f\u007f]/.test(name),
      "Nama lengkap mengandung karakter tidak valid.",
    ),
  nim: nimSchema,
  email: emailSchema,
});
export type StudentInput = z.infer<typeof studentInput>;

export const passwordSchema = z.string().min(8, "Kata sandi minimal 8 karakter.").max(128);
