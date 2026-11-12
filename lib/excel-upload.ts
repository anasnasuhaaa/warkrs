import "server-only";
import { invariant, AppError } from "./errors";
import { MAX_EXCEL_BYTES } from "@/modules/accounts/excel";

// Only this endpoint accepts larger multipart bodies. Count streamed bytes even
// when Content-Length is missing or dishonest; JSON limits stay unchanged.
export async function excelUpload(request: Request): Promise<File> {
  const maxBody = MAX_EXCEL_BYTES + 64 * 1024;
  invariant(
    request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("multipart/form-data;"),
    "INVALID_FILE",
    "Unggah berkas .xlsx menggunakan formulir impor Excel.",
  );
  invariant(
    Number(request.headers.get("content-length") ?? 0) <= maxBody,
    "INVALID_FILE",
    "Ukuran berkas maksimal 2 MB.",
    413,
  );
  invariant(
    request.body,
    "INVALID_FILE",
    "Pilih berkas Excel terlebih dahulu.",
  );
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxBody) {
        await reader.cancel();
        throw new AppError("INVALID_FILE", "Ukuran berkas maksimal 2 MB.", 413);
      }
      chunks.push(value);
    }
    const data = await new Response(new Uint8Array(Buffer.concat(chunks)), {
      headers: { "Content-Type": request.headers.get("content-type")! },
    }).formData();
    const entries = [...data.entries()];
    const file = data.get("file");
    invariant(
      entries.length === 1 && file && typeof file !== "string",
      "INVALID_FILE",
      "Unggah tepat satu berkas Excel .xlsx.",
    );
    invariant(
      file.size > 0 && file.size <= MAX_EXCEL_BYTES,
      "INVALID_FILE",
      "Pilih berkas .xlsx berukuran maksimal 2 MB.",
    );
    return file;
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError(
      "INVALID_FILE",
      "Berkas unggahan tidak dapat dibaca. Pilih ulang berkas .xlsx.",
    );
  } finally {
    reader.releaseLock();
  }
}
