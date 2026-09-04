const getChapters = require("./chapters.js");

// Cuplikan teks paragraf (HTML dibuang) untuk mengenali paragraf di daftar.
function plainExcerpt(html, length) {
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > length ? text.slice(0, length).trim() + "…" : text;
}

// Halaman /catatan/ cukup berupa daftar paragraf yang sudah dianotasi,
// dikelompokkan per bab. Isi catatannya sendiri TIDAK ikut dirender di
// sini — dibaca di halaman paragraf masing-masing.
module.exports = function () {
  const chapters = getChapters();
  const groups = [];

  for (const c of chapters) {
    const entries = [];
    for (const item of c.items) {
      if (item.type === "paragraph" && item.annotationHtml) {
        entries.push({
          num: item.num,
          slug: item.slug,
          excerpt: plainExcerpt(item.html, 140),
        });
      }
    }
    if (entries.length) {
      groups.push({
        chapterId: c.id,
        chapterTitle: c.title,
        shortLabel: c.shortLabel,
        count: entries.length,
        entries,
      });
    }
  }

  return groups;
};
