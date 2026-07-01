import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppProviders } from "./app-providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "SafeTrust ZK Demo",
  description: "Three-step ZK escrow privacy pipeline on Stellar",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
