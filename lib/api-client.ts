export async function api<T>(url: string, data?: unknown, method = "POST"): Promise<T> {
  const response = await fetch(url, { method: data === undefined ? "GET" : method, credentials: "same-origin", cache: "no-store", headers: data === undefined ? undefined : { "Content-Type": "application/json" }, body: data === undefined ? undefined : JSON.stringify(data) });
  const json = await response.json();
  if (!response.ok) throw new Error(json.error?.message ?? "Permintaan gagal. Coba kembali.");
  return Object.prototype.hasOwnProperty.call(json, "data") ? json.data : json;
}
