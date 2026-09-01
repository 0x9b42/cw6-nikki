// Daftar datar SEMUA paragraf, lintas bab, sesuai urutan kemunculan di buku.
// Dipakai untuk halaman tersendiri tiap paragraf (/cw6/<bab>/pNNN/), lengkap
// dengan navigasi paragraf-sebelumnya/berikutnya yang menyeberangi batas bab.
const getChapters = require("./chapters.js");

let _cache = null;

module.exports = function () {
  if (_cache) return _cache;

  const chapters = getChapters();
  const flat = [];

  for (const c of chapters) {
    for (const item of c.items) {
      if (item.type !== "paragraph") continue;
      flat.push({
        num: item.num,
        slug: item.slug,
        html: item.html,
        annotationHtml: item.annotationHtml,
        headingPath: item.headingPath,
        chapterId: c.id,
        chapterTitle: c.title,
        chapterSymbol: c.symbol,
      });
    }
  }

  flat.forEach((p, i) => {
    p.prev = i > 0 ? { chapterId: flat[i - 1].chapterId, slug: flat[i - 1].slug, num: flat[i - 1].num } : null;
    p.next = i < flat.length - 1 ? { chapterId: flat[i + 1].chapterId, slug: flat[i + 1].slug, num: flat[i + 1].num } : null;
  });

  _cache = flat;
  return _cache;
};
