import "server-only";
import ExcelJS from "exceljs";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { games, packages } from "@/db/schema";
import { adminOnly, type Actor } from "@/lib/authorization";
import { invariant } from "@/lib/errors";
import { jakartaPrecise } from "@/lib/time";
import { effectiveStatus } from "./status";

export function worksheetName(raw: string, used: Set<string>, index: number) {
  const clean = raw.replace(/[\\/?*:[\]\u0000-\u001f\u007f]/g, " ").trim().replace(/^'+|'+$/g, "").trim();
  const base = !clean || /^history$/i.test(clean) ? `Paket ${index + 1}` : clean;
  let suffix = "";
  let name = "";
  for (let count = 1; ; count++) {
    name = base.slice(0, 31 - suffix.length).replace(/[\uD800-\uDBFF]$/, "").replace(/'+$/g, "").trimEnd() + suffix;
    if (!used.has(name.toLocaleLowerCase("en-US"))) break;
    suffix = ` (${count + 1})`;
  }
  used.add(name.toLocaleLowerCase("en-US"));
  return name;
}
export async function exportWar(actor: Actor, id: string) {
  adminOnly(actor);
  const data = await getDb().transaction(async (tx) => {
    const [game] = await tx.select().from(games).where(eq(games.id, id));
    invariant(game, "NOT_FOUND", "War tidak ditemukan.", 404);
    const ps = await tx.select().from(packages).where(eq(packages.gameId, id)).orderBy(packages.createdAt, packages.id);
    invariant(ps.length, "NO_PACKAGES", "Tambahkan paket sebelum mengekspor hasil.", 409);
    const rows = await tx.execute(sql`SELECT a.package_id AS "packageId",s.sequence,u.full_name AS name,u.nim,u.email_normalized AS email,s.accepted_at AS "acceptedAt"
      FROM war_allocations a JOIN war_submissions s ON s.id=a.submission_id AND s.game_id=a.game_id AND s.user_id=a.user_id
      JOIN game_packages p ON p.id=a.package_id AND p.game_id=a.game_id
      JOIN game_participants m ON m.game_id=a.game_id AND m.user_id=a.user_id
      JOIN users u ON u.id=a.user_id WHERE a.game_id=${id} ORDER BY s.sequence ASC`);
    const clock = await tx.execute(sql`SELECT clock_timestamp() AS now`);
    return { game, ps, rows: rows.rows, status: effectiveStatus(game, new Date(clock.rows[0].now as string)) };
  }, { isolationLevel: "repeatable read", accessMode: "read only" });
  const final = data.status === "Completed";
  const label = final ? "Hasil final" : "Laporan sementara (snapshot), belum final";
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "War KRS Ilkomerz 62";
  workbook.title = data.game.title;
  workbook.subject = label;
  const used = new Set<string>();
  data.ps.forEach((p, index) => {
    const sheet = workbook.addWorksheet(worksheetName(p.name, used, index), {
      views: [{ state: "frozen", ySplit: 1 }],
      pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
      headerFooter: { oddHeader: label, oddFooter: "Halaman &P dari &N" },
    });
    sheet.columns = [
      { header: "No", key: "no", width: 8 },
      { header: "Nama Lengkap", key: "name", width: 36 },
      { header: "NIM", key: "nim", width: 24 },
      { header: "Email", key: "email", width: 40 },
      { header: "Waktu Diterima", key: "acceptedAt", width: 32 },
    ];
    data.rows.filter(r => r.packageId === p.id).forEach((r, i) => {
      // ExcelJS string values are shared-string cells, never formula objects.
      // Keep NIM as text (including leading zeros); no CSV or formula inference.
      sheet.addRow({ no: i + 1, name: String(r.name), nim: r.nim == null ? "—" : String(r.nim), email: String(r.email), acceptedAt: jakartaPrecise(r.acceptedAt as Date, true) });
    });
    sheet.getColumn("nim").numFmt = "@";
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1655A3" } };
    sheet.autoFilter = { from: "A1", to: "E1" };
    sheet.pageSetup.printTitlesRow = "1:1";
  });
  const buffer = await workbook.xlsx.writeBuffer();
  return { buffer, final, filename: `hasil-war-${id.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) || "war"}-${final ? "final" : "sementara"}.xlsx` };
}
