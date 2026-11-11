import { z } from "zod";
import { body, endpoint, sameOrigin } from "@/lib/http";
import { requireActor } from "@/lib/authorization";
import { importStudents } from "@/modules/accounts/service";
export async function POST(request: Request) { return endpoint(async () => {
  sameOrigin(request); const actor = await requireActor(request.headers);
  const input = z.object({ csv: z.string(), preview: z.boolean().default(true) }).parse(await body(request));
  return importStudents(actor, input.csv, input.preview);
}); }
