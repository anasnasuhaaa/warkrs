import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import ExcelJS from "exceljs";
const fixtures = JSON.parse(
  readFileSync(".test-artifacts/browser-fixtures.json", "utf8"),
);
async function login(page: Page, who = fixtures.student) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(who.email);
  await page.getByLabel("Kata sandi", { exact: true }).fill(fixtures.password);
  await page.getByRole("button", { name: "Masuk ke War KRS" }).click();
  await expect(page).toHaveURL(who.role === "ADMIN" ? /\/admin$/ : /\/games$/);
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}
async function accessibility(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    results.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({
        target: n.target,
        summary: n.failureSummary,
      })),
    })),
  ).toEqual([]);
}
async function join(page: Page) {
  await expect(page.getByRole("button", { name: "Gabung War" })).toBeDisabled();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Gabung War" }).click();
  await expect(
    page.getByText("Anda sudah bergabung dan menyetujui ketentuan War."),
  ).toBeVisible();
}
async function rank(page: Page) {
  await page.getByRole("button", { name: /\+ Paket A/ }).click();
  await expect(
    page.getByRole("button", { name: "Kirim urutan paket" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: /\+ Paket B/ }).click();
  await expect(
    page.getByRole("button", { name: "Kirim urutan paket" }),
  ).toBeEnabled();
}
test("activation once, Indonesian login and protected routes", async ({
  page,
}) => {
  await page.goto(`/activate#${fixtures.activationToken}`);
  await page
    .getByLabel("Kata sandi (minimal 8 karakter)", { exact: true })
    .fill(fixtures.password);
  await page.getByLabel("Ulangi kata sandi").fill(fixtures.password);
  await page.getByRole("button", { name: "Aktifkan akun" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText("Kata sandi tersimpan. Silakan masuk.")).toBeVisible();
  await accessibility(page);
  await login(page, fixtures.inactive);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/games$/);
});
for (const width of [320, 375, 768, 1024, 1440])
  test(`critical student journey at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 850 });
    await login(page);
    const f = fixtures.live.find((x: { width: number }) => x.width === width);
    await page.goto(`/games/${f.game.id}`);
    await expect(
      page.getByRole("heading", { name: f.game.title, exact: true }),
    ).toBeVisible();
    await noOverflow(page);
    await accessibility(page);
    await join(page);
    await rank(page);
    await page.screenshot({
      path: `.test-artifacts/redesign-ranking-${width}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "Naikkan pilihan 2" }).click();
    await page.getByRole("button", { name: "Turunkan pilihan 1" }).click();
    await page.getByRole("button", { name: "Kirim urutan paket" }).click();
    await expect(page.getByText("Alokasi Anda diterima")).toBeVisible();
    await page.reload();
    await expect(page.getByText("Alokasi Anda diterima")).toBeVisible();
    await page.screenshot({
      path: `.test-artifacts/viewport-${width}.png`,
      fullPage: true,
    });
    await accessibility(page);
    await noOverflow(page);
    await page.getByRole("tab", { name: "Daftar Paket" }).click();
    await page
      .locator('[data-slot="card"]')
      .filter({ has: page.getByText("Paket A", { exact: true }) })
      .getByRole("button", { name: "Lihat penerima paket" })
      .click();
    await expect(
      page
        .getByRole("dialog")
        .getByRole("cell", { name: fixtures.student.name, exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Perbarui daftar" }),
    ).toBeEnabled();
    await noOverflow(page);
    await accessibility(page);
    await page.keyboard.press("Escape");
    await page.getByRole("tab", { name: "Log Aktivitas" }).click();
    await expect(page.getByText(/Pengiriman .* diterima/)).toBeVisible();
    await noOverflow(page);
  });
test("Upcoming forbids ranking, Completed reload, offline recovery and keyboard navigation", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 320, height: 850 });
  await login(page);
  await page.goto(`/games/${fixtures.upcoming.id}`);
  await join(page);
  await expect(page.getByText("War belum dimulai")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Kirim urutan paket" }),
  ).toHaveCount(0);
  await noOverflow(page);
  await context.setOffline(true);
  await expect(
    page.getByRole("status").filter({ hasText: "Offline" }),
  ).toBeVisible({ timeout: 10000 });
  await context.setOffline(false);
  await expect(
    page.getByRole("status").filter({ hasText: "Tersinkron" }),
  ).toBeVisible({ timeout: 10000 });
  await page.goto(`/games/${fixtures.completed.id}`);
  await expect(page.getByText("War selesai", { exact: true })).toBeVisible();
  await expect(page.getByText("Alokasi Anda diterima")).toBeVisible();
  await page.getByRole("tab", { name: "Tampilan Utama", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Daftar Paket" })).toBeFocused();
  await page.keyboard.press("Enter");
  await noOverflow(page);
  await accessibility(page);
});
test("admin editor and confirmed End War at mobile widths", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 850 });
  await login(page, fixtures.admin);
  await page.goto(`/admin/games/${fixtures.draft.id}`);
  await expect(page.getByLabel("Judul War")).toBeVisible();
  await page.screenshot({
    path: ".test-artifacts/redesign-editor-320.png",
    fullPage: true,
  });
  await noOverflow(page);
  await accessibility(page);
  await page.getByLabel("Judul War").fill("Fiksi draf diperbarui");
  await page.getByRole("button", { name: "Simpan draf" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Draf tersimpan" }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Judul War")).toHaveValue(
    "Fiksi draf diperbarui",
  );
  await page.goto(`/admin/games/${fixtures.live[0].game.id}`);
  await expect(page.getByText("Teralokasi", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Judul War")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Simpan draf" })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Akhiri war", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Ya, akhiri war" }),
  ).toBeDisabled();
  await page
    .getByLabel("Alasan penghentian (minimal 10 karakter)")
    .fill("Pengujian penghentian melalui browser");
  await accessibility(page);
  await page.getByRole("button", { name: "Ya, akhiri war" }).click();
  await expect(
    page.getByRole("heading", { name: "Selesai", exact: true }),
  ).toBeVisible({ timeout: 10000 });
  await noOverflow(page);
});
test("two browsers converge, SSE replay and unauthorized endpoints", async ({
  browser,
}) => {
  const first = await browser.newContext();
  const second = await browser.newContext();
  const a = await first.newPage(),
    b = await second.newPage();
  try {
    await Promise.all([login(a), login(b, fixtures.second)]);
    const id = fixtures.simultaneous.id;
    await Promise.all([a.goto(`/games/${id}`), b.goto(`/games/${id}`)]);
    await Promise.all([join(a), join(b)]);
    await Promise.all([rank(a), rank(b)]);
    await Promise.all([
      a.getByRole("button", { name: "Kirim urutan paket" }).click(),
      b.getByRole("button", { name: "Kirim urutan paket" }).click(),
    ]);
    await expect(a.getByText("Alokasi Anda diterima")).toBeVisible();
    await expect(b.getByText("Alokasi Anda diterima")).toBeVisible();
    await expect
      .poll(async () => {
        const response = await a.request.get(`/api/games/${id}/snapshot`);
        return (await response.json()).data.counts.allocated;
      })
      .toBe(2);
    const snapA = (
      await (await a.request.get(`/api/games/${id}/snapshot`)).json()
    ).data;
    const snapB = (
      await (await b.request.get(`/api/games/${id}/snapshot`)).json()
    ).data;
    expect(snapA.packages).toEqual(snapB.packages);
    const stream = await a.evaluate(async (gameId) => {
      const response = await fetch(
        `/api/games/${gameId}/events/stream?after=0`,
      );
      const reader = response.body!.getReader();
      const chunk = await reader.read();
      await reader.cancel();
      return {
        status: response.status,
        text: new TextDecoder().decode(chunk.value),
      };
    }, id);
    expect(stream.status).toBe(200);
    expect(stream.text).toContain("event: activity");
    const denied = await b.request.post("/api/admin/games", {
      data: {},
      headers: { Origin: "http://localhost:3100" },
    });
    expect(denied.status()).toBe(403);
    const csrf = await b.request.post(`/api/games/${id}/submissions`, {
      data: { packageIds: [] },
      headers: { Origin: "https://evil.invalid" },
    });
    expect(csrf.status()).toBe(403);
  } finally {
    await first.close();
    await second.close();
  }
});

test("official admin sidebar collapses and opens its mobile drawer without overflow", async ({
  page,
}) => {
  await login(page, fixtures.admin);
  for (const width of [320, 375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    await page.goto("/admin");
    const trigger = page.locator("header").getByRole("button", {
      name: "Buka atau tutup navigasi",
      exact: true,
    });
    await expect(
      page.getByRole("heading", { name: "Dashboard", exact: true }),
    ).toBeVisible();
    await noOverflow(page);
    if (width < 768) {
      await trigger.click();
      const drawer = page.getByRole("dialog", { name: "Navigasi admin" });
      await expect(drawer).toBeVisible();
      await accessibility(page);
      await drawer
        .getByRole("link", { name: "Mahasiswa", exact: true })
        .click();
      await expect(drawer).not.toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Mahasiswa", exact: true }),
      ).toBeVisible();
    } else {
      const sidebar = page.locator('[data-slot="sidebar"][data-state]');
      await expect(sidebar).toHaveAttribute("data-state", "expanded");
      await trigger.click();
      await expect(sidebar).toHaveAttribute("data-state", "collapsed");
      await noOverflow(page);
      await trigger.click();
      await expect(sidebar).toHaveAttribute("data-state", "expanded");
    }
    await noOverflow(page);
    await page.screenshot({
      path: `.test-artifacts/redesign-admin-${width}.png`,
      fullPage: true,
    });
  }
});

test("Jakarta calendar and full-minute time selection preserve the server payload in another timezone", async ({
  browser,
}) => {
  const context = await browser.newContext({
    timezoneId: "America/New_York",
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  try {
    await login(page, fixtures.admin);
    await page.goto(`/admin/games/${fixtures.draft.id}`);
    await expect(page.getByLabel("Judul War")).toBeVisible();
    expect(
      await page.evaluate(() => {
        const form = document.querySelector("form")!;
        return (
          document.documentElement.scrollHeight <=
          Math.max(
            window.innerHeight,
            form.getBoundingClientRect().bottom + window.scrollY,
          ) +
            100
        );
      }),
    ).toBe(true);
    await page.screenshot({
      path: ".test-artifacts/redesign-editor-1440.png",
      fullPage: true,
    });
    // Saving unchanged wall-clock dates must preserve UTC, regardless of browser TZ.
    const originalStart =
      new Date(fixtures.draft.startsAt).toISOString().slice(0, 16) + ":00.000Z";
    const originalEnd =
      new Date(fixtures.draft.endsAt).toISOString().slice(0, 16) + ":00.000Z";
    const firstRequest = page.waitForRequest(
      (r) =>
        r.method() === "PATCH" &&
        r.url().includes(`/api/admin/games/${fixtures.draft.id}`),
    );
    await page.getByRole("button", { name: "Simpan draf" }).click();
    const first = (await firstRequest).postDataJSON();
    expect(first.startsAt).toBe(originalStart);
    expect(first.endsAt).toBe(originalEnd);
    await expect(
      page.getByRole("status").filter({ hasText: "Draf tersimpan" }),
    ).toBeVisible();
    const localDay = new Date(
      new Date(fixtures.draft.startsAt).getTime() + 7 * 3600000,
    )
      .toISOString()
      .slice(0, 10);
    const nextDay = new Date(
      new Date(`${localDay}T12:00:00Z`).getTime() + 86400000,
    )
      .toISOString()
      .slice(0, 10);
    await page.getByLabel("Jam mulai", { exact: true }).click();
    await page.getByRole("option", { name: "23", exact: true }).click();
    await page.getByLabel("Menit mulai", { exact: true }).click();
    await page.getByRole("option", { name: "59", exact: true }).click();
    await page.getByRole("button", { name: /Tanggal selesai/ }).click();
    const day = new Date(`${nextDay}T12:00:00-05:00`);
    const label = new Intl.DateTimeFormat("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "America/New_York",
    }).format(day);
    await page.getByRole("button", { name: label, exact: true }).click();
    await page.getByLabel("Jam selesai", { exact: true }).click();
    await page.getByRole("option", { name: "00", exact: true }).click();
    await page.getByLabel("Menit selesai", { exact: true }).click();
    await page.getByRole("option", { name: "00", exact: true }).click();
    const changedRequest = page.waitForRequest(
      (r) =>
        r.method() === "PATCH" &&
        r.url().includes(`/api/admin/games/${fixtures.draft.id}`),
    );
    await page.getByRole("button", { name: "Simpan draf" }).click();
    const payload = (await changedRequest).postDataJSON();
    expect(payload.startsAt).toBe(`${localDay}T16:59:00.000Z`);
    expect(payload.endsAt).toBe(`${localDay}T17:00:00.000Z`);
    expect(payload.userIds).toEqual(
      fixtures.draft.whitelist.map((p: { userId: string }) => p.userId),
    );
    await expect(
      page.getByRole("status").filter({ hasText: "Draf tersimpan" }),
    ).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Jam mulai", { exact: true })).toContainText(
      "23",
    );
    await expect(page.getByLabel("Menit mulai", { exact: true })).toContainText(
      "59",
    );
    // Invalid end-before-start remains a client error, never a changed contract.
    await page.getByLabel("Jam mulai", { exact: true }).click();
    await page.getByRole("option", { name: "00", exact: true }).click();
    await page.getByLabel("Jam selesai", { exact: true }).click();
    await page.getByRole("option", { name: "23", exact: true }).click();
    await page.getByRole("button", { name: /Tanggal selesai/ }).click();
    const previous = new Date(`${localDay}T12:00:00-05:00`);
    const previousLabel = new Intl.DateTimeFormat("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "America/New_York",
    }).format(previous);
    await page
      .getByRole("button", { name: previousLabel, exact: true })
      .click();
    await page.getByLabel("Jam mulai", { exact: true }).click();
    await page.getByRole("option", { name: "23", exact: true }).click();
    await page.getByRole("button", { name: "Simpan draf" }).click();
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: "Waktu selesai harus setelah" }),
    ).toBeVisible();
    await noOverflow(page);
    await accessibility(page);
    for (const width of [320, 375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 950 });
      const dateTrigger = page.getByRole("button", { name: /Tanggal mulai/ });
      await dateTrigger.click();
      await expect(
        page.getByRole("button", { name: "Bulan berikutnya" }),
      ).toBeVisible();
      await noOverflow(page);
      await accessibility(page);
      await page.screenshot({
        path: `.test-artifacts/redesign-calendar-${width}.png`,
        fullPage: true,
      });
      await page.keyboard.press("ArrowRight");
      await page.keyboard.press("Enter");
      await expect(dateTrigger).toHaveAttribute("aria-expanded", "false");
    }
    expect(pageErrors).toEqual([]);
  } finally {
    await context.close();
  }
});

test("new War starts with empty dates and saves then publishes the existing payload", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 950 });
  await login(page, fixtures.admin);
  await page.goto("/admin/games/new");
  await expect(page.getByLabel("Jam mulai", { exact: true })).toBeDisabled();
  await expect(
    page.getByLabel("Menit selesai", { exact: true }),
  ).toBeDisabled();
  await page
    .getByLabel("Judul War")
    .fill("Fiksi pembuatan dari formulir kosong");
  const today = new Date();
  // Tomorrow in the browser timezone avoids dependence on time of day at publish.
  const tomorrow = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 1,
    12,
  );
  const dateLabel = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(tomorrow);
  for (const name of ["mulai", "selesai"]) {
    await page
      .getByRole("button", { name: new RegExp(`Tanggal ${name}`) })
      .click();
    if (tomorrow.getMonth() !== today.getMonth()) {
      await page.getByRole("button", { name: "Bulan berikutnya" }).click();
    }
    await page.getByRole("button", { name: dateLabel, exact: true }).click();
    await expect(page.getByLabel(`Jam ${name}`, { exact: true })).toContainText(
      "00",
    );
    await expect(
      page.getByLabel(`Menit ${name}`, { exact: true }),
    ).toContainText("00");
  }
  await page.getByLabel("Jam selesai", { exact: true }).click();
  await page.getByRole("option", { name: "23", exact: true }).click();
  await page.getByLabel("Menit selesai", { exact: true }).click();
  await page.getByRole("option", { name: "59", exact: true }).click();
  await page
    .getByLabel("Ketentuan yang perlu disetujui peserta")
    .fill("Ketentuan pengujian formulir dan publikasi War.");
  await page
    .getByLabel("Nama paket 1", { exact: true })
    .fill("Paket uji formulir");
  await page.getByLabel("Cari nama atau email").fill(fixtures.student.email);
  await page
    .getByRole("checkbox", { name: new RegExp(fixtures.student.name) })
    .check();
  await noOverflow(page);
  await accessibility(page);
  const response = page.waitForResponse(
    (r) =>
      r.request().method() === "POST" &&
      new URL(r.url()).pathname === "/api/admin/games",
  );
  await page.getByRole("button", { name: "Simpan draf" }).click();
  const created = await response;
  expect(created.ok()).toBe(true);
  const payload = created.request().postDataJSON();
  const wallDate = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
  expect(payload.startsAt).toBe(
    new Date(`${wallDate}T00:00:00+07:00`).toISOString(),
  );
  expect(payload.endsAt).toBe(
    new Date(`${wallDate}T23:59:00+07:00`).toISOString(),
  );
  expect(payload.userIds).toEqual([fixtures.student.id]);
  expect(payload.packages).toEqual([
    { name: "Paket uji formulir", capacity: 1 },
  ]);
  await expect(page).toHaveURL(/\/admin\/games\/[0-9a-f-]+$/);
  await page
    .getByRole("button", { name: "Publikasikan War", exact: true })
    .click();
  await expect(
    page.getByText("War sudah diterbitkan.", { exact: false }),
  ).toBeVisible();
  await expect(page.getByLabel("Judul War")).toHaveCount(0);
  await noOverflow(page);
});

test("public pages use Poppins and direct Indonesian copy", async ({
  page,
}) => {
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "War KRS", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Kesepakatan paket angkatan", { exact: true }),
    ).toHaveCount(0);
    await noOverflow(page);
    await accessibility(page);
    expect(
      await page.evaluate(() => getComputedStyle(document.body).fontFamily),
    ).toContain("Poppins");
    await page.screenshot({
      path: `.test-artifacts/redesign-landing-${width}.png`,
      fullPage: true,
    });
  }
  await page.goto("/login");
  await expect(
    page.getByRole("heading", { name: "Masuk ke War KRS" }),
  ).toBeVisible();
  await page.screenshot({
    path: ".test-artifacts/redesign-login.png",
    fullPage: true,
  });
  await accessibility(page);
});

test("Excel template, partial import, row feedback and activation action", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 950 });
  await login(page, fixtures.admin);
  await page.goto("/admin/students");
  const downloading = page.waitForEvent("download");
  await page.getByRole("link", { name: "Unduh Template", exact: true }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe("template-mahasiswa.xlsx");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(
    new Uint8Array(readFileSync((await download.path())!)).buffer,
  );
  const sheet = workbook.worksheets[0];
  expect(sheet.getRow(1).values).toEqual([
    undefined,
    "no",
    "nama",
    "nim",
    "email",
  ]);
  expect(sheet.getColumn(3).numFmt).toBe("@");
  const key = crypto.randomUUID().replaceAll("-", "");
  const email = `fictional+${key}@apps.ipb.ac.id`;
  const nim = `0000${key.slice(0, 12).toUpperCase()}`;
  sheet.addRow([1, "Mahasiswa Fiksi Excel", nim, `  ${email.toUpperCase()}  `]);
  sheet.addRow([2, "Baris Salah", `X${key}`, "bukan-email"]);
  sheet.addRow([3, "Baris Duplikat", nim, `duplicate+${key}@gmail.com`]);
  await page.getByRole("button", { name: "Impor Excel", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Impor Excel" });
  await expect(
    dialog.getByRole("button", { name: "Impor Mahasiswa", exact: true }),
  ).toBeDisabled();
  const choosingFile = page.waitForEvent("filechooser");
  await dialog
    .getByRole("button", { name: "Pilih Berkas .xlsx", exact: true })
    .click();
  await (
    await choosingFile
  ).setFiles({
    name: "mahasiswa.xlsx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: Buffer.from(await workbook.xlsx.writeBuffer()),
  });
  await dialog
    .getByRole("button", { name: "Impor Mahasiswa", exact: true })
    .click();
  await expect(dialog.getByRole("status")).toContainText("1 ditambahkan");
  await expect(dialog.getByRole("status")).toContainText("1 duplikat berkas");
  await expect(dialog.getByRole("status")).toContainText("1 tidak valid");
  await expect(
    dialog.getByText("Format email tidak valid.", { exact: true }),
  ).toBeVisible();
  await noOverflow(page);
  await accessibility(page);
  await page.screenshot({
    path: ".test-artifacts/students-import-375.png",
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  const search = page.getByLabel("Cari nama, NIM, atau email", { exact: true });
  await search.fill(nim);
  await expect(
    page.getByRole("cell", { name: "Mahasiswa Fiksi Excel", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: nim, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: email, exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Kirim aktivasi", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Pengiriman email belum diaktifkan",
  );
  await noOverflow(page);
});

test("manual student CRUD and protected deletion remain accessible across screen sizes", async ({
  page,
}) => {
  await login(page, fixtures.admin);
  await page.goto("/admin/students");
  for (const width of [320, 375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    await noOverflow(page);
    await accessibility(page);
    await page.screenshot({
      path: `.test-artifacts/students-table-${width}.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 320, height: 950 });
  await page
    .getByRole("button", { name: "Tambah Mahasiswa", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Tambah Mahasiswa",
    exact: true,
  });
  const key = crypto.randomUUID().replaceAll("-", "").toUpperCase();
  const name = `Mahasiswa Fiksi Manual ${key.slice(0, 8)}`;
  const nim = `00${key}`;
  const email = `manual+${key.toLowerCase()}@gmail.com`;
  await dialog.getByLabel("Nama Lengkap", { exact: true }).fill(name);
  await dialog.getByLabel("NIM", { exact: true }).fill(nim);
  await dialog.getByLabel("Email", { exact: true }).fill(email);
  await accessibility(page);
  await noOverflow(page);
  await page.screenshot({
    path: ".test-artifacts/student-form-320.png",
    fullPage: true,
  });
  await dialog
    .getByRole("button", { name: "Simpan Mahasiswa", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  const search = page.getByLabel("Cari nama, NIM, atau email", { exact: true });
  await search.fill(nim);
  await expect(page.getByRole("cell", { name, exact: true })).toBeVisible();
  await page.getByRole("button", { name: `Ubah ${name}`, exact: true }).click();
  const edit = page.getByRole("dialog", {
    name: "Ubah Mahasiswa",
    exact: true,
  });
  await expect(edit.getByLabel("NIM", { exact: true })).toHaveValue(nim);
  await edit.getByLabel("Nama Lengkap", { exact: true }).fill(`${name} Baru`);
  await edit
    .getByRole("button", { name: "Simpan Mahasiswa", exact: true })
    .click();
  await expect(edit).not.toBeVisible();
  await expect(
    page.getByRole("cell", { name: `${name} Baru`, exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: `Hapus ${name} Baru`, exact: true })
    .click();
  const confirmation = page.getByRole("alertdialog");
  await page.screenshot({
    path: ".test-artifacts/student-delete-320.png",
    fullPage: true,
  });
  await accessibility(page);
  await noOverflow(page);
  await confirmation
    .getByRole("button", { name: "Batal", exact: true })
    .click();
  await expect(
    page.getByRole("cell", { name: `${name} Baru`, exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: `Hapus ${name} Baru`, exact: true })
    .click();
  await page
    .getByRole("button", { name: "Ya, Hapus Mahasiswa", exact: true })
    .click();
  await expect(
    page.getByRole("cell", { name: `${name} Baru`, exact: true }),
  ).toHaveCount(0);
  await search.fill(fixtures.student.email);
  await page
    .getByRole("button", {
      name: `Hapus ${fixtures.student.name}`,
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Ya, Hapus Mahasiswa", exact: true })
    .click();
  await expect(page.getByRole("alertdialog").getByRole("alert")).toContainText(
    "riwayat War",
  );
  await page.getByRole("button", { name: "Batal", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: fixtures.student.name, exact: true }),
  ).toBeVisible();
  await noOverflow(page);
});

test("session survives logo, home and login; explicit logout clears it", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "War KRS, beranda" }).click();
  await expect(page).toHaveURL(/\/games$/);
  await page.goto("/");
  await page.getByRole("link", { name: "Buka dashboard" }).last().click();
  await expect(page).toHaveURL(/\/games$/);
  await page.goto("/login");
  await expect(page).toHaveURL(/\/games$/);
  await page.getByRole("button", { name: "Keluar", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/games");
  await expect(page).toHaveURL(/\/login$/);
});
test("password visibility keeps values and does not submit", async ({ page }) => {
  await page.goto("/login");
  const input = page.getByLabel("Kata sandi", { exact: true });
  await input.fill("12345678");
  await page.getByRole("button", { name: "Tampilkan kata sandi", exact: true }).click();
  await expect(input).toHaveAttribute("type", "text");
  await expect(input).toHaveValue("12345678");
  await page.getByRole("button", { name: "Sembunyikan kata sandi", exact: true }).click();
  await expect(input).toHaveAttribute("type", "password");
  await expect(page).toHaveURL(/\/login$/);
});

test("password reset redirects without signing in or keeping its fragment", async ({ page }) => {
  await page.goto(`/reset-password#${fixtures.resetToken}`);
  await expect(page).toHaveURL(/\/reset-password$/);
  await page.getByLabel("Kata sandi (minimal 8 karakter)", { exact: true }).fill("12345678");
  await page.getByLabel("Ulangi kata sandi").fill("12345678");
  await page.getByRole("button", { name: "Tampilkan konfirmasi kata sandi" }).click();
  await expect(page.getByLabel("Ulangi kata sandi")).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Atur ulang kata sandi", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/games");
  await expect(page).toHaveURL(/\/login$/);
});
