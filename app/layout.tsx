import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "Yosvu 账户中心",
  description: "yosvu.cn 统一登录中心 — 一处登录，通行所有 Yosvu 项目",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      // Primary 登录中心：不需要 isSatellite，它是所有 Satellite 的认证源
      appearance={{ variables: { colorPrimary: "#6c8cff" } }}
    >
      <html lang="zh-CN">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
