"use client";

import { useEffect } from "react";

let cachedSiteName: string | null = null;

async function getSiteName(): Promise<string> {
  if (cachedSiteName) return cachedSiteName;
  try {
    const stored = sessionStorage.getItem("__site_name");
    if (stored) { cachedSiteName = stored; return stored; }
  } catch { /* ignore */ }
  try {
    const res = await fetch("/api/site-settings", { cache: "no-store" });
    if (!res.ok) throw new Error("failed");
    const data = await res.json();
    const name = data.site_name || document.title || "Store";
    cachedSiteName = name;
    try { sessionStorage.setItem("__site_name", name); } catch { /* ignore */ }
    return name;
  } catch {
    return document.title || "Store";
  }
}

export function useSiteTitle(pageTitle?: string) {
  useEffect(() => {
    let cancelled = false;
    getSiteName().then((siteName) => {
      if (cancelled) return;
      document.title = pageTitle ? `${pageTitle} | ${siteName}` : siteName;
    });
    return () => { cancelled = true; };
  }, [pageTitle]);
}

export function clearSiteTitleCache() {
  cachedSiteName = null;
  try { sessionStorage.removeItem("__site_name"); } catch { /* ignore */ }
}
