import "server-only";
import ExcelJS from "exceljs";
import JSZip from "jszip";
import { AppError, invariant } from "@/lib/errors";
import { studentInput } from "@/lib/account-validation";

export const MAX_EXCEL_BYTES = 2 * 1024 * 1024;
export const EXCEL_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
export type ImportRow = {
  row: number;
  name: string;
  nim: string;
  email: string;
  status: "valid" | "inserted" | "invalid" | "duplicate" | "existing";
  reason: string;
};
const headers = ["no", "nama", "nim", "email"];

// Inspect the actual ZIP package, with bounded expansion, before ExcelJS reads it.
// Neither ExcelJS nor this module executes formulas or follows hyperlinks.
async function checkPackage(buffer: Buffer) {
  invariant(
    buffer.length > 0 && buffer.length <= MAX_EXCEL_BYTES,
    "INVALID_FILE",
    "Ukuran berkas maksimal 2 MB.",
  );
  invariant(
    buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 3, 4])),
    "INVALID_FILE",
    "Berkas harus berupa workbook Excel .xlsx yang valid.",
  );
  const zip = await JSZip.loadAsync(buffer);
  const entries = Object.values(zip.files).filter((f) => !f.dir);
  invariant(
    entries.length <= 256,
    "INVALID_FILE",
    "Workbook terlalu kompleks. Gunakan template mahasiswa.",
  );
  let expanded = 0;
  let types = "";
  for (const entry of entries) {
    invariant(
      !/vba|macrosheet|activex|embeddings/i.test(entry.name),
      "INVALID_FILE",
      "Berkas dengan makro atau objek tertanam tidak didukung.",
    );
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      const stream = entry.nodeStream("nodebuffer");
      stream.on("data", (data: Buffer) => {
        expanded += data.length;
        if (expanded > 16 * 1024 * 1024) {
          stream.pause();
          reject(
            new AppError(
              "INVALID_FILE",
              "Isi workbook terlalu besar. Gunakan template mahasiswa.",
            ),
          );
        } else if (entry.name === "[Content_Types].xml") chunks.push(data);
      });
      stream.on("error", reject);
      stream.on("end", resolve);
      stream.resume();
    });
    if (entry.name === "[Content_Types].xml")
      types = Buffer.concat(chunks).toString("utf8");
  }
  invariant(
    zip.file("xl/workbook.xml") &&
      types.includes(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml",
      ) &&
      !/macroEnabled|vbaProject|macrosheet/i.test(types),
    "INVALID_FILE",
    "Hanya workbook .xlsx tanpa makro yang didukung.",
  );
}
function cellText(cell: ExcelJS.Cell, nim = false): string {
  const v = cell.value;
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") {
    invariant(
      Number.isFinite(v) && (!nim || (Number.isSafeInteger(v) && v >= 0)),
      "INVALID_CELL",
      "NIM harus berupa teks atau angka bulat tanpa kehilangan presisi.",
    );
    // Excel numeric cells with an explicit zero mask preserve their visible zeros.
    return nim && /^0+$/.test(cell.numFmt)
      ? String(v).padStart(cell.numFmt.length, "0")
      : String(v);
  }
  if (typeof v === "object" && "richText" in v)
    return v.richText
      .map((r) => r.text)
      .join("")
      .trim();
  if (typeof v === "object" && "hyperlink" in v)
    return String(v.text ?? "").trim();
  throw new AppError(
    "INVALID_CELL",
    "Sel tidak boleh berisi rumus, tanggal, nilai boolean, atau galat Excel. Gunakan teks.",
  );
}
export async function parseStudentsExcel(
  buffer: Buffer,
  filename: string,
): Promise<ImportRow[]> {
  invariant(
    /\.xlsx$/i.test(filename),
    "INVALID_FILE",
    "Pilih berkas Excel .xlsx. CSV, .xls, dan .xlsm tidak didukung.",
  );
  const workbook = new ExcelJS.Workbook();
  try {
    await checkPackage(buffer);
    await workbook.xlsx.load(new Uint8Array(buffer).buffer);
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError(
      "INVALID_FILE",
      "Workbook tidak dapat dibaca. Gunakan berkas .xlsx dari template mahasiswa.",
    );
  }
  const sheet = workbook.worksheets.find(
    (s) => s.actualRowCount > 0 && s.state === "visible",
  );
  invariant(sheet, "INVALID_FILE", "Worksheet mahasiswa tidak ditemukan.");
  let headerRow = 0;
  sheet.eachRow((r, number) => {
    if (!headerRow && r.hasValues) headerRow = number;
  });
  const first = sheet.getRow(headerRow);
  let actual: string[];
  try {
    actual = Array.from({ length: Math.max(first.cellCount, 4) }, (_, i) =>
      cellText(first.getCell(i + 1)).toLowerCase(),
    );
  } catch {
    throw new AppError(
      "INVALID_FILE",
      "Header harus berurutan: no, nama, nim, email.",
    );
  }
  while (actual.length > 4 && !actual.at(-1)) actual.pop();
  invariant(
    actual.length === 4 && headers.every((h, i) => actual[i] === h),
    "INVALID_FILE",
    "Header harus berurutan: no, nama, nim, email. Unduh template yang tersedia.",
  );
  const rows: ImportRow[] = [];
  const emails = new Set<string>();
  const nims = new Set<string>();
  sheet.eachRow((row, number) => {
    if (number <= headerRow) return;
    if (
      ![1, 2, 3, 4].some((i) => {
        const v = row.getCell(i).value;
        return (
          v !== null && v !== undefined && !(typeof v === "string" && !v.trim())
        );
      })
    )
      return;
    invariant(
      rows.length < 1000,
      "INVALID_FILE",
      "Maksimal 1.000 mahasiswa per impor.",
    );
    const result: ImportRow = {
      row: number,
      name: "",
      nim: "",
      email: "",
      status: "invalid",
      reason: "",
    };
    const errors: string[] = [];
    for (const [key, column] of [
      ["name", 2],
      ["nim", 3],
      ["email", 4],
    ] as const) {
      try {
        // Bound echoed invalid values as well as accepted records, so an invalid
        // cell cannot inflate the row-result response beyond the upload limits.
        const max = key === "name" ? 150 : key === "nim" ? 50 : 254;
        result[key] = cellText(row.getCell(column), key === "nim").slice(
          0,
          max + 1,
        );
      } catch (e) {
        errors.push(
          `${key === "name" ? "Nama" : key === "nim" ? "NIM" : "Email"}: ${(e as Error).message}`,
        );
      }
    }
    // No. is deliberately ignored as an identifier, but formulas are never read.
    const parsed = studentInput.safeParse(result);
    if (!parsed.success)
      errors.push(...parsed.error.issues.map((i) => i.message));
    if (!errors.length && parsed.success) {
      Object.assign(result, parsed.data);
      const duplicate = [
        emails.has(result.email) && "Email duplikat dalam berkas.",
        nims.has(result.nim) && "NIM duplikat dalam berkas.",
      ].filter(Boolean);
      result.status = duplicate.length ? "duplicate" : "valid";
      result.reason = duplicate.join(" ");
      emails.add(result.email);
      nims.add(result.nim);
    } else result.reason = [...new Set(errors)].join(" ");
    rows.push(result);
  });
  invariant(
    rows.length > 0,
    "INVALID_FILE",
    "Berkas belum berisi data mahasiswa.",
  );
  return rows;
}
export async function studentTemplate() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Mahasiswa");
  sheet.columns = [
    { header: "no", width: 8 },
    { header: "nama", width: 36 },
    { header: "nim", width: 24, style: { numFmt: "@" } },
    { header: "email", width: 42 },
  ];
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
