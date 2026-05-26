# TRI-GUARD-AI

Landing page prototype untuk TriGuard AI, solusi AI escrow untuk membantu mencegah penipuan transaksi online dengan proteksi dana, verifikasi rekening, database rekening berisiko, dan simulasi pelacakan resi.

## Fitur Prototype

- Landing page AI escrow dan simulasi alur `/rekber`
- Cek database rekening berisiko berbasis data demo
- Pusat laporan komunitas untuk mengirim laporan kandidat rekening berisiko
- Upload bukti foto dan URL postingan publik
- Scraping otomatis OSINT dork lintas platform publik via Brave Search API atau Google CSE
- Endpoint `/api/scrape-evidence` untuk mengambil metadata, excerpt, dan kandidat rekening dari URL bukti
- Endpoint `/api/osint-search` untuk search, scrape, extraction, dan upsert kandidat ke Supabase
- Halaman admin `/admin/osint-candidates` untuk verifikasi, reject, atau tandai duplicate
- Endpoint `/api/chat` agar Gemini API key tidak terekspos di bundle frontend

## Stack

- React
- Vite
- Tailwind CSS
- Framer Motion
- Lucide React
- Vercel Serverless Functions
- Scrapling untuk scraping URL bukti publik
- Supabase untuk database kandidat OSINT dan audit moderasi

## Environment

Gunakan environment server-side berikut di Vercel atau `.env.local` saat memakai `vercel dev`.
Jangan memakai prefix `VITE_` untuk secret.

```bash
GEMINI_API_URL=
GEMINI_API_KEY=

SEARCH_PROVIDER=brave
BRAVE_SEARCH_API_KEY=
GOOGLE_SEARCH_API_KEY=
GOOGLE_SEARCH_CX=

SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

APP_BASE_URL=http://localhost:3000
INTERNAL_API_TOKEN=
ADMIN_OSINT_TOKEN=
```

`SEARCH_PROVIDER=brave` disarankan untuk project baru. Google CSE tetap tersedia
sebagai fallback jika project masih punya akses Custom Search JSON API.
`GOOGLE_SEARCH_CX` adalah Programmable Search Engine ID.

Jika search API key belum diisi, fitur OSINT tetap menampilkan preview query dork
yang bisa dibuka manual.
Mode default mencari di beberapa sumber publik seperti Facebook, Instagram, X/Twitter,
TikTok, Telegram publik, YouTube, marketplace, forum, blog, Kaskus, dan Reddit.

`SUPABASE_SERVICE_ROLE_KEY`, search API key, dan token internal harus server-side,
jangan memakai prefix `VITE_`.

## Supabase

Jalankan schema di Supabase SQL Editor:

```sql
-- lihat file lengkap
-- supabase/schema.sql
```

Status otomatis dari pipeline OSINT selalu `candidate`. Rekening baru masuk status
`verified_risky` hanya setelah admin menekan tombol verifikasi di `/admin/osint-candidates`.

## Menjalankan Project

```bash
npm install
npm run dev
```

Untuk mencoba serverless API lokal:

```bash
npm run dev:vercel
```

Di Windows, command global juga bisa dijalankan langsung dengan `vercel.cmd dev`.

## Build Production

```bash
npm run build
```

## Catatan Keamanan

Data laporan komunitas dan database rekening berisiko saat ini sudah terintegrasi dengan **Supabase** jika variabel lingkungan dikonfigurasi. Jika database belum siap, sistem secara otomatis menggunakan **localStorage** browser sebagai _fallback_ demo agar prototipe tetap berjalan.

Untuk mode prototype saat ini, laporan dengan bukti foto tidak bergantung pada storage upload server. Frontend mengirim manifest metadata file agar submit tetap lolos validasi backend, sementara preview gambar tetap disimpan di browser untuk kebutuhan demo admin review.

Sebelum benar-benar _live_ untuk publik, pastikan untuk:

- Mengaktifkan Row Level Security (RLS) di Supabase.
- Menggunakan autentikasi admin yang lebih ketat (bukan hanya token statis).
- Melakukan enkripsi pada data sensitif di tingkat database.
- Memiliki proses verifikasi manual yang ketat sebelum menetapkan rekening sebagai `verified_risky`.
