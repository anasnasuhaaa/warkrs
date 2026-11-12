type DatabaseStep = "configuration" | "connection" | "migration";
const hints: Record<string, string> = {
  ETIMEDOUT: "Koneksi melewati batas waktu. Periksa akses jaringan ke PostgreSQL, firewall/VPN dan pembatasan IP Neon; coba jaringan lain.",
  ENETUNREACH: "Jalur jaringan ke database tidak tersedia. Periksa koneksi IPv4/IPv6, firewall/VPN atau coba hotspot.",
  EHOSTUNREACH: "Host database tidak dapat dijangkau dari jaringan ini.",
  ENOTFOUND: "DNS host database tidak ditemukan. Periksa hostname pada URL Neon.",
  EAI_AGAIN: "Resolusi DNS sementara gagal. Periksa jaringan dan coba kembali.",
  ECONNREFUSED: "Koneksi ditolak. Periksa host, port dan status database.",
  ECONNRESET: "Koneksi terputus. Periksa jaringan, proxy dan status database.",
  SELF_SIGNED_CERT_IN_CHAIN: "Rantai sertifikat TLS tidak dipercaya. Periksa CA/proxy jaringan; jangan menonaktifkan verifikasi sertifikat.",
  DEPTH_ZERO_SELF_SIGNED_CERT: "Sertifikat TLS tidak dipercaya. Periksa CA/proxy jaringan.",
  UNABLE_TO_VERIFY_LEAF_SIGNATURE: "Rantai sertifikat TLS tidak lengkap atau tidak dipercaya.",
  UNABLE_TO_GET_ISSUER_CERT_LOCALLY: "CA penerbit sertifikat TLS tidak ditemukan.",
  ERR_TLS_CERT_ALTNAME_INVALID: "Hostname tidak cocok dengan sertifikat TLS. Periksa URL database.",
  "28P01": "Autentikasi ditolak. Periksa role dan kata sandi pada URL database.",
  "3D000": "Database tujuan tidak ditemukan. Periksa nama database pada URL.",
  "42501": "Izin database tidak mencukupi. Jalankan migrasi menggunakan role pemilik skema.",
  "42P07": "Objek database sudah ada. Cocokkan skema dengan jurnal migrasi sebelum melanjutkan; jangan reset database.",
  "42701": "Kolom sudah ada. Cocokkan skema dengan jurnal migrasi sebelum melanjutkan.",
  "42703": "Kolom yang dibutuhkan belum ada. Periksa apakah semua migrasi telah diterapkan pada database tujuan.",
};

/** Never print pg/Drizzle errors directly: messages can include URLs, SQL and row data. */
export function databaseFailure(error: unknown, step: DatabaseStep) {
  const codes = new Set<string>();
  const visited = new Set<object>();
  let timeout = false;
  function inspect(value: unknown, depth = 0) {
    if (!value || typeof value !== "object" || visited.has(value) || depth > 8) return;
    visited.add(value);
    const item = value as { code?: unknown; message?: unknown; cause?: unknown; errors?: unknown };
    if (typeof item.code === "string" && (Object.hasOwn(hints, item.code) || /^[0-9A-Z]{5}$/.test(item.code))) codes.add(item.code);
    if (typeof item.message === "string" && /timeout|timed out/i.test(item.message)) timeout = true;
    inspect(item.cause, depth + 1);
    if (Array.isArray(item.errors)) for (const nested of item.errors.slice(0, 16)) inspect(nested, depth + 1);
  }
  inspect(error);
  if (!codes.size && timeout) codes.add("ETIMEDOUT");
  const label = { configuration: "konfigurasi", connection: "koneksi", migration: "migrasi SQL" }[step];
  const details = [...codes].map(code => `${code}: ${hints[code] ?? "Database menolak operasi. Periksa SQL migrasi dan izin role."}`);
  if (!details.length) details.push("Penyebab belum teridentifikasi. Periksa konfigurasi URL, koneksi dan berkas migrasi; detail sensitif tidak dicetak.");
  return `Pemeriksaan database gagal pada tahap ${label}.\n${details.join("\n")}`;
}
