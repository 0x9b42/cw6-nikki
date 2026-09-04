const fs = require("fs");
const path = require("path");
const MarkdownIt = require("markdown-it");
const toc = require("./toc.json");
const site = require("./site.js");

const md = new MarkdownIt({ html: true, linkify: true, typographer: true });

const CONTENT_DIR = path.join(__dirname, "..", "_content", "cw6");
const ANNOTATION_DIR = path.join(__dirname, "..", "_annotations", "cw6");

// Beberapa key toc.json tidak match 1:1 dengan nama folder (huruf besar vs kecil).
const FOLDER_OVERRIDES = {
  INTRO: "intro",
  EPILOGUE: "epilogue",
  APPENDIX: "appendix",
};

function folderFor(key) {
  return FOLDER_OVERRIDES[key] || key.toLowerCase();
}

function pad3(n) {
  return String(n).padStart(3, "0");
}

function withPathPrefix(html) {
  const prefix = site.pathPrefix.endsWith("/")
    ? site.pathPrefix
    : site.pathPrefix + "/";
  if (prefix === "/") return html;
  return html.replace(/src="\/assets\//g, `src="${prefix}assets/`);
}

// Bangun pohon sub-bab dari toc.json. Tiap node dapat id anchor stabil
// (mis. "s8") yang dipakai read.njk sebagai id heading DAN dipakai sidebar /
// kartu bab di beranda sebagai target link "#s8". Id di-dedupe kalau dua
// heading mulai di paragraf yang sama (mis. CH08: bagian 2 dan sub a sama-sama
// §518) -> "s518" dan "s518-2".
function buildTree(subArray, level, idCounts) {
  if (!subArray || !subArray.length) return [];
  const nodes = [];
  for (const node of subArray) {
    const [label, data] = Object.entries(node)[0];
    const at = data.para_range[0];
    const end = data.para_range.length > 1 ? data.para_range[1] : at;
    idCounts[at] = (idCounts[at] || 0) + 1;
    nodes.push({
      label,
      title: data.title,
      at,
      end,
      rangeLabel: end > at ? `§${at}–${end}` : `§${at}`,
      id: idCounts[at] === 1 ? `s${at}` : `s${at}-${idCounts[at]}`,
      level,
      sub: buildTree(data.sub, level + 1, idCounts),
    });
  }
  return nodes;
}

function flattenTree(nodes, acc) {
  for (const n of nodes) {
    acc.push(n);
    flattenTree(n.sub, acc);
  }
  return acc;
}

function countTree(nodes) {
  let total = 0;
  for (const n of nodes) total += 1 + countTree(n.sub);
  return total;
}

function loadChapter(key, order) {
  const folder = folderFor(key);
  const dir = path.join(CONTENT_DIR, folder);
  const annDir = path.join(ANNOTATION_DIR, folder);

  const files = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((f) => /^p\d+\.html$/.test(f))
    : [];
  const numbers = files
    .map((f) => parseInt(f.match(/^p(\d+)\.html$/)[1], 10))
    .sort((a, b) => a - b);

  // Pohon sub-bab (untuk dropdown sidebar & kartu bab di beranda) plus
  // versi datar-nya untuk menyisipkan heading di tengah aliran paragraf.
  const idCounts = {};
  const tree = buildTree(toc[key].sub, 1, idCounts);
  const flat = flattenTree(tree, []);
  const headingsByParagraph = {};
  for (const h of flat) {
    (headingsByParagraph[h.at] = headingsByParagraph[h.at] || []).push(h);
  }

  let annotatedCount = 0;
  const items = [];
  const activePath = [];

  for (const num of numbers) {
    if (headingsByParagraph[num]) {
      for (const h of headingsByParagraph[num]) {
        items.push({
          type: "heading",
          level: h.level,
          label: h.label,
          title: h.title,
          id: h.id,
        });
        activePath[h.level - 1] = {
          level: h.level,
          label: h.label,
          title: h.title,
        };
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
      headingPath: activePath
        .filter(Boolean)
        .map((h) => ({ label: h.label, title: h.title })),
    });
  }

  return {
    id: folder,
    key,
    order,
    symbol: toc[key].symbol,
    shortLabel: toc[key].symbol || folder.toUpperCase(),
    title: toc[key].title,
    paragraphCount: numbers.length,
    annotatedCount,
    firstParagraph: numbers.length ? numbers[0] : null,
    lastParagraph: numbers.length ? numbers[numbers.length - 1] : null,
    subCount: countTree(tree),
    tree,
    items,
  };
}

let _cache = null;

module.exports = function () {
  if (_cache) return _cache;

  const keys = Object.keys(toc);
  const chapters = keys.map((key, i) => loadChapter(key, i));

  chapters.forEach((c, i) => {
    c.prev =
      i > 0
        ? {
            id: chapters[i - 1].id,
            title: chapters[i - 1].title,
            symbol: chapters[i - 1].symbol,
            shortLabel: chapters[i - 1].shortLabel,
          }
        : null;
    c.next =
      i < chapters.length - 1
        ? {
            id: chapters[i + 1].id,
            title: chapters[i + 1].title,
            symbol: chapters[i + 1].symbol,
            shortLabel: chapters[i + 1].shortLabel,
          }
        : null;
  });

  _cache = chapters;
  return _cache;
};
