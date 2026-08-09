import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MyOS",
  description: "个人数字操作系统"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
