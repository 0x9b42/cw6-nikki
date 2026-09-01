// Metadata global situs. Ubah sesuka hati — semua template menarik dari sini.
module.exports = {
  title: "Anotasi Psychological Types",
  shortTitle: "CW6 — Anotasi",
  tagline: "Pembacaan hermeneutik atas Psychological Types karya C. G. Jung, paragraf demi paragraf.",
  workTitle: "Psychological Types",
  workAuthor: "C. G. Jung",
  workNote: "The Collected Works of C. G. Jung, Volume 6",
  author: "Mob",
  // Diisi otomatis oleh workflow GitHub Actions lewat env PATH_PREFIX saat build untuk
  // GitHub Pages (repo project page). Biarkan "/" untuk pengembangan lokal atau custom domain.
  pathPrefix: process.env.PATH_PREFIX || "/",
};
