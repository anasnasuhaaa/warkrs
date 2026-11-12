import { endpoint, body, sameOrigin } from "@/lib/http";
import { requireAdmin } from "@/lib/authorization";
import { createStudent, listStudents } from "@/modules/accounts/service";
export async function GET(request: Request) {
  return endpoint(async () =>
    listStudents(await requireAdmin(request.headers)),
  );
}
export async function POST(request: Request) {
  return endpoint(async () => {
    sameOrigin(request);
    const actor = await requireAdmin(request.headers);
    return createStudent(actor, await body(request));
  });
}
