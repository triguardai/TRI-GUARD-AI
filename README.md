# TRI-GUARD-AI

Landing page prototype untuk TriGuard AI, solusi AI escrow untuk membantu mencegah penipuan transaksi online dengan proteksi dana, verifikasi rekening, blacklist scammer, dan simulasi pelacakan resi.

## Fitur Prototype

- Landing page AI escrow dan simulasi alur `/rekber`
- Cek blacklist rekening berbasis data demo
- Pusat laporan komunitas untuk melaporkan rekening penipu
- Upload bukti foto dan URL postingan publik
- Scraping otomatis OSINT dork lintas platform publik via Brave Search API atau Google CSE
- Endpoint `/api/scrape-evidence` untuk mengambil metadata, excerpt, dan kandidat rekening dari URL bukti
- Endpoint `/api/osint-search` untuk search, scrape, extraction, dan upsert kandidat ke Supabase
- Halaman admin `/admin/osint-candidates` untuk verify, reject, atau tandai duplicate
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
`verified_risky` hanya setelah admin menekan tombol verify di `/admin/osint-candidates`.

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

Halaman laporan dan blacklist masih prototype. Data laporan saat ini disimpan di `localStorage` browser untuk demo, bukan database production. Sebelum production perlu backend database, autentikasi admin, moderasi bukti, audit log, rate limit permanen, dan kebijakan privasi.
Nomor rekening, nama, nomor HP, dan bukti transaksi adalah data sensitif. Jangan otomatis memvonis rekening sebagai penipu tanpa review manual dan proses sanggah.
