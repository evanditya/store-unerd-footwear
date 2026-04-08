import type { Metadata } from "next";
import "./globals.css";

const BACKEND = process.env.BACKEND_URL || "http://127.0.0.1:8000";

async function fetchSiteSettings(): Promise<{ name: string; description: string; favicon: string; favicon_v: string }> {
  try {
    const res = await fetch(`${BACKEND}/api/site-settings`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("fetch failed");
    const data = await res.json();
    return {
      name: data.site_name || "Store",
      description: data.description || "Toko Online",
      favicon: data.favicon || "",
      favicon_v: data.favicon_v || "",
    };
  } catch {
    return { name: "UNERD Official Shop", description: "UNERD Official Shop - Toko Online", favicon: "", favicon_v: "" };
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const { name, description, favicon, favicon_v } = await fetchSiteSettings();
  const faviconUrl = favicon ? `${favicon}${favicon_v ? `?v=${favicon_v}` : ""}` : "/favicon.ico";
  return {
    title: {
      template: `%s | ${name}`,
      default: name,
    },
    description,
    icons: {
      icon: faviconUrl,
      shortcut: faviconUrl,
      apple: faviconUrl,
    },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
