const { withAui } = require("@assistant-ui/next");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // SSR is required — API routes (/api/chat, /api/image) run server-side
  // and stream responses that cannot be statically exported.
  // Do NOT add `output: "export"` here.

  // Suppress the multiple-lockfiles Turbopack workspace root warning.
  // This project lives in my-app/ inside the monorepo root.
  turbopack: {
    root: __dirname,
  },
};

module.exports = withAui(nextConfig);
