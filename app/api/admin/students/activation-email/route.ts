import { z } from "zod";
import { body, endpoint, sameOrigin } from "@/lib/http";
import { requireAdmin } from "@/lib/authorization";
import { activationEmail } from "@/modules/accounts/service";
export async function POST(request: Request) {
  return endpoint(async () => {
    sameOrigin(request);
    const actor = await requireAdmin(request.headers);
    const { userId } = z
      .object({ userId: z.string() })
      .parse(await body(request));
    return activationEmail(actor, userId);
  });
}
