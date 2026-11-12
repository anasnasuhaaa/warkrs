import ExcelJS from "exceljs";
export async function excelFixture(
  rows: unknown[][],
  headers = ["no", "nama", "nim", "email"],
) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Mahasiswa");
  sheet.addRow(headers);
  for (const row of rows) sheet.addRow(row);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
