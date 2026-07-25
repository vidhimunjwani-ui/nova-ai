const path = require("path");
const { withAui } = require("@assistant-ui/next");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // SSR is required — API routes (/api/chat, /api/image) run server-side
  // and stream responses that cannot be statically exported.
  // Do NOT add `output: "export"` here.

  // Point Turbopack at the monorepo root (one level above my-app/) so it
  // can resolve all project files without panicking.  Previously this was
  // set to __dirname (the my-app/ folder itself), which caused Turbopack
  // to treat every source path as "outside the project filesystem" and
  // crash with: Resource path "my-app/app/..." needs to be on project
  // filesystem "".
  turbopack: {
    root: path.resolve(__dirname, ".."),
  },
};

module.exports = withAui(nextConfig);
