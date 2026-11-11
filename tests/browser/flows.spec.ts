import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
const fixtures = JSON.parse(
  readFileSync(".test-artifacts/browser-fixtures.json", "utf8"),
);
async function login(page: Page, who = fixtures.student) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(who.email);
  await page.getByLabel("Kata sandi", { exact: true }).fill(fixtures.password);
  await page.getByRole("button", { name: "Masuk ke War KRS" }).click();
  await expect(page).toHaveURL(/\/games$/);
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
  await expect(
    page.getByRole("button", { name: "Gabung game" }),
  ).toBeDisabled();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Gabung game" }).click();
  await expect(
    page.getByText("Anda sudah bergabung dan menyetujui ketentuan game."),
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
    .getByLabel("Kata sandi (minimal 12 karakter)", { exact: true })
    .fill(fixtures.password);
  await page.getByLabel("Ulangi kata sandi").fill(fixtures.password);
  await page.getByRole("button", { name: "Aktifkan akun" }).click();
  await expect(page.getByRole("status")).toContainText("Kata sandi tersimpan");
  await accessibility(page);
  await login(page, fixtures.inactive);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/games$/);
});
for (const width of [320, 375, 768, 1440])
  test(`critical student journey at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 850 });
    await login(page);
    const f = fixtures.live.find((x: { width: number }) => x.width === width);
    await page.goto(`/games/${f.game.id}`);
    await noOverflow(page);
    await accessibility(page);
    await join(page);
    await rank(page);
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
    await page.getByRole("tab", { name: "Daftar paket" }).click();
    await page
      .getByRole("button", { name: "Lihat penerima paket" })
      .first()
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Perbarui daftar" }),
    ).toBeEnabled();
    await noOverflow(page);
    await accessibility(page);
    await page.keyboard.press("Escape");
    await page.getByRole("tab", { name: "Log aktivitas" }).click();
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
  await expect(page.getByText("Game selesai", { exact: true })).toBeVisible();
  await expect(page.getByText("Alokasi Anda diterima")).toBeVisible();
  await page.getByRole("tab", { name: "Utama", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Daftar paket" })).toBeFocused();
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
  await noOverflow(page);
  await accessibility(page);
  await page.getByLabel("Judul game").fill("Fiksi draf diperbarui");
  await page.getByRole("button", { name: "Simpan draf" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Draf tersimpan" }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Judul game")).toHaveValue(
    "Fiksi draf diperbarui",
  );
  await page.goto(`/admin/games/${fixtures.live[0].game.id}`);
  await expect(page.getByText("Teralokasi", { exact: true })).toBeVisible();
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
