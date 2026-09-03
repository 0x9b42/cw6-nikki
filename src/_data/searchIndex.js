const getParagraphs = require("./paragraphs.js");
const site = require("./site.js");

let cache = null;

module.exports = function () {
  if (cache) return cache;

  const paragraphs = getParagraphs();
  const prefix =
    site.pathPrefix === "/" ? "" : site.pathPrefix.replace(/\/$/, "");

  cache = paragraphs.map((p) => ({
    n: p.num,
    u: `${prefix}/${p.chapterId}/${p.slug}/`,
    c: p.chapterTitle,
    s: p.chapterShortLabel,
    a: Boolean(p.annotationHtml),
    t: p.html
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 320),
    // cuplikan isi anotasi ikut ditelusuri, bukan cuma teks asli —
    // supaya pencarian global bisa nemuin paragraf lewat kata-kata di anotasimu juga.
    an: p.annotationHtml
      ? p.annotationHtml
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 200)
      : "",
    h: p.headingPath.map((x) => `${x.label}. ${x.title}`).join(" › "),
  }));

  return cache;
};
