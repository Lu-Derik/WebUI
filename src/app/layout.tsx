import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WalletUI - Powered by Arkreen",
  description: "Web3 智能合约交互工具 - MetaMask + ABI",
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
