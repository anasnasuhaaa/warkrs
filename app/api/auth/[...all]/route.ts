import { getAuth } from "@/lib/auth";
import { endpoint, body, sameOrigin } from "@/lib/http";
import { invariant } from "@/lib/errors";
import { limit } from "@/lib/rate-limit";
import { z } from "zod";
import { emailSchema } from "@/lib/account-validation";
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
    let authRequest = request;
    if (path.endsWith("/sign-in/email")) {
      const input = z
        .object({ email: emailSchema, password: z.string().min(1).max(128) })
        .passthrough()
        .parse(await body(request.clone()));
      await limit(`login:${input.email}`, 10);
      const headers = new Headers(request.headers);
      headers.delete("content-length");
      authRequest = new Request(request.url, {
        method: "POST",
        headers,
        body: JSON.stringify(input),
      });
    }
    response = await getAuth().handler(authRequest);
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
