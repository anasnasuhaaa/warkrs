import "server-only";
import { ZodError } from "zod";
import { AppError, invariant } from "@/lib/errors";
import { readAppUrl } from "@/lib/config";
export function sameOrigin(request: Request) {
  invariant(
    request.headers.get("origin") === readAppUrl(),
    "FORBIDDEN",
    "Asal permintaan tidak diizinkan.",
    403,
  );
}
export async function body(request: Request) {
  invariant(
    Number(request.headers.get("content-length") ?? 0) <= 300_000,
    "INVALID_INPUT",
    "Permintaan terlalu besar.",
  );
  const text = await request.text();
  invariant(
    text.length <= 300_000,
    "INVALID_INPUT",
    "Permintaan terlalu besar.",
  );
  try {
    return JSON.parse(text);
  } catch {
    throw new AppError("INVALID_INPUT", "Format permintaan tidak valid.");
  }
}
export async function endpoint(action: () => Promise<unknown>) {
  try {
    return Response.json(
      { data: await action() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof AppError)
      return Response.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status, headers: { "Cache-Control": "no-store" } },
      );
    if (error instanceof ZodError)
      return Response.json(
        {
          error: {
            code: "INVALID_INPUT",
            message: "Periksa kembali isian yang diperlukan.",
          },
        },
        { status: 422 },
      );
    console.error("request_failed", {
      type: error instanceof Error ? error.name : "unknown",
    });
    return Response.json(
      {
        error: {
          code: "TEMPORARY_FAILURE",
          message: "Layanan sedang bermasalah. Coba lagi sebentar.",
        },
      },
      { status: 503 },
    );
  }
}
