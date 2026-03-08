const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

try {
  const { withRorkMetro } = require("@rork-ai/toolkit-sdk/metro");
  module.exports = withRorkMetro(config);
} catch {
  module.exports = config;
}
