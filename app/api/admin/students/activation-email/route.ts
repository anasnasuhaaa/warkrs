import { z } from "zod";
import { body, endpoint, sameOrigin } from "@/lib/http";
import { requireActor } from "@/lib/authorization";
import { activationEmail } from "@/modules/accounts/service";
export async function POST(request: Request) { return endpoint(async () => {
  sameOrigin(request); const actor = await requireActor(request.headers); const { userId } = z.object({ userId: z.string() }).parse(await body(request)); return activationEmail(actor, userId);
}); }
