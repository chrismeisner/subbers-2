/** @type {import('postcss').ProcessOptions} */
module.exports = {
  plugins: {
    "@tailwindcss/postcss": {},   // ← the new PostCSS plugin entry
    autoprefixer: {},             // you can keep autoprefixer if you like
  },
};
