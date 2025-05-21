// next.config.js
const path = require('path');

/** @type {import('next').NextConfig} */
module.exports = {
  // 1️⃣ Skip ESLint during production builds
  eslint: {
	ignoreDuringBuilds: true,
  },
  // 2️⃣ Skip TypeScript type-checking during production builds
  typescript: {
	ignoreBuildErrors: true,
  },
  // 3️⃣ Define `@/` to point at the project root for your imports
  webpack(config) {
	config.resolve.alias['@'] = path.resolve(__dirname);
	return config;
  },
};
