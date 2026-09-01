// Data file inti. Menggabungkan tiga sumber:
//   1. toc.json          -> struktur bab/sub-bab dan judul-judulnya
//   2. _content/cw6/**    -> teks asli tiap paragraf (hasil ekstraksi buku)
//   3. _annotations/cw6/** -> anotasi markdown milikmu (opsional, per paragraf)
//
// Hasilnya: array "chapters", masing-masing berisi urutan item (heading /
// paragraph) siap-render, sudah tercampur sesuai posisi aslinya di buku.

const fs = require("fs");
const path = require("path");
const MarkdownIt = require("markdown-it");
const toc = require("./toc.json");
const site = require("./site.js");

const md = new MarkdownIt({ html: false, linkify: true, typographer: true });

const CONTENT_DIR = path.join(__dirname, "..", "_content", "cw6");
const ANNOTATION_DIR = path.join(__dirname, "..", "_annotations", "cw6");

// Beberapa key toc.json tidak match 1:1 dengan nama folder (huruf besar vs kecil).
const FOLDER_OVERRIDES = { INTRO: "intro", EPILOGUE: "epilogue", APPENDIX: "appendix" };

function folderFor(key) {
  return FOLDER_OVERRIDES[key] || key.toLowerCase();
}

function pad3(n) {
  return String(n).padStart(3, "0");
}

// Perbaiki path gambar absolut ("/assets/...") agar tetap benar walau situs
// di-deploy di bawah sub-path (GitHub Pages project page).
function withPathPrefix(html) {
  const prefix = site.pathPrefix.endsWith("/") ? site.pathPrefix : site.pathPrefix + "/";
  if (prefix === "/") return html;
  return html.replace(/src="\/assets\//g, `src="${prefix}assets/`);
}

// Ratakan struktur "sub" (yang bisa bersarang beberapa level) jadi daftar datar
// heading, masing-masing menandai paragraf nomor berapa heading itu mulai muncul.
function flattenHeadings(subArray, level, acc) {
  if (!subArray || !subArray.length) return acc;
  for (const node of subArray) {
    const [label, data] = Object.entries(node)[0];
    acc.push({
      atParagraph: data.para_range[0],
      level,
      label,
      title: data.title,
    });
    flattenHeadings(data.sub, level + 1, acc);
  }
  return acc;
}

function loadChapter(key, order) {
  const folder = folderFor(key);
  const dir = path.join(CONTENT_DIR, folder);
  const annDir = path.join(ANNOTATION_DIR, folder);

  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /^p\d+\.html$/.test(f)) : [];
  const numbers = files
    .map((f) => parseInt(f.match(/^p(\d+)\.html$/)[1], 10))
    .sort((a, b) => a - b);

  const headings = flattenHeadings(toc[key].sub, 1, []);
  const headingsByParagraph = {};
  for (const h of headings) {
    (headingsByParagraph[h.atParagraph] = headingsByParagraph[h.atParagraph] || []).push(h);
  }

  let annotatedCount = 0;
  const items = [];
  // Jejak heading yang sedang aktif per level, dipakai sebagai breadcrumb
  // di halaman paragraf tersendiri (mis. "4. Nominalism and Realism > b. ...").
  const activePath = [];

  for (const num of numbers) {
    if (headingsByParagraph[num]) {
      for (const h of headingsByParagraph[num]) {
        items.push({ type: "heading", level: h.level, label: h.label, title: h.title });
        activePath[h.level - 1] = { level: h.level, label: h.label, title: h.title };
        activePath.length = h.level; // buang jejak level yang lebih dalam dari heading baru ini
      }
    }

    const raw = fs.readFileSync(path.join(dir, `p${pad3(num)}.html`), "utf8");
    const html = withPathPrefix(raw);

    let annotationHtml = null;
    const annPath = path.join(annDir, `p${pad3(num)}.md`);
    if (fs.existsSync(annPath)) {
      const rawAnnotation = fs.readFileSync(annPath, "utf8").trim();
      if (rawAnnotation) {
        annotationHtml = md.render(rawAnnotation);
        annotatedCount++;
      }
    }

    items.push({
      type: "paragraph",
      num,
      slug: `p${pad3(num)}`,
      html,
      annotationHtml,
      headingPath: activePath.filter(Boolean).map((h) => ({ label: h.label, title: h.title })),
    });
  }

  return {
    id: folder,
    key,
    order,
    symbol: toc[key].symbol,
    title: toc[key].title,
    paragraphCount: numbers.length,
    annotatedCount,
    firstParagraph: numbers.length ? numbers[0] : null,
    lastParagraph: numbers.length ? numbers[numbers.length - 1] : null,
    items,
  };
}

let _cache = null;

module.exports = function () {
  if (_cache) return _cache;

  const keys = Object.keys(toc);
  const chapters = keys.map((key, i) => loadChapter(key, i));

  chapters.forEach((c, i) => {
    c.prev = i > 0 ? { id: chapters[i - 1].id, title: chapters[i - 1].title, symbol: chapters[i - 1].symbol } : null;
    c.next = i < chapters.length - 1 ? { id: chapters[i + 1].id, title: chapters[i + 1].title, symbol: chapters[i + 1].symbol } : null;
  });

  _cache = chapters;
  return _cache;
};
