const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[char]!));

/** URLs are supplied only by sendLink's trusted app origin and fragment handoff. */
export function accountEmail(purpose: "ACTIVATION" | "PASSWORD_RESET", url: string, name?: string) {
  const activation = purpose === "ACTIVATION";
  const heading = activation ? "Aktivasi Akun" : "Atur Ulang Kata Sandi";
  const subject = activation ? "Aktivasi Akun War KRS Ilkomerz 62" : "Reset Kata Sandi War KRS Ilkomerz 62";
  const greeting = name?.trim() ? `Halo, ${name.trim()}.` : "Halo.";
  const explanation = activation ? "Akunmu telah disiapkan oleh admin. Buat kata sandi untuk mulai mengikuti War KRS." : "Kami menerima permintaan pengaturan ulang kata sandi akunmu.";
  const notice = "Tautan berlaku 1 jam dan hanya dapat digunakan sekali. Abaikan email ini jika kamu tidak mengharapkannya.";
  return {
    subject,
    text: `${greeting}\n\n${explanation}\n${heading}: ${url}\n\n${notice}`,
    html: `<!doctype html><html lang="id"><meta name="viewport" content="width=device-width, initial-scale=1"><body style="margin:0;background:#f4f7fb;font-family:Arial,sans-serif;color:#172b4d"><table role="presentation" style="width:100%;padding:24px 12px"><tr><td align="center"><table role="presentation" style="width:100%;max-width:560px;background:#fff;border-top:5px solid #1655a3;border-radius:8px"><tr><td style="padding:28px"><p style="color:#1655a3;font-weight:bold">War KRS Ilkomerz 62</p><h1 style="font-size:24px">${escapeHtml(heading)}</h1><p>${escapeHtml(greeting)}</p><p style="line-height:1.6">${escapeHtml(explanation)}</p><p style="margin:28px 0"><a href="${escapeHtml(url)}" style="display:inline-block;padding:14px 22px;border-radius:6px;background:#1655a3;color:#fff;text-decoration:none;font-weight:bold">${escapeHtml(heading)}</a></p><p style="font-size:14px;line-height:1.6">${escapeHtml(notice)}</p><p style="font-size:13px">Jika tombol tidak terbuka, gunakan tautan berikut:</p><a href="${escapeHtml(url)}" style="font-size:13px;overflow-wrap:anywhere;word-break:break-all;color:#1655a3">${escapeHtml(url)}</a></td></tr></table></td></tr></table></body></html>`,
  };
}
