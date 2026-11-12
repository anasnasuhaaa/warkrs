# Panduan War KRS: Neon dan Vercel

Panduan ini menggunakan aplikasi, driver `pg`, dan migrasi Drizzle yang sudah ada.
File `.env.neon` di root adalah template lokal untuk diisi lalu diimpor ke Vercel.
Pembuatan panduan ini **belum menjalankan migrasi atau deployment ke Neon/Vercel**.
Karena `.env.neon` tidak ikut Git, pada clone lain Anda dapat menyalin `.env.example`
ke `.env.neon`, menghapus variabel `POSTGRES_*` untuk Docker, lalu mengisi sembilan
variabel aplikasi sesuai bagian 2.

## 1. Buat database Neon dan ambil dua URL

1. Buat project Neon. PostgreSQL 17 sesuai dengan setup lokal proyek ini.
2. Pilih region yang dekat dengan region Vercel Functions aplikasi.
3. Di **Connect**, pilih branch, database, dan role yang akan digunakan.
4. Aktifkan **Connection pooling**, lalu salin connection string lengkap ke
   `DATABASE_URL` dalam `.env.neon`.
5. Nonaktifkan toggle tersebut, lalu salin URL direct ke `DIRECT_DATABASE_URL`.
   Pastikan keduanya menuju branch dan database yang sama.

Hostname pooled biasanya memiliki akhiran endpoint `-pooler`; URL direct tidak.
Neon merekomendasikan pooled untuk aplikasi serverless dan direct untuk migrasi
serta dump/restore. Pertahankan parameter TLS dari URL yang diberikan Neon.
[Referensi Neon](https://neon.com/docs/connect/connection-pooling).

Gunakan URL PostgreSQL (`postgresql://...`), bukan URL dashboard atau endpoint HTTP.
Tidak perlu mengaktifkan Neon Auth: aplikasi ini sudah memakai Better Auth sendiri.
Jika memakai integrasi Vercel yang memberi `DATABASE_URL_UNPOOLED`, salin nilainya
ke **`DIRECT_DATABASE_URL`**; kode proyek membaca nama variabel yang terakhir ini.

## 2. Isi `.env.neon`

Ganti seluruh placeholder `GANTI_...` dan `REPLACE_...`.

| Variabel              | Isi                                                                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `APP_BASE_URL`        | Origin HTTPS aplikasi, misalnya `https://war-krs-anda.vercel.app`, tanpa path. Harus sama dengan alamat yang dibuka saat login. |
| `DATABASE_URL`        | URL pooled dari Neon.                                                                                                           |
| `DIRECT_DATABASE_URL` | URL direct dari Neon untuk migrasi dan bootstrap admin.                                                                         |
| `AUTH_SECRET`         | Secret acak minimal 32 karakter; gunakan secret khusus environment ini.                                                         |
| `EMAIL_MODE`          | `disabled` untuk setup awal; `resend` setelah email siap.                                                                       |
| `RESEND_API_KEY`      | Kosong saat email disabled; isi key Resend saat diaktifkan.                                                                     |
| `EMAIL_FROM`          | Alamat pengirim dari domain yang sudah diverifikasi di Resend.                                                                  |
| `REALTIME_MODE`       | Tetap `polling` untuk Vercel.                                                                                                   |
| `TZ`                  | Tetap `Asia/Jakarta`; waktu otoritatif tetap berasal dari server/database.                                                      |

Buat secret sendiri di terminal, lalu tempel hasilnya ke `AUTH_SECRET`:

```sh
node -e 'console.log(require("node:crypto").randomBytes(32).toString("hex"))'
```

Jangan mengganti secret pada setiap build. Pergantian secret dapat memutus sesi.
Jangan menambahkan prefix `NEXT_PUBLIC_` pada URL database, secret, atau API key.
`POSTGRES_*`, `BOOTSTRAP_*`, `PORT`, dan `HOSTNAME` tidak perlu dimasukkan ke Vercel.

`.env.neon` sudah tercakup `.gitignore`. Jangan menimpa `.env.local`: konfigurasi
PostgreSQL lokal Anda tetap dapat dipakai untuk development. Next.js tidak otomatis
membaca nama `.env.neon`; perintah berikut memuatnya secara eksplisit dengan Node 22.

## 3. Pilih jalur migrasi

**A** untuk database Neon baru tanpa membawa data lokal. **B** untuk membawa akun,
War, hasil, dan riwayat lokal. `db:migrate` membuat/memperbarui skema, bukan menyalin
data antar-database. Jangan menjalankan A terlebih dahulu pada target restore B.

Jalankan semua perintah dari root repository dengan Node.js 22 dan dependency terpasang:

```sh
npm ci
```

### A. Neon kosong: buat skema

Setelah kedua URL dalam `.env.neon` benar, jalankan:

```sh
env -u DATABASE_URL -u DIRECT_DATABASE_URL node --env-file=.env.neon ./node_modules/tsx/dist/cli.mjs scripts/migrate.ts
env -u DATABASE_URL -u DIRECT_DATABASE_URL node --env-file=.env.neon ./node_modules/tsx/dist/cli.mjs scripts/db-check.ts
```

Lanjutkan hanya jika migrasi menampilkan `Versioned migrations applied successfully.`
dan pemeriksaan koneksi menampilkan `PostgreSQL connection: OK`.
Perintah pertama menggunakan URL direct; kedua menggunakan URL pooled.
`env -u` menghapus override URL dari shell untuk proses tersebut, sehingga URL Neon
yang dipakai berasal dari file ini. `.env.local` tidak ditimpa.

Semua migrasi versioned diterapkan sesuai jurnal, termasuk `0007_student_nim`.
Tidak perlu menjalankan `db:generate`, `drizzle-kit push`, atau menempelkan SQL satu
per satu di Neon SQL Editor. Build Vercel sendiri tidak menjalankan migrasi.

### B. Bawa data PostgreSQL lokal ke Neon

Gunakan **database target baru dan kosong**. Lakukan saat tidak ada War berlangsung
dan hentikan penulisan ke database lama selama pemindahan sampai cutover selesai.
Siapkan `pg_dump` dan `pg_restore` yang kompatibel; `pg_dump` minimal setara versi
server sumber, dan pilih versi server Neon yang sama atau lebih baru.

Contoh berikut membuat full dump di direktori sementara di luar repository, lalu
merestore schema dan data sekaligus melalui URL direct. URL sumber dimasukkan
melalui prompt agar tidak menjadi perintah berisi password di shell history.

```sh
(
  set -e
  umask 077
  printf 'URL PostgreSQL lokal yang akan disalin: '
  read -r -s WAR_LOCAL_DATABASE_URL
  printf '\n'
  WAR_BACKUP_FILE="$(mktemp "${TMPDIR:-/tmp}/war-krs-neon.XXXXXX")"
  export WAR_BACKUP_FILE

  pg_dump --dbname="$WAR_LOCAL_DATABASE_URL" --format=custom --no-owner --no-acl --file="$WAR_BACKUP_FILE"
  unset WAR_LOCAL_DATABASE_URL
  printf 'Backup tersimpan di: %s\n' "$WAR_BACKUP_FILE"

  env -u DATABASE_URL -u DIRECT_DATABASE_URL node --env-file=.env.neon --input-type=module - <<'NODE'
import { spawnSync } from 'node:child_process';
const result = spawnSync('pg_restore', [
  '--dbname', process.env.DIRECT_DATABASE_URL,
  '--no-owner', '--no-acl', '--exit-on-error', '--single-transaction',
  process.env.WAR_BACKUP_FILE,
], { stdio: 'inherit' });
if (result.error) console.error('pg_restore tidak dapat dijalankan.');
process.exit(result.status ?? 1);
NODE
)
```

Simpan backup tersebut di penyimpanan privat yang persisten bila akan dipertahankan;
direktori sementara dapat dibersihkan sistem. Full dump memuat data akun yang sensitif.
Jangan gunakan `--data-only` atau mengecualikan schema `drizzle`: fungsi, trigger,
constraints, dan jurnal migrasi proyek harus ikut terbawa. Jangan memakai `--clean`
untuk menimpa database yang sudah berisi hasil War. Jika restore gagal, periksa
penyebabnya sebelum mengulang; jangan menghapus data target secara otomatis.
[Referensi dump/restore Neon](https://neon.com/docs/import/migrate-from-postgres).

Setelah restore berhasil, jalankan kedua perintah pada A untuk menerapkan migrasi
yang belum ada dan memeriksa koneksi. Bandingkan jumlah mahasiswa, War, submission,
alokasi, serta riwayat pada sumber dan target. Full restore membawa admin yang sudah
ada; Anda tidak perlu membuat admin pengganti. Dengan secret baru, login ulang.
Jangan membuka kembali penulisan di aplikasi lama setelah beralih ke Neon.

## 4. Buat admin hanya jika database belum punya admin

Untuk jalur A, jalankan bootstrap satu kali. Isikan akun admin Anda melalui prompt;
password minimal 16 karakter. Perintah ini tidak mengirim email.

```sh
(
  printf 'Nama admin: '
  read -r BOOTSTRAP_NAME
  printf 'Email admin: '
  read -r BOOTSTRAP_EMAIL
  printf 'Password admin (minimal 16 karakter): '
  read -r -s BOOTSTRAP_PASSWORD
  printf '\n'
  export BOOTSTRAP_NAME BOOTSTRAP_EMAIL BOOTSTRAP_PASSWORD
  env -u DATABASE_URL -u DIRECT_DATABASE_URL node --env-file=.env.neon ./node_modules/tsx/dist/cli.mjs scripts/bootstrap-admin.ts
)
```

Variabel bootstrap hanya berlaku di subshell ini. Script menolak membuat admin
kedua; tidak menimpa admin yang sudah ada. Jangan menyimpan password bootstrap
di source code atau environment Vercel.

## 5. Masukkan environment ke Vercel

1. Pada project Vercel yang memakai repository ini, buka **Settings → Environment Variables**.
2. Gunakan **Import .env**, pilih `.env.neon`, atau tempel isinya pada kolom Key
   untuk penambahan bulk. Periksa nilai hasil parsing sebelum menyimpan.
   [Panduan impor environment Vercel](https://vercel.com/docs/environment-variables#add-variables-in-bulk).
3. Pilih environment yang sesuai. Gunakan branch/database dan secret terpisah
   untuk Preview; jangan arahkan Preview yang menjalankan mutasi ke database utama.
4. Set variabel kredensial sebagai **Secret** bila opsi tersebut tersedia. Isi value
   mentah tanpa menambahkan tanda kutip jika menginput setiap variabel secara manual.
5. Pastikan `APP_BASE_URL` sama dengan origin HTTPS pada **Domains** untuk environment
   tersebut. `https://alamat.vercel.app` dan domain kustom adalah origin berbeda;
   gunakan domain kanonis yang sama saat membuka aplikasi.

Gunakan preset **Next.js**, Node.js **22.x**, install `npm ci`, build `npm run build`,
dan biarkan pengaturan output Next.js standar Vercel. Jangan menjadikan `npm start`
sebagai Build Command. Tidak perlu mengubah driver database atau menambah service.

Setelah konfigurasi dan migrasi siap, lakukan deployment/redeploy sendiri dari
Vercel. Perubahan environment baru berlaku pada deployment baru.
[Referensi Vercel](https://vercel.com/docs/environment-variables/managing-environment-variables).
Kode perubahan sebelumnya juga harus tersedia pada sumber yang Anda deploy;
commit lokal belum otomatis tersedia di GitHub/Vercel. Panduan ini tidak melakukan push.

## 6. Aktifkan email dan periksa aplikasi

Untuk aktivasi mahasiswa dan pemulihan password, verifikasi domain pengirim di
Resend, lalu isi `RESEND_API_KEY`, sesuaikan `EMAIL_FROM`, dan ubah `EMAIL_MODE=resend`.
Gunakan pengirim dari domain Anda yang terverifikasi, bukan alamat Gmail atau
`@apps.ipb.ac.id` kecuali Anda mengelola dan memverifikasi domain tersebut.
[Referensi domain Resend](https://resend.com/docs/dashboard/domains/introduction).
Perbarui environment Vercel dan redeploy setelah perubahan ini.

Sesudah deployment, periksa:

- `/api/health` mengembalikan status `ok` dan `/api/ready` mengembalikan `ready`.
  Readiness hanya memeriksa koneksi database, bukan kelengkapan skema.
- Login admin, unduh template Excel, lalu tambah/impor mahasiswa uji yang diizinkan.
- Kirim aktivasi secara terpisah; periksa tautan mengarah ke domain Vercel yang benar.
- Buat War simulasi terpisah untuk memeriksa join, ranking, hasil, dan polling.
  Jangan menjalankan test fixture/load suite terhadap database ini.

Jika muncul `Asal permintaan tidak diizinkan`, periksa `APP_BASE_URL` dan domain yang
dibuka. Jika muncul galat tabel/kolom belum ada, periksa migrasi dan apakah kedua URL
menuju database/branch yang sama. Jika email dinonaktifkan, periksa `EMAIL_MODE`;
mengisi API key saja belum mengaktifkan pengiriman. Jika perubahan env belum terlihat,
pastikan scope environment benar dan sudah ada deployment baru.
