import { z } from "zod";
import { endpoint, body, sameOrigin } from "@/lib/http";
import { requireAdmin } from "@/lib/authorization";
import { updateStudent, deleteStudent } from "@/modules/accounts/service";
type Context = { params: Promise<{ studentId: string }> };
export async function PATCH(request: Request, context: Context) {
  return endpoint(async () => {
    sameOrigin(request);
    const actor = await requireAdmin(request.headers);
    return updateStudent(
      actor,
      z.uuid().parse((await context.params).studentId),
      await body(request),
    );
  });
}
export async function DELETE(request: Request, context: Context) {
  return endpoint(async () => {
    sameOrigin(request);
    const actor = await requireAdmin(request.headers);
    return deleteStudent(
      actor,
      z.uuid().parse((await context.params).studentId),
    );
  });
}
