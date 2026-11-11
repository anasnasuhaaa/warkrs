import { getAuth } from "@/lib/auth";
import { endpoint, body, sameOrigin } from "@/lib/http";
import { invariant } from "@/lib/errors";
import { limit } from "@/lib/rate-limit";
import { z } from "zod";
export async function GET(request: Request) {
  if (new URL(request.url).pathname !== "/api/auth/get-session")
    return Response.json(
      { error: { code: "NOT_FOUND", message: "Halaman tidak ditemukan." } },
      { status: 404 },
    );
  return getAuth().handler(request);
}
export async function POST(request: Request) {
  const path = new URL(request.url).pathname;
  if (!["/api/auth/sign-in/email", "/api/auth/sign-out"].includes(path))
    return Response.json(
      { error: { code: "NOT_FOUND", message: "Halaman tidak ditemukan." } },
      { status: 404 },
    );
  let response: Response | undefined;
  const checked = await endpoint(async () => {
    sameOrigin(request);
    if (path.endsWith("/sign-in/email")) {
      const input = z
        .object({ email: z.email(), password: z.string().min(1).max(128) })
        .parse(await body(request.clone()));
      await limit(`login:${input.email.toLowerCase()}`, 10);
    }
    response = await getAuth().handler(request);
    invariant(
      response.ok,
      "LOGIN_FAILED",
      "Email atau kata sandi tidak sesuai, atau akun belum aktif.",
      response.status,
    );
    return null;
  });
  return checked.ok && response ? response : checked;
}
