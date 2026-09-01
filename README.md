# Anotasi Psychological Types (CW 6)

Situs statis (Eleventy) untuk anotasi hermeneutik paragraf-demi-paragraf atas
_Psychological Types_ karya C. G. Jung.

## Struktur proyek

```
src/
  _content/cw6/<bab>/pNNN.html    # teks asli tiap paragraf (sudah ada, jangan diedit)
  _annotations/cw6/<bab>/pNNN.md  # ANOTASI KAMU — ini yang perlu kamu isi
  _data/
    toc.json       # struktur bab/sub-bab (sudah ada)
    site.js        # judul, tagline, nama penulis situs — edit sesuka hati
    chapters.js     # "otak" situs: menggabungkan toc + teks + anotasi
    annotatedIndex.js
    stats.js
  _includes/       # layout & partial Nunjucks
  assets/          # CSS, JS, gambar
  index.njk        # halaman beranda
  cw6.njk          # template baca per-bab, alur kontinu (di-paginate otomatis)
  paragraph.njk    # template halaman TERSENDIRI per paragraf (§n) — tempat anotasi tampil
  anotasi.njk      # indeks semua paragraf yang sudah dianotasi
  _data/paragraphs.js  # daftar datar semua paragraf lintas bab, dipakai paragraph.njk
```

## Menulis anotasi

Setiap paragraf dalam buku sudah punya nomor (§n), sesuai file
`src/_content/cw6/<bab>/pNNN.html`. Untuk menganotasi paragraf itu, buat file
markdown dengan nama **persis sama** tapi ekstensi `.md`, di folder
`src/_annotations/cw6/<bab>/`.

Contoh: mau menganotasi paragraf §34 di Bab I (`ch01`) →
buat `src/_annotations/cw6/ch01/p034.md`, isi dengan markdown biasa:

```markdown
Ini bacaanku atas paragraf ini...

- poin pertama
- poin kedua
```

Paragraf yang belum punya file `.md` (atau isinya kosong) akan tampil apa
adanya tanpa blok anotasi — tidak perlu ada entri "kosong".

Setiap paragraf punya dua tempat untuk dibaca:

- **Halaman bab** (`/cw6/<bab>/`) — alur baca kontinu tanpa anotasi tampil,
  supaya bacaan tidak terpotong-potong. Paragraf yang sudah dianotasi ditandai
  titik kecil di sebelah nomornya.
- **Halaman paragraf tersendiri** (`/cw6/<bab>/pNNN/`) — dibuka lewat klik
  nomor paragraf di halaman bab. Di sinilah anotasi (kalau ada) ditampilkan,
  lengkap dengan breadcrumb sub-bab dan navigasi ke paragraf sebelum/sesudahnya
  (menyeberangi batas bab secara otomatis).

Ada satu contoh sudah dibuatkan di `src/_annotations/cw6/intro/p000.md` —
hapus atau timpa isinya begitu kamu mulai menulis anotasi sungguhan.

Nomor paragraf berjajar 0–987, dan dipetakan ke sub-bab lewat `toc.json`
secara otomatis — kamu tidak perlu mengurus heading atau letak sub-bab
sendiri, itu semua dihitung saat build oleh `_data/chapters.js`.

## Menjalankan di lokal (Termux)

```bash
npm install
npm start          # eleventy --serve, live-reload di http://localhost:8080
```

Build statis biasa (tanpa server):

```bash
npm run build       # hasil ada di folder _site/
```

## Deploy ke GitHub Pages

1. Push repo ini ke GitHub.
2. Di GitHub: **Settings → Pages → Source**, pilih **GitHub Actions**.
3. Push ke branch `main` — workflow di `.github/workflows/deploy.yml` akan
   otomatis build dan deploy.

Workflow ini sudah menghitung sendiri apakah situsmu perlu path-prefix
(untuk repo project page seperti `username.github.io/cw6-nikki/`) atau tidak
(untuk repo user page `username.github.io`, atau kalau kamu pasang custom
domain lewat berkas `CNAME` — dalam kasus itu, kosongkan manual variabel
`PATH_PREFIX` di `deploy.yml` jadi `"/"`).

## Mengubah judul / tagline situs

Edit `src/_data/site.js` — semua template menarik teksnya dari sana, tidak
ada teks yang di-hardcode di template.

## Desain — "Lumen"

Desain situs ini mengikuti estetika **edisi kritis modern**: hangat, tenang, dan
dirancang untuk membaca lama.

### Sistem tipografi

- **Teks asli Jung** → _Newsreader_ (serif sastrawi), tinta hangat, ukuran optik
  responsif. Drop cap pada paragraf pembuka tiap bab menandai bab baru.
- **Anotasi & UI** → _Inter_ (sans modern), warna tinta teal `#1f4e5f` dengan
  blok latar teal muda — meniru catatan pena di margin buku fisik, supaya
  suara Jung dan suara kamu selalu bisa dibedakan sekilas pandang.
- **Nomor paragraf** → sans, kecil, di margin kiri (seperti buku ber-catatan-kaki).

### Palet warna

- **Terang** — kertas krem `#faf8f3`, tinta hangat `#211c16`, aksen burgundy
  `#8b3a2b` untuk tautan, teal marginalia untuk anotasi.
- **Gelap** — charcoal hangat `#161310`, tinta krem terang, aksen coral
  `#d9855f`, teal muda `#6fb5c2`. Tema dipersisten via `localStorage`.

### Fitur UX

- **Topbar fixed** dengan brand, progress bar baca (scroll-based), dan toggle
  tema terang/gelap (persisten, menghormati `prefers-color-scheme`).
- **Sidebar TOC** dengan highlight bab aktif otomatis berdasarkan URL.
- **Keyboard shortcuts** di halaman paragraf: `J`/`→` berikutnya, `K`/`←`
  sebelumnya, `T` ganti tema.
- **Indeks anotasi** dengan pencarian live (filter teks anotasi, nomor, bab).
- **Responsif penuh** — mobile menyembunyikan sidebar di balik hamburger menu
  dengan scrim overlay.
- **Aksesibilitas** — skip link, focus-visible, `prefers-reduced-motion`,
  semantic landmarks, print stylesheet.
