import { z } from "zod";
import { body, endpoint, sameOrigin } from "@/lib/http";
import { requestReset } from "@/modules/accounts/service";
export async function POST(request: Request) {
  return endpoint(async () => {
    sameOrigin(request);
    const input = z.object({ email: z.string() }).parse(await body(request));
    return requestReset(input.email);
  });
}
