import { endpoint, sameOrigin } from "@/lib/http";
import { requireAdmin } from "@/lib/authorization";
import { excelUpload } from "@/lib/excel-upload";
import { importStudents } from "@/modules/accounts/service";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return endpoint(async () => {
    sameOrigin(request);
    const actor = await requireAdmin(request.headers);
    const file = await excelUpload(request);
    return importStudents(
      actor,
      Buffer.from(await file.arrayBuffer()),
      file.name,
    );
  });
}
