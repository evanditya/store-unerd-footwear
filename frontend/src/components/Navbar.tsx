"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface User { id: string; email: string; name: string; role: "seller" | "buyer"; }
interface BrandColors { primary: string; accent: string; }
interface NavbarProps {
  sellerName: string;
  profilePicture: string | null;
  logo?: string | null;
  brandColors?: BrandColors;
  cartCount: number;
  searchQuery?: string;
  onSearch?: (q: string) => void;
}

export default function Navbar({ sellerName, profilePicture, logo, brandColors, cartCount, searchQuery = "", onSearch }: NavbarProps) {
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const primary = brandColors?.primary || "#111827";
  const accent = brandColors?.accent || "#ef4444";

  useEffect(() => { fetch("/api/auth/me").then((r) => r.json()).then((data) => setUser(data.user || null)).catch(() => {}); }, []);

  useEffect(() => {
    if (mobileSearchOpen && searchRef.current) searchRef.current.focus();
  }, [mobileSearchOpen]);

  const handleLogout = async () => { await fetch("/api/auth/logout", { method: "POST" }); setUser(null); setMenuOpen(false); window.location.href = "/"; };

  return (
    <header className="bg-white border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
        {/* Logo / Store Name */}
        <Link href="/" className="flex items-center gap-3 min-w-0 flex-shrink-0">
          {logo ? (
            <img src={logo} alt={sellerName} className="h-9 w-auto max-w-[140px] object-contain flex-shrink-0" data-testid="img-store-logo" />
          ) : profilePicture ? (
            <img src={profilePicture} alt={sellerName} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
          ) : null}
          {!logo && <h1 className="text-lg font-bold truncate hidden sm:block" style={{ color: primary }}>{sellerName}</h1>}
          {logo && <span className="sr-only">{sellerName}</span>}
        </Link>

        {/* Search bar — desktop */}
        {onSearch && (
          <div className="hidden sm:flex flex-1 max-w-xl relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Cari produk..."
              className="w-full pl-4 pr-10 py-2 rounded-full border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition"
              style={{ "--tw-ring-color": primary } as React.CSSProperties}
              data-testid="input-search"
            />
            {searchQuery ? (
              <button
                onClick={() => onSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                data-testid="button-search-clear"
                aria-label="Hapus pencarian"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            ) : (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" /></svg>
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 ml-auto flex-shrink-0">
          {/* Search icon — mobile */}
          {onSearch && (
            <button
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              className="sm:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition"
              data-testid="button-search-mobile"
              aria-label="Cari"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" /></svg>
            </button>
          )}

          {user && (
            <Link href="/cart" className="relative" data-testid="link-cart">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m1.6 8l-1.4-7M7 13L5.4 5M7 13l-2 9m5-9v9m4-9v9m5-9l2 9" /></svg>
              {cartCount > 0 && <span className="absolute -top-2 -right-2 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center" style={{ backgroundColor: accent }} data-testid="text-cart-count">{cartCount}</span>}
            </Link>
          )}

          {user ? (
            <div className="relative">
              <button onClick={() => setMenuOpen(!menuOpen)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm bg-gray-100 hover:bg-gray-200 transition" data-testid="button-user-menu">
                <span className="truncate max-w-[100px]">{user.name}</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 bg-white rounded-lg border shadow-lg py-1 w-48 z-50">
                    {user.role === "seller" && <Link href="/seller" className="block px-4 py-2 text-sm hover:bg-gray-50" onClick={() => setMenuOpen(false)} data-testid="link-seller-dashboard">Dashboard Penjual</Link>}
                    <Link href="/orders" className="block px-4 py-2 text-sm hover:bg-gray-50" onClick={() => setMenuOpen(false)} data-testid="link-orders">Pesanan Saya</Link>
                    <Link href="/change-password" className="block px-4 py-2 text-sm hover:bg-gray-50" onClick={() => setMenuOpen(false)} data-testid="link-account-settings">Profil & Pengaturan</Link>
                    <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50" data-testid="button-logout">Keluar</button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="px-4 py-1.5 text-sm rounded-lg border hover:bg-gray-50 transition" data-testid="link-login">Masuk</Link>
              <Link href="/register" className="px-4 py-1.5 text-sm rounded-lg text-white hover:opacity-90 transition" style={{ backgroundColor: primary }} data-testid="link-register">Daftar</Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile search bar — expands below main row */}
      {onSearch && mobileSearchOpen && (
        <div className="sm:hidden px-4 pb-3">
          <div className="relative">
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Cari produk..."
              className="w-full pl-4 pr-10 py-2 rounded-full border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition"
              data-testid="input-search-mobile"
            />
            {searchQuery ? (
              <button
                onClick={() => onSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                aria-label="Hapus pencarian"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            ) : (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" /></svg>
              </span>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
