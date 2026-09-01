const getChapters = require("./chapters.js");

module.exports = function () {
  const chapters = getChapters();
  const totalParagraphs = chapters.reduce((sum, c) => sum + c.paragraphCount, 0);
  const totalAnnotated = chapters.reduce((sum, c) => sum + c.annotatedCount, 0);
  return { totalParagraphs, totalAnnotated };
};
