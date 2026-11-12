import { endpoint } from "@/lib/http";
import { requireAdmin } from "@/lib/authorization";
import { studentTemplate, EXCEL_MIME } from "@/modules/accounts/excel";
export const runtime = "nodejs";
export async function GET(request: Request) {
  let response: Response | undefined;
  const checked = await endpoint(async () => {
    await requireAdmin(request.headers);
    response = new Response(new Uint8Array(await studentTemplate()), {
      headers: {
        "Content-Type": EXCEL_MIME,
        "Content-Disposition": 'attachment; filename="template-mahasiswa.xlsx"',
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
    return null;
  });
  return checked.ok && response ? response : checked;
}
