const fs = require("node:fs");
const path = require("node:path");

/**
 * Builds on app.json. Android push notifications need Firebase's
 * `google-services.json`: from the EAS file variable GOOGLE_SERVICES_JSON on
 * EAS Build, or a local `./google-services.json`. Without one the app still
 * builds; pushes just won't reach Android phones.
 */
module.exports = ({ config }) => {
  const googleServicesFile =
    process.env.GOOGLE_SERVICES_JSON ??
    (fs.existsSync(path.join(__dirname, "google-services.json")) ? "./google-services.json" : undefined);

  return {
    ...config,
    android: {
      ...config.android,
      ...(googleServicesFile && { googleServicesFile }),
    },
  };
};
