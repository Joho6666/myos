import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.joho.myos",
  appName: "MyOS",
  webDir: "public",
  server: {
    // 默认可指定云端部署地址（例如 https://myos.vercel.app）或局域网 IP
    // 如果设置了环境变量 CAPACITOR_SERVER_URL 则优先使用
    url: process.env.CAPACITOR_SERVER_URL || "http://192.168.1.8:3010",
    cleartext: true
  },
  android: {
    allowMixedContent: true,
    backgroundColor: "#0f172a"
  }
};

export default config;
