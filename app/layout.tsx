import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "张兴宇翻译器｜正在等你翻",
  description: "一个专门识别嘴硬、吃醋和偷偷翻脸的欠揍聊天机器。",
  openGraph: {
    title: "张兴宇翻译器",
    description: "正在等你翻",
    images: [{ url: "/og.png", width: 1731, height: 909 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "张兴宇翻译器",
    description: "正在等你翻",
    images: ["/og.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
