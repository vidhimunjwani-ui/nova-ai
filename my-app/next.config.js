const path = require("path");
const { withAui } = require("@assistant-ui/next");

const nextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname),
  allowedDevOrigins: ["http://10.38.76.128"],
};

module.exports = withAui(nextConfig);