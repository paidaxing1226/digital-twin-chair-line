import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "数字孪生座椅产线",
  description: "面向座椅生产线的 3D 数字孪生看板"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
