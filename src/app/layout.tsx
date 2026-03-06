import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wallet UI",
  description: "MetaMask + ABI contract interaction",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
