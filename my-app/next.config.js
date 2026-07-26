const path = require("path");
const { withAui } = require("@assistant-ui/next");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // SSR is required — API routes (/api/chat, /api/image) run server-side
  // and stream responses that cannot be statically exported.
  // Do NOT add `output: "export"` here.

  // outputFileTracingRoot MUST be set to the app directory (__dirname = my-app/).
  //
  // WHY THIS MATTERS ON AWS AMPLIFY:
  //   Next.js writes this value verbatim into .next/required-server-files.json.
  //   Amplify's SSR compute layer reads that file at deploy time to locate and
  //   package the Lambda's server modules.  If the value is an absolute path
  //   from a developer's local Windows machine (e.g. "C:\Users\...") the Linux
  //   Lambda cannot resolve it → the server fails to start → process.env is
  //   never populated → every API route returns "Missing CLOUDFLARE_API_TOKEN".
  //
  //   Setting it explicitly to __dirname ensures the build always emits the
  //   correct directory regardless of where or on what OS `next build` is run.
  outputFileTracingRoot: __dirname,

  // Point Turbopack at the monorepo root (one level above my-app/) so it
  // can resolve all project files without panicking.  Previously this was
  // set to __dirname (the my-app/ folder itself), which caused Turbopack
  // to treat every source path as "outside the project filesystem" and
  // crash with: Resource path "my-app/app/..." needs to be on project
  // filesystem "".
  //
  // NOTE: turbopack.root is a dev-server-only option. It does NOT affect
  // outputFileTracingRoot or the production Lambda bundle.
  turbopack: {
    root: path.resolve(__dirname, ".."),
  },
};

module.exports = withAui(nextConfig);
