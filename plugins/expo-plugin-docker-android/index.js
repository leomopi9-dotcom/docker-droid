const { withAndroidManifest, withGradleProperties, withDangerousMod } = require('@expo/config-plugins');

const PERMISSIONS = [
  'android.permission.FOREGROUND_SERVICE',
  'android.permission.FOREGROUND_SERVICE_DATA_SYNC',
  'android.permission.MANAGE_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE',
  'android.permission.RECEIVE_BOOT_COMPLETED',
  'android.permission.INTERNET',
  'android.permission.ACCESS_NETWORK_STATE',
  'android.permission.ACCESS_WIFI_STATE',
  'android.permission.SYSTEM_ALERT_WINDOW',
  'android.permission.VIBRATE',
  'android.permission.WAKE_LOCK',
];

function ensurePermission(manifest, name) {
  manifest.manifest['uses-permission'] = manifest.manifest['uses-permission'] || [];
  const perms = manifest.manifest['uses-permission'];
  const exists = perms.some(p => p.$['android:name'] === name);
  if (!exists) {
    perms.push({ $: { 'android:name': name } });
  }
}

function ensureMetaData(application, name, value) {
  application['meta-data'] = application['meta-data'] || [];
  const exists = application['meta-data'].some(m => m.$['android:name'] === name);
  if (!exists) application['meta-data'].push({ $: { 'android:name': name, 'android:value': value } });
}

function ensureService(application) {
  application.service = application.service || [];
  const exists = (application.service || []).some(s => s.$ && s.$['android:name'] === '.qemu.QemuForegroundService');
  if (!exists) {
    application.service.push({
      $: {
        'android:name': '.qemu.QemuForegroundService',
        'android:enabled': 'true',
        'android:exported': 'false',
        'android:foregroundServiceType': 'dataSync',
      },
    });
  }
}

const withDockerAndroidManifest = config => {
  return withAndroidManifest(config, config => {
    // Add permissions
    PERMISSIONS.forEach(p => ensurePermission(config.modResults, p));

    // Ensure application exists
    config.modResults.manifest.application = config.modResults.manifest.application || [{}];
    const application = Array.isArray(config.modResults.manifest.application)
      ? config.modResults.manifest.application[0]
      : config.modResults.manifest.application;

    // meta-data to control auto-updates (match prebuild expectations)
    ensureMetaData(application, 'expo.modules.updates.ENABLED', 'false');
    ensureMetaData(application, 'expo.modules.updates.EXPO_UPDATES_CHECK_ON_LAUNCH', 'ALWAYS');
    ensureMetaData(application, 'expo.modules.updates.EXPO_UPDATES_LAUNCH_WAIT_MS', '0');

    // ensure qemu foreground service is present (additive)
    ensureService(application);

    return config;
  });
};

const withDockerGradleProps = (config, props = {}) => {
  const gradleProps = [
    { key: 'android.minSdkVersion', value: String(props.minSdkVersion ?? 24) },
    { key: 'android.compileSdkVersion', value: String(props.compileSdkVersion ?? 34) },
    { key: 'android.targetSdkVersion', value: String(props.targetSdkVersion ?? 34) },
    { key: 'android.buildToolsVersion', value: String(props.buildToolsVersion ?? '34.0.0') },
    { key: 'android.enableMinifyInReleaseBuilds', value: String(props.enableMinifyInReleaseBuilds ?? false) },
  ];

  return withGradleProperties(config, config => {
    config.modResults = config.modResults || [];
    gradleProps.forEach(({ key, value }) => {
      const existing = config.modResults.find(p => p.key === key);
      if (!existing) {
        config.modResults.push({ key, value });
      }
    });
    return config;
  });
};

const withDockerProguard = (config) => {
  return withDangerousMod(config, ["android", async (config) => {
    const fs = require('fs');
    const path = require('path');
    const proguardPath = path.join(config.modRequest.projectRoot, 'android', 'app', 'proguard-rules.pro');

    try {
      let contents = '';
      if (fs.existsSync(proguardPath)) {
        contents = fs.readFileSync(proguardPath, 'utf8');
      }

      const markerBegin = '# @generated begin expo-plugin-docker-android (DO NOT MODIFY)';
      const markerEnd = '# @generated end expo-plugin-docker-android';
      if (!contents.includes(markerBegin)) {
        const addition = `\n${markerBegin}\n-keep class com.dockerandroid.** { *; }\n${markerEnd}\n`;
        fs.writeFileSync(proguardPath, contents + addition);
      }
    } catch (e) {
      // ignore; do not break build
      console.warn('expo-plugin-docker-android: failed to apply proguard changes', e);
    }

    return config;
  }]);
};

function plugin(config, props = {}) {
  config = withDockerAndroidManifest(config);
  config = withDockerGradleProps(config, props);
  config = withDockerProguard(config);
  return config;
}

module.exports = plugin;
module.exports.plugin = plugin;
module.exports.default = plugin;
