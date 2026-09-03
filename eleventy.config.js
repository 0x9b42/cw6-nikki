const site = require("./src/_data/site.js");

module.exports = function (eleventyConfig) {
  // Aset statis (CSS, JS, gambar hasil ekstraksi buku)
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });

  // Potong HTML jadi teks polos yang dipendekkan, untuk cuplikan di indeks anotasi.
  eleventyConfig.addFilter("excerpt", function (html, length = 180) {
    if (!html) return "";
    const text = html
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return text.length > length ? text.slice(0, length).trim() + "…" : text;
  });

  eleventyConfig.addFilter("pad3", (n) => String(n).padStart(3, "0"));
  eleventyConfig.addFilter("json", (value) => JSON.stringify(value));

  eleventyConfig.setServerOptions({ port: 8080 });

  return {
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
      output: "_site",
    },
    pathPrefix: site.pathPrefix,
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    templateFormats: ["njk", "md", "html"],
  };
};
