import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MyOS - 个人数字操作系统",
    short_name: "MyOS",
    description: "私人万能网站与个人数字操作系统。",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "#FAFAFA",
    theme_color: "#2563EB",
    icons: [
      {
        src: "/icons/myos-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any"
      }
    ]
  };
}
