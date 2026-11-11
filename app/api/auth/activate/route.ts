import { z } from "zod";
import { body, endpoint, sameOrigin } from "@/lib/http";
import { consumeToken } from "@/modules/accounts/service";
export async function POST(request: Request) { return endpoint(async () => {
  sameOrigin(request); const input = z.object({ token: z.string(), password: z.string() }).parse(await body(request));
  return consumeToken(input.token, input.password, "ACTIVATION");
}); }
