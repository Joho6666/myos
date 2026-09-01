import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.joho.myos",
  appName: "MyOS",
  // Release APK bundles the complete offline web app. Do not add `server.url`:
  // a remote URL would turn the app back into a network-dependent WebView.
  webDir: "apps/mobile/dist",
  android: {
    allowMixedContent: true,
    backgroundColor: "#0f172a"
  },
  plugins: {
    CapacitorSQLite: {
      androidIsEncryption: true
    }
  }
};

export default config;
