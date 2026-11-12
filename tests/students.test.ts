import { test, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import ExcelJS from "exceljs";
import JSZip from "jszip";
import { getDb, closeDb } from "../db/client";
import { user, account, accountTokens, session } from "../db/schema";
import { emailSchema, nimSchema } from "../lib/account-validation";
import { excelUpload } from "../lib/excel-upload";
import {
  parseStudentsExcel,
  studentTemplate,
  MAX_EXCEL_BYTES,
} from "../modules/accounts/excel";
import {
  createStudent,
  updateStudent,
  deleteStudent,
  importStudents,
  listStudents,
  issueToken,
  consumeToken,
} from "../modules/accounts/service";
import {
  POST as studentCreate,
  GET as studentRead,
} from "../app/api/admin/students/route";
import {
  PATCH as studentUpdate,
  DELETE as studentDelete,
} from "../app/api/admin/students/[studentId]/route";
import { POST as studentImport } from "../app/api/admin/students/import/route";
import { GET as templateGet } from "../app/api/admin/students/template/route";
import { POST as signIn } from "../app/api/auth/[...all]/route";
import { requireActor } from "../lib/authorization";
import { readAppUrl } from "../lib/config";
import { actor } from "./helpers";
import { gameFixture } from "./fixtures";
import { excelFixture } from "./excel-fixtures";
after(closeDb);
const fields = () => {
  const id = randomUUID().replaceAll("-", "");
  return {
    name: "Mahasiswa Fiksi",
    nim: `T${id}`,
    email: `student+${id}@example.invalid`,
  };
};
const password = "Fictional-account-test-2026!";
function login(email: string, pass = password) {
  return signIn(
    new Request(`${readAppUrl()}/api/auth/sign-in/email`, {
      method: "POST",
      headers: { Origin: readAppUrl(), "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: pass }),
    }),
  );
}

test("shared email normalization accepts common providers and subdomains without a domain whitelist", () => {
  for (const email of [
    "anas@apps.ipb.ac.id",
    "student.name@apps.ipb.ac.id",
    "student123@gmail.com",
    "student+testing@gmail.com",
    "user.name@outlook.com",
    "someone@subdomain.example.co.id",
    "first_last@unfamiliar.technology",
    "o'connor@campus.education",
    "a-b@sub-domain.example.id",
  ])
    assert.equal(emailSchema.parse(`  ${email.toUpperCase()}  `), email);
  for (const email of [
    "",
    "  ",
    "not-an-email",
    "student@",
    "@gmail.com",
    "student gmail.com",
    "student@@gmail.com",
    "a..b@gmail.com",
    ".a@gmail.com",
    "a.@gmail.com",
    "a@-domain.com",
    "a@domain-.com",
    "a@a..com",
    "a\nb@example.com",
    `${"a".repeat(65)}@example.com`,
    `${"a".repeat(64)}@${"b".repeat(190)}.com`,
  ])
    assert.equal(emailSchema.safeParse(email).success, false, email);
  assert.equal(nimSchema.parse("  00001234 "), "00001234");
  assert.equal(nimSchema.parse("g642600001"), "G642600001");
  for (const nim of ["", "NIM X", "=A1", "x/42", "-12", "x..12"])
    assert.equal(nimSchema.safeParse(nim).success, false);
});
test("template has exactly the required ordered columns and a text NIM column", async () => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(new Uint8Array(await studentTemplate()).buffer);
  assert.equal(workbook.worksheets.length, 1);
  const sheet = workbook.worksheets[0];
  assert.deepEqual((sheet.getRow(1).values as unknown[]).slice(1), [
    "no",
    "nama",
    "nim",
    "email",
  ]);
  assert.equal(sheet.getColumn(3).numFmt, "@");
  assert.equal(sheet.actualRowCount, 1);
});
test("Excel parses text, rich text, hyperlinks and zero masks; formulas and malformed rows get reasons", async () => {
  const w = new ExcelJS.Workbook();
  const s = w.addWorksheet("Mahasiswa");
  s.addRow([" NO ", " Nama ", "NIM", "Email"]);
  s.addRow([
    1,
    { richText: [{ text: "Mahasiswa " }, { text: "Fiksi" }] },
    "00001234",
    { text: " Anas@apps.ipb.ac.id ", hyperlink: "mailto:Anas@apps.ipb.ac.id" },
  ]);
  s.addRow([]);
  s.addRow([2, "Duplikat", "00001234", "STUDENT@GMAIL.COM"]);
  s.addRow([3, "Duplikat Email", "G642600003", "ANAS@APPS.IPB.AC.ID"]);
  s.addRow([4, "Salah", "bad nim", "student@@gmail.com"]);
  s.addRow([
    5,
    "Formula",
    { formula: "1+1", result: 2 },
    "formula@example.invalid",
  ]);
  s.addRow([6, "Angka", 12, "numeric@example.invalid"]);
  s.getCell("C8").numFmt = "000000";
  s.addRow([7, "Tanggal", new Date(), "date@example.invalid"]);
  const rows = await parseStudentsExcel(
    Buffer.from(await w.xlsx.writeBuffer()),
    "MAHASISWA.XLSX",
  );
  assert.deepEqual(
    rows.map((r) => r.status),
    [
      "valid",
      "duplicate",
      "duplicate",
      "invalid",
      "invalid",
      "valid",
      "invalid",
    ],
  );
  assert.equal(rows[0].nim, "00001234");
  assert.equal(rows[0].email, "anas@apps.ipb.ac.id");
  assert.equal(rows[0].row, 2);
  assert.match(rows[1].reason, /NIM duplikat/);
  assert.match(rows[2].reason, /Email duplikat/);
  assert.match(rows[3].reason, /NIM/);
  assert.match(rows[3].reason, /email/i);
  assert.match(rows[4].reason, /rumus/);
  assert.equal(rows[5].nim, "000012");
});
test("Excel rejects wrong headers, corrupt/macro files, oversized archives and record overflow", async () => {
  const valid = await excelFixture([
    [1, "Fiksi", "G001", "ok@example.invalid"],
  ]);
  for (const [buffer, name] of [
    [valid, "m.xlsm"],
    [Buffer.from("not an excel file"), "m.xlsx"],
    [Buffer.alloc(MAX_EXCEL_BYTES + 1), "m.xlsx"],
    [
      await excelFixture(
        [[1, "Fiksi", "G001", "ok@example.invalid"]],
        ["no", "nim", "nama", "email"],
      ),
      "m.xlsx",
    ],
    [await studentTemplate(), "m.xlsx"],
  ] as const)
    await assert.rejects(parseStudentsExcel(buffer, name), {
      code: "INVALID_FILE",
    });
  const macro = await JSZip.loadAsync(valid);
  macro.file("xl/vbaProject.bin", "fake macro");
  await assert.rejects(
    parseStudentsExcel(
      await macro.generateAsync({ type: "nodebuffer" }),
      "m.xlsx",
    ),
    /makro/,
  );
  const bomb = await JSZip.loadAsync(valid);
  bomb.file("extra.xml", "x".repeat(17 * 1024 * 1024));
  await assert.rejects(
    parseStudentsExcel(
      await bomb.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }),
      "m.xlsx",
    ),
    /terlalu besar/,
  );
  const many = await excelFixture(
    Array.from({ length: 1001 }, (_, i) => [
      i,
      "Fiksi",
      `N${i}`,
      `x${i}@example.invalid`,
    ]),
  );
  await assert.rejects(parseStudentsExcel(many, "m.xlsx"), /1.000/);
});
test("multipart bounds apply without Content-Length and leave the JSON-only API protections intact", async () => {
  const form = new FormData();
  form.append(
    "file",
    new File(
      [
        new Uint8Array(
          await excelFixture([[1, "Fiksi", "G001", "ok@example.invalid"]]),
        ),
      ],
      "mahasiswa.xlsx",
    ),
  );
  assert.equal(
    (
      await excelUpload(
        new Request("http://localhost/import", { method: "POST", body: form }),
      )
    ).name,
    "mahasiswa.xlsx",
  );
  await assert.rejects(
    excelUpload(
      new Request("http://localhost/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      }),
    ),
    { code: "INVALID_FILE" },
  );
  await assert.rejects(
    excelUpload(
      new Request("http://localhost/import", {
        method: "POST",
        headers: { "Content-Type": "multipart/form-data; boundary=x" },
        body: new Uint8Array(MAX_EXCEL_BYTES + 65537),
      }),
    ),
    { code: "INVALID_FILE" },
  );
});
test("Excel inserts valid rows inactive, reports existing and duplicate keys, is idempotent and concurrent-safe", async () => {
  const admin = await actor("ADMIN");
  const first = fields();
  const second = fields();
  await createStudent(admin, first);
  const workbook = await excelFixture([
    [1, "Ne pas modifier", first.nim, second.email],
    [2, "New", second.nim, first.email],
    [3, "New", `${second.nim}X`, second.email],
    [4, "Copy", `${second.nim}Y`, second.email],
    [5, "Missing", "", "bad email"],
    [6, "New two", `${second.nim}Z`, `${randomUUID()}@example.invalid`],
  ]);
  const result = await importStudents(admin, workbook, "m.xlsx");
  assert.deepEqual(
    result.rows.map((r) => r.status),
    ["existing", "existing", "duplicate", "duplicate", "invalid", "inserted"],
  );
  // File duplicates are deterministic even if the earlier row conflicts in DB.
  assert.deepEqual(result.summary, {
    total: 6,
    inserted: 1,
    existing: 2,
    duplicate: 2,
    invalid: 1,
  });
  const again = await importStudents(admin, workbook, "m.xlsx");
  assert.equal(again.summary.inserted, 0);
  const [original] = await getDb()
    .select()
    .from(user)
    .where(eq(user.email, first.email));
  assert.equal(original.name, first.name);
  const fresh = fields();
  const freshTwo = fields();
  const importRows = [
    [1, fresh.name, fresh.nim, fresh.email],
    [2, freshTwo.name, freshTwo.nim, freshTwo.email],
  ];
  const one = await excelFixture(importRows);
  const reverse = await excelFixture([...importRows].reverse());
  const runs = await Promise.all([
    importStudents(admin, one, "m.xlsx"),
    importStudents(admin, reverse, "m.xlsx"),
  ]);
  assert.deepEqual(runs.map((r) => r.rows[0].status).sort(), [
    "existing",
    "inserted",
  ]);
  assert.equal(
    runs.reduce((sum, r) => sum + r.summary.inserted, 0),
    2,
  );
  const [saved] = await getDb()
    .select()
    .from(user)
    .where(eq(user.email, fresh.email));
  assert.equal(saved.emailVerified, false);
  assert.equal(
    (await getDb().select().from(account).where(eq(account.userId, saved.id)))
      .length,
    0,
  );
  assert.equal(
    (
      await getDb()
        .select()
        .from(accountTokens)
        .where(eq(accountTokens.userId, saved.id))
    ).length,
    0,
  );
});
test("manual CRUD validates, preserves identity, blocks duplicate keys and retains legacy students", async () => {
  const admin = await actor("ADMIN");
  const value = fields();
  value.nim = `00${value.nim}`;
  const created = await createStudent(admin, value);
  assert.ok(created.id);
  const another = fields();
  const second = await createStudent(admin, another);
  await assert.rejects(
    createStudent(admin, { ...fields(), email: value.email.toUpperCase() }),
    { code: "STUDENT_CONFLICT" },
  );
  await assert.rejects(
    createStudent(admin, { ...fields(), nim: value.nim.toLowerCase() }),
    { code: "STUDENT_CONFLICT" },
  );
  await assert.rejects(
    updateStudent(admin, second.id, { ...another, email: value.email }),
    { code: "STUDENT_CONFLICT" },
  );
  await assert.rejects(
    updateStudent(admin, second.id, { ...another, nim: value.nim }),
    { code: "STUDENT_CONFLICT" },
  );
  await assert.rejects(createStudent(admin, { ...fields(), nim: "" }), {
    code: "INVALID_INPUT",
  });
  await updateStudent(admin, created.id, { ...value, name: "Nama Fiksi Baru" });
  assert.equal(
    (await listStudents(admin)).find((s) => s.id === created.id)?.name,
    "Nama Fiksi Baru",
  );
  // Deliberately simulate a pre-migration student, never silently backfill IDs.
  const legacy = randomUUID();
  await getDb()
    .insert(user)
    .values({
      id: legacy,
      name: "Fiksi lama",
      email: `${legacy}@example.invalid`,
    });
  assert.equal(
    (await listStudents(admin)).find((s) => s.id === legacy)?.nim,
    null,
  );
  await updateStudent(admin, legacy, {
    ...fields(),
    name: "Fiksi lama diperbaiki",
  });
  await deleteStudent(admin, created.id);
  assert.equal(
    (await getDb().select().from(user).where(eq(user.id, created.id))).length,
    0,
  );
});
test("admin CRUD cannot target administrators or run as students", async () => {
  const admin = await actor("ADMIN");
  const student = await actor();
  const value = fields();
  for (const action of [
    () => createStudent(student, value),
    () => updateStudent(student, student.id, value),
    () => deleteStudent(student, student.id),
    () => listStudents(student),
    () => importStudents(student, Buffer.from("x"), "m.xlsx"),
  ])
    await assert.rejects(action, { code: "FORBIDDEN" });
  await assert.rejects(updateStudent(admin, admin.id, value), {
    code: "NOT_FOUND",
  });
  await assert.rejects(deleteStudent(admin, admin.id), { code: "NOT_FOUND" });
});
test("email change revokes sessions, credentials and tokens, then requires activation at the new email", async () => {
  const admin = await actor("ADMIN");
  const value = fields();
  const created = await createStudent(admin, value);
  await consumeToken(
    await issueToken(created.id, "ACTIVATION"),
    password,
    "ACTIVATION",
  );
  const response = await login(`  ${value.email.toUpperCase()}  `);
  assert.equal(response.status, 200);
  const cookie = response.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  const headers = new Headers({ cookie });
  assert.equal((await requireActor(headers)).id, created.id);
  await updateStudent(admin, created.id, { ...value, name: "Nama baru" });
  assert.equal((await requireActor(headers)).id, created.id);
  const reset = await issueToken(created.id, "PASSWORD_RESET");
  const newEmail = `new+${randomUUID()}@example.invalid`;
  const updated = await updateStudent(admin, created.id, {
    ...value,
    email: newEmail,
  });
  assert.equal(updated.emailChanged, true);
  await assert.rejects(requireActor(headers), { code: "UNAUTHENTICATED" });
  assert.equal(
    (await getDb().select().from(session).where(eq(session.userId, created.id)))
      .length,
    0,
  );
  const [cred] = await getDb()
    .select()
    .from(account)
    .where(eq(account.userId, created.id));
  assert.equal(cred.password, null);
  await assert.rejects(consumeToken(reset, password, "PASSWORD_RESET"), {
    code: "INVALID_TOKEN",
  });
  await assert.rejects(issueToken(created.id, "ACTIVATION", value.email), {
    code: "ACCOUNT_CHANGED",
  });
  assert.ok((await login(newEmail)).status >= 400);
  await consumeToken(
    await issueToken(created.id, "ACTIVATION", newEmail),
    password + "new",
    "ACTIVATION",
  );
  assert.equal((await login(newEmail, password + "new")).status, 200);
  await deleteStudent(admin, created.id);
  assert.equal(
    (
      await getDb()
        .select()
        .from(accountTokens)
        .where(eq(accountTokens.userId, created.id))
    ).length,
    0,
  );
});
test("protected deletion retains whitelist, immutable submission, allocation and audit history", async () => {
  const { admin, students, id, packageIds } = await gameFixture({ count: 1 });
  const { submitRanking } = await import("../modules/allocation/service");
  await submitRanking(students[0], id, packageIds);
  const before = await getDb().execute(
    sql`SELECT (SELECT count(*) FROM war_submissions WHERE game_id=${id}) AS submissions,(SELECT count(*) FROM war_allocations WHERE game_id=${id}) AS allocations`,
  );
  await assert.rejects(deleteStudent(admin, students[0].id), {
    code: "STUDENT_PROTECTED",
  });
  const afterRows = await getDb().execute(
    sql`SELECT (SELECT count(*) FROM war_submissions WHERE game_id=${id}) AS submissions,(SELECT count(*) FROM war_allocations WHERE game_id=${id}) AS allocations`,
  );
  assert.deepEqual(afterRows.rows, before.rows);
});
test("student endpoints fail closed for anonymous and cross-origin requests before parsing files or IDs", async () => {
  const origin = readAppUrl();
  for (const action of [
    () => studentRead(new Request(`${origin}/api/admin/students`)),
    () => templateGet(new Request(`${origin}/api/admin/students/template`)),
    () =>
      studentCreate(
        new Request(`${origin}/api/admin/students`, {
          method: "POST",
          headers: { Origin: origin },
          body: "{}",
        }),
      ),
    () =>
      studentImport(
        new Request(`${origin}/api/admin/students/import`, {
          method: "POST",
          headers: { Origin: origin },
          body: "not multipart",
        }),
      ),
    () =>
      studentUpdate(
        new Request(`${origin}/api/admin/students/x`, {
          method: "PATCH",
          headers: { Origin: origin },
          body: "{}",
        }),
        { params: Promise.resolve({ studentId: "x" }) },
      ),
    () =>
      studentDelete(
        new Request(`${origin}/api/admin/students/x`, {
          method: "DELETE",
          headers: { Origin: origin },
        }),
        { params: Promise.resolve({ studentId: "x" }) },
      ),
  ])
    assert.equal((await action()).status, 401);
  for (const method of [studentCreate, studentImport])
    assert.equal(
      (
        await method(
          new Request(`${origin}/api/admin/students`, {
            method: "POST",
            headers: { Origin: "https://evil.invalid" },
          }),
        )
      ).status,
      403,
    );
});
