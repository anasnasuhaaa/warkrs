export class ApiError extends Error {
  constructor(message: string, public fields: Record<string, string> = {}) { super(message); }
}
export async function api<T>(
  url: string,
  data?: unknown,
  method = "POST",
): Promise<T> {
  const multipart = typeof FormData !== "undefined" && data instanceof FormData;
  const response = await fetch(url, {
    method: data === undefined ? "GET" : method,
    credentials: "same-origin",
    cache: "no-store",
    headers:
      data === undefined || multipart
        ? undefined
        : { "Content-Type": "application/json" },
    body:
      data === undefined ? undefined : multipart ? data : JSON.stringify(data),
  });
  const json = await response.json();
  if (!response.ok)
    throw new ApiError(json.error?.message ?? "Permintaan gagal. Coba kembali.", json.error?.fields);
  return Object.prototype.hasOwnProperty.call(json, "data") ? json.data : json;
}
