import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UNERD Official Shop",
  description: "UNERD Official Shop - Toko Online",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
