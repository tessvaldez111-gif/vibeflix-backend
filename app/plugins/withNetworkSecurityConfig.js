const fs = require('fs');
const path = require('path');
const { withAppBuildGradle, withAndroidManifest, AndroidConfig } = require('@expo/config-plugins');

// Plugin: add network_security_config.xml to android/app/src/main/res/xml/
function withNetworkSecurityConfig(config) {
  // Step 1: Modify AndroidManifest.xml to add usesCleartextTraffic
  config = withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(androidManifest);

    // Add usesCleartextTraffic attribute
    if (!mainApplication.$) mainApplication.$ = {};
    mainApplication.$['android:usesCleartextTraffic'] = 'true';

    return config;
  });

  // Step 2: Copy network_security_config.xml to android resources
  config = withAppBuildGradle(config, (config) => {
    // This is a workaround to copy the file during prebuild
    const platformProjectRoot = config.modRequest.platformProjectRoot;
    const resXmlDir = path.join(platformProjectRoot, 'app', 'src', 'main', 'res', 'xml');

    if (!fs.existsSync(resXmlDir)) {
      fs.mkdirSync(resXmlDir, { recursive: true });
    }

    const srcFile = path.resolve(__dirname, '..', 'network_security_config.xml');
    const destFile = path.join(resXmlDir, 'network_security_config.xml');

    if (fs.existsSync(srcFile)) {
      fs.copyFileSync(srcFile, destFile);
    }

    return config;
  });

  return config;
}

module.exports = withNetworkSecurityConfig;
