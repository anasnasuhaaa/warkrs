import { endpoint } from "@/lib/http";
import { requireAdmin } from "@/lib/authorization";
import { exportWar } from "@/modules/games/export";
export const runtime = "nodejs";
export async function GET(request: Request, { params }: { params: Promise<{ gameId: string }> }) {
  let download: Response | undefined;
  const checked = await endpoint(async () => {
    const actor = await requireAdmin(request.headers);
    const report = await exportWar(actor, (await params).gameId);
    download = new Response(new Uint8Array(report.buffer), { headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${report.filename}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "X-War-Report-Status": report.final ? "final" : "snapshot",
    } });
    return null;
  });
  return download ?? checked;
}
