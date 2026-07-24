const path = require("node:path");
const { withAui } = require("@assistant-ui/next");

const nextConfig = {
  turbopack: {
    root: __dirname,
  },
  allowedDevOrigins: ["http://10.38.76.128"],
};

module.exports = withAui(nextConfig);