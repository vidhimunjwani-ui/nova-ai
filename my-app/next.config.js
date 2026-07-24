const { withAui } = require("@assistant-ui/next");

const nextConfig = {
  allowedDevOrigins: ["http://10.38.76.128"],
};

module.exports = withAui(nextConfig);