"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import ProductCard from "@/components/ProductCard";
import SkeletonCard from "@/components/SkeletonCard";
import ProductDetail from "@/components/ProductDetail";
import Navbar from "@/components/Navbar";
import { useSiteTitle } from "@/hooks/useSiteTitle";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Variant {
  variant_type: string;
  variant_name: string;
  price: number | null;
  price_modifier: number;
  stock: number;
  is_available: boolean;
}

interface Product {
  name: string;
  slug: string;
  price: number;
  original_price: number | null;
  category: string;
  description: string;
  sold_count: number;
  stock: number;
  rating: number;
  primary_image: string;
  images: string[];
  variants: Variant[];
}

interface BannerItem {
  id: string;
  image_url: string;
  title: string;
  link: string;
  display_order: number;
  is_active: boolean;
}

interface BrandColors { primary: string; accent: string; }

interface Seller {
  username: string;
  seller_name: string;
  profile_picture: string | null;
  logo: string | null;
  banner: string | null;
  font: string | null;
  brand_colors: BrandColors | string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatPrice(price: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

function formatSoldCount(count: number): string {
  if (count >= 1000) return `${Math.floor(count / 1000)}RB+ terjual`;
  return `${count} terjual`;
}

function mapProducts(raw: Record<string, unknown>[]): Product[] {
  return raw.map((p) => ({
    ...(p as Product),
    images: Array.isArray(p.images)
      ? p.images.map((img: unknown) =>
          typeof img === "string" ? img : (img as Record<string, string>).image_url || ""
        )
      : [],
  }));
}

// ── BannerSlider ──────────────────────────────────────────────────────────────

function BannerSlider({
  banners,
  legacyBanner,
  legacyAlt,
}: {
  banners: BannerItem[];
  legacyBanner: string | null;
  legacyAlt: string;
}) {
  const slides = useMemo(() => {
    if (banners.length > 0) return banners;
    if (legacyBanner)
      return [{ id: "legacy", image_url: legacyBanner, title: "", link: "", display_order: 0, is_active: true }];
    return [];
  }, [banners, legacyBanner]);

  const [active, setActive] = useState(0);
  const prev = useCallback(() => setActive((i) => (i - 1 + slides.length) % slides.length), [slides.length]);
  const next = useCallback(() => setActive((i) => (i + 1) % slides.length), [slides.length]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const id = setInterval(next, 5000);
    return () => clearInterval(id);
  }, [slides.length, next]);

  if (slides.length === 0) return null;

  const slide = slides[active];
  const inner = (
    <div className="relative w-full overflow-hidden bg-gray-100" style={{ maxHeight: 256 }}>
      {slides.map((s, i) => (
        <img
          key={s.id}
          src={s.image_url}
          alt={s.title || legacyAlt}
          className="w-full object-cover absolute inset-0 transition-opacity duration-700"
          style={{ maxHeight: 256, height: 256, opacity: i === active ? 1 : 0, pointerEvents: i === active ? "auto" : "none" }}
          loading={i === 0 ? "eager" : "lazy"}
          decoding="async"
          data-testid={i === 0 ? "img-store-banner" : `img-store-banner-${i}`}
        />
      ))}
      <div style={{ height: 256 }} />
      {slide.title && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-6 py-4">
          <p className="text-white font-semibold text-lg drop-shadow">{slide.title}</p>
        </div>
      )}
      {slides.length > 1 && (
        <>
          <button onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full w-9 h-9 flex items-center justify-center transition" aria-label="Sebelumnya" data-testid="button-banner-prev">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full w-9 h-9 flex items-center justify-center transition" aria-label="Berikutnya" data-testid="button-banner-next">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {slides.map((_, i) => (
              <button key={i} onClick={() => setActive(i)} className={`rounded-full transition-all ${i === active ? "w-5 h-2 bg-white" : "w-2 h-2 bg-white/50"}`} aria-label={`Slide ${i + 1}`} data-testid={`button-banner-dot-${i}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );

  return slide.link ? <a href={slide.link} target="_blank" rel="noopener noreferrer">{inner}</a> : inner;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;
const SKELETON_COUNT = 10;
const DEBOUNCE_MS = 300;
const SENTINEL_MARGIN = "300px";

// ── StorePage ─────────────────────────────────────────────────────────────────

export default function StorePage() {
  useSiteTitle();

  // Seller / branding
  const [seller, setSeller] = useState<Seller>({
    username: "",
    seller_name: "Store",
    profile_picture: null,
    logo: null,
    banner: null,
    font: null,
    brand_colors: { primary: "#111827", accent: "#ef4444" },
  });

  // UI
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [user, setUser] = useState<{ role: string } | null>(null);
  const [toast, setToast] = useState("");
  const [banners, setBanners] = useState<BannerItem[]>([]);

  // Categories (fetched once, independent of search/pagination)
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Search: raw (shown in navbar) vs debounced (used for API calls)
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Products + infinite scroll state
  const [products, setProducts] = useState<Product[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Sentinel div ref for Intersection Observer
  const sentinelRef = useRef<HTMLDivElement>(null);

  // ── Brand colors ────────────────────────────────────────────────────────────

  const brandColors = useMemo((): BrandColors => {
    const bc = seller.brand_colors;
    if (bc && !Array.isArray(bc) && typeof bc === "object") {
      return { primary: bc.primary || "#111827", accent: bc.accent || "#ef4444" };
    }
    return { primary: "#111827", accent: "#ef4444" };
  }, [seller.brand_colors]);

  // Apply CSS variables + Google Font
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--color-primary", brandColors.primary);
    root.style.setProperty("--color-accent", brandColors.accent);
    const font = seller.font || "Inter";
    root.style.setProperty("--font-store", `'${font}', sans-serif`);
    document.body.style.fontFamily = `'${font}', sans-serif`;
    const existingLink = document.getElementById("google-font-store");
    const link = (existingLink || document.createElement("link")) as HTMLLinkElement;
    link.id = "google-font-store";
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${font.replace(/ /g, "+")}:wght@400;500;600;700&display=swap`;
    if (!existingLink) document.head.appendChild(link);
  }, [brandColors, seller.font]);

  // ── One-time fetches ────────────────────────────────────────────────────────

  useEffect(() => {
    // All categories (unaffected by search/pagination)
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => setCategories(data.categories || []))
      .catch(() => {});

    // Banners
    fetch("/api/banners")
      .then((r) => r.json())
      .then((data) => setBanners(data.banners || []))
      .catch(() => {});

    // Auth + cart count
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
          fetch("/api/cart")
            .then((r) => r.json())
            .then((cd) => {
              const items = cd.items || [];
              setCartCount(items.reduce((s: number, i: { quantity: number }) => s + i.quantity, 0));
            });
        }
      })
      .catch(() => {});
  }, []);

  // ── Debounce search input ───────────────────────────────────────────────────

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ── Fetch page 1 when search or category changes ────────────────────────────

  useEffect(() => {
    let cancelled = false;
    setLoadingInitial(true);
    setProducts([]);
    setCurrentPage(1);
    setHasMore(false);

    const params = new URLSearchParams({ page: "1", limit: String(PAGE_SIZE) });
    if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
    if (activeCategory) params.set("category", activeCategory);

    fetch(`/api/products?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setProducts(mapProducts(data.products || []));
        setCurrentPage(data.page || 1);
        setHasMore((data.page || 1) < (data.total_pages || 1));
        if (data.seller) setSeller(data.seller);
        setLoadingInitial(false);
      })
      .catch(() => { if (!cancelled) setLoadingInitial(false); });

    return () => { cancelled = true; };
  }, [debouncedSearch, activeCategory]);

  // ── Load next page (appended for infinite scroll) ───────────────────────────

  const loadMore = useCallback(() => {
    if (loadingMore || loadingInitial || !hasMore) return;
    setLoadingMore(true);

    const nextPage = currentPage + 1;
    const params = new URLSearchParams({ page: String(nextPage), limit: String(PAGE_SIZE) });
    if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
    if (activeCategory) params.set("category", activeCategory);

    fetch(`/api/products?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setProducts((prev) => [...prev, ...mapProducts(data.products || [])]);
        setCurrentPage(data.page || nextPage);
        setHasMore((data.page || nextPage) < (data.total_pages || nextPage));
        setLoadingMore(false);
      })
      .catch(() => setLoadingMore(false));
  }, [loadingMore, loadingInitial, hasMore, currentPage, debouncedSearch, activeCategory]);

  // ── Intersection Observer for infinite scroll ───────────────────────────────

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMore(); },
      { rootMargin: SENTINEL_MARGIN }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  // ── Add to cart ─────────────────────────────────────────────────────────────

  const addToCart = async (product: Product, variantName?: string, quantity: number = 1) => {
    if (!user) { window.location.href = "/login"; return; }
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_slug: product.slug, variant_name: variantName, quantity }),
      });
      if (res.ok) {
        setCartCount((prev) => prev + quantity);
        setSelectedProduct(null);
        setToast("Ditambahkan ke keranjang!");
        setTimeout(() => setToast(""), 2000);
      }
    } catch {
      setToast("Gagal menambahkan");
      setTimeout(() => setToast(""), 2000);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar
        sellerName={seller.seller_name}
        profilePicture={seller.profile_picture}
        logo={seller.logo}
        brandColors={brandColors}
        cartCount={cartCount}
        searchQuery={searchQuery}
        onSearch={setSearchQuery}
      />

      <BannerSlider banners={banners} legacyBanner={seller.banner} legacyAlt={seller.seller_name} />

      {/* Category filter pills */}
      <div className="sticky top-[57px] z-40 bg-white border-b overflow-x-auto">
        <div className="flex gap-2 px-4 py-2">
          <button
            onClick={() => setActiveCategory(null)}
            className="px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition"
            style={!activeCategory ? { backgroundColor: brandColors.primary, color: "white" } : undefined}
            data-testid="button-category-all"
          >
            Semua
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition bg-gray-100 text-gray-700 hover:bg-gray-200"
              style={activeCategory === cat ? { backgroundColor: brandColors.primary, color: "white" } : undefined}
              data-testid={`button-category-${cat}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {loadingInitial ? (
          /* Skeleton grid shown while first page loads */
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : products.length === 0 ? (
          /* Empty state */
          <div className="text-center py-20 text-gray-400" data-testid="text-empty-state">
            {searchQuery.trim() || activeCategory ? (
              <>
                <p className="text-lg mb-1">Tidak ada produk ditemukan</p>
                {searchQuery.trim() && (
                  <p className="text-sm text-gray-500">&ldquo;{searchQuery}&rdquo;</p>
                )}
                <div className="flex gap-4 justify-center mt-4">
                  {searchQuery.trim() && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="text-sm underline hover:text-gray-600 transition"
                      data-testid="button-clear-search"
                    >
                      Hapus pencarian
                    </button>
                  )}
                  {activeCategory && (
                    <button
                      onClick={() => setActiveCategory(null)}
                      className="text-sm underline hover:text-gray-600 transition"
                      data-testid="button-clear-category"
                    >
                      Semua kategori
                    </button>
                  )}
                </div>
              </>
            ) : (
              <p>Belum ada produk</p>
            )}
          </div>
        ) : (
          <>
            {/* Product grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {products.map((product) => (
                <ProductCard
                  key={product.slug}
                  product={product}
                  formatPrice={formatPrice}
                  formatSoldCount={formatSoldCount}
                  onClick={() => setSelectedProduct(product)}
                />
              ))}
            </div>

            {/* Sentinel div — triggers loadMore when scrolled into view */}
            <div ref={sentinelRef} className="h-1" aria-hidden="true" />

            {/* Loading more spinner */}
            {loadingMore && (
              <div className="flex justify-center py-8" data-testid="text-loading-more">
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Memuat lebih banyak...</span>
                </div>
              </div>
            )}

            {/* End-of-list message */}
            {!hasMore && !loadingInitial && (
              <p className="text-center text-xs text-gray-300 py-6" data-testid="text-end-of-list">
                {products.length} produk ditampilkan
              </p>
            )}
          </>
        )}
      </main>

      {/* Product detail modal */}
      {selectedProduct && (
        <ProductDetail
          product={selectedProduct}
          formatPrice={formatPrice}
          formatSoldCount={formatSoldCount}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={addToCart}
        />
      )}

      {/* Toast notification */}
      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-lg text-sm z-[60] animate-fade-in"
          data-testid="text-toast"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
