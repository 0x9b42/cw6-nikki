const getChapters = require("./chapters.js");

module.exports = function () {
  const chapters = getChapters();
  const list = [];

  for (const c of chapters) {
    for (const item of c.items) {
      if (item.type === "paragraph" && item.annotationHtml) {
        list.push({
          chapterId: c.id,
          chapterTitle: c.title,
          symbol: c.symbol,
          shortLabel: c.shortLabel,
          num: item.num,
          slug: item.slug,
          paragraphHtml: item.html,
          annotationHtml: item.annotationHtml,
        });
      }
    }
  }

  return list;
};
