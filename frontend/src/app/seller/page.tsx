"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSiteTitle, clearSiteTitleCache } from "@/hooks/useSiteTitle";
import Cropper from "react-easy-crop";

interface Product { name: string; slug: string; price: number; stock: number; category: string; primary_image: string; sold_count: number; }
interface Order {
  id: string; total: number; status: string; created_at: string;
  courier_company?: string; courier_type?: string; courier_service_name?: string; shipping_cost?: number;
  waybill_id?: string; tracking_status?: string; biteship_order_id?: string; shipping_etd?: string;
  destination_contact_name?: string; shipping_address?: string;
  items: Array<{ product_name: string; quantity: number; price: number }>;
}
interface BannerItem { id: string; image_url: string; title: string; link: string; display_order: number; is_active: boolean; }

function formatPrice(price: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(price);
}

function ShippingBadge({ status }: { status?: string }) {
  const map: Record<string, { label: string; color: string }> = {
    confirmed: { label: "Dikonfirmasi", color: "bg-blue-100 text-blue-700" },
    allocated: { label: "Dialokasikan", color: "bg-blue-100 text-blue-700" },
    picking_up: { label: "Dijemput", color: "bg-yellow-100 text-yellow-700" },
    picked: { label: "Diambil", color: "bg-yellow-100 text-yellow-700" },
    dropping_off: { label: "Dalam Pengiriman", color: "bg-purple-100 text-purple-700" },
    delivered: { label: "Terkirim", color: "bg-green-100 text-green-700" },
    on_hold: { label: "Ditahan", color: "bg-gray-100 text-gray-700" },
    rejected: { label: "Ditolak", color: "bg-red-100 text-red-700" },
    cancelled: { label: "Dibatalkan", color: "bg-red-100 text-red-700" },
    returned: { label: "Dikembalikan", color: "bg-orange-100 text-orange-700" },
    disposed: { label: "Dibuang", color: "bg-gray-100 text-gray-700" },
  };
  if (!status) return null;
  const info = map[status] || { label: status, color: "bg-gray-100 text-gray-700" };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${info.color}`}>{info.label}</span>;
}

interface BrandColors { primary: string; accent: string; }
interface Branding { store_name: string; logo: string; favicon: string; font: string; brand_colors: BrandColors; }

const FONTS = ["Inter", "Poppins", "Nunito", "Raleway", "Lato"];
const BANNER_ASPECT = 3 / 1;

interface CropArea { x: number; y: number; width: number; height: number; }

async function getCroppedImg(imageSrc: string, pixelCrop: CropArea): Promise<Blob> {
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.src = imageSrc;
  await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = reject; });
  const canvas = document.createElement("canvas");
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => { if (blob) resolve(blob); else reject(new Error("Canvas toBlob failed")); }, "image/jpeg", 0.92);
  });
}

export default function SellerDashboard() {
  useSiteTitle("Dashboard Seller");
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tab, setTab] = useState<"products" | "orders" | "settings" | "branding">("products");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [shippingLoading, setShippingLoading] = useState<string | null>(null);
  const [shippingAvailable, setShippingAvailable] = useState(false);

  const [branding, setBranding] = useState<Branding>({ store_name: "", logo: "", favicon: "", font: "Inter", brand_colors: { primary: "#111827", accent: "#ef4444" } });
  const [brandSaving, setBrandSaving] = useState(false);
  const [brandMsg, setBrandMsg] = useState("");
  const [logoUploading, setLogoUploading] = useState(false);
  const [faviconUploading, setFaviconUploading] = useState(false);

  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null);
  const [cropUploading, setCropUploading] = useState(false);
  const [newBannerTitle, setNewBannerTitle] = useState("");
  const [newBannerLink, setNewBannerLink] = useState("");
  const [bannerMsg, setBannerMsg] = useState("");
  const dragBannerIdx = useRef<number | null>(null);

  const loadBanners = useCallback(async () => {
    try {
      const res = await fetch("/api/banners/all");
      const data = await res.json();
      setBanners(data.banners || []);
    } catch { setBanners([]); }
  }, []);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((data) => { if (!data.user || data.user.role !== "seller") { router.push("/login"); return; } setUser(data.user); });
    Promise.all([fetch("/api/products").then((r) => r.json()), fetch("/api/orders").then((r) => r.json())]).then(([prodData, orderData]) => { setProducts(prodData.products || []); setOrders(orderData.orders || []); setLoading(false); });
    fetch("/api/shipping/status").then((r) => r.json()).then((data) => setShippingAvailable(data.available)).catch(() => {});
    fetch("/api/branding").then((r) => r.json()).then((data) => setBranding((prev) => ({ ...prev, ...data, brand_colors: { ...prev.brand_colors, ...(data.brand_colors || {}) } }))).catch(() => {});
    loadBanners();
  }, [router, loadBanners]);

  const handleUploadLogo = async (file: File) => {
    setLogoUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/branding/upload-logo", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) { setBranding((prev) => ({ ...prev, logo: data.url })); setBrandMsg("Logo berhasil diupload!"); setTimeout(() => setBrandMsg(""), 3000); }
      else setBrandMsg(data.error || "Gagal upload logo");
    } catch { setBrandMsg("Gagal upload logo"); }
    setLogoUploading(false);
  };

  const handleUploadFavicon = async (file: File) => {
    setFaviconUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/branding/upload-favicon", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) {
        const urlWithVersion = `${data.url}${data.version ? `?v=${data.version}` : ""}`;
        setBranding((prev) => ({ ...prev, favicon: urlWithVersion }));
        setBrandMsg("Favicon berhasil diupload!"); setTimeout(() => setBrandMsg(""), 3000);
      } else setBrandMsg(data.error || "Gagal upload favicon");
    } catch { setBrandMsg("Gagal upload favicon"); }
    setFaviconUploading(false);
  };

  const handleSaveBranding = async () => {
    setBrandSaving(true); setBrandMsg("");
    try {
      const res = await fetch("/api/branding", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ store_name: branding.store_name, font: branding.font, brand_colors: branding.brand_colors }) });
      const data = await res.json();
      if (data.success) { setBrandMsg("Branding berhasil disimpan!"); setTimeout(() => setBrandMsg(""), 3000); clearSiteTitleCache(); }
      else setBrandMsg(data.error || "Gagal menyimpan");
    } catch { setBrandMsg("Gagal menyimpan"); }
    setBrandSaving(false);
  };

  const handleDelete = async (slug: string) => { if (!confirm("Hapus produk ini?")) return; const res = await fetch(`/api/products/${slug}`, { method: "DELETE" }); if (res.ok) setProducts((prev) => prev.filter((p) => p.slug !== slug)); };
  const handleStatusChange = async (orderId: string, newStatus: string) => { await fetch(`/api/orders`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order_id: orderId, status: newStatus }) }); setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))); };

  const handleCreateShipment = async (orderId: string) => {
    if (!confirm("Buat pengiriman untuk pesanan ini? Status akan berubah menjadi 'Dikirim'.")) return;
    setShippingLoading(orderId);
    try {
      const res = await fetch(`/api/shipping/create-order/${orderId}`, { method: "POST" });
      const data = await res.json();
      if (data.success) { setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: "shipped", waybill_id: data.waybill_id, biteship_order_id: data.biteship_order_id, tracking_status: data.status } : o)); alert(`Pengiriman berhasil dibuat!\nNo. Resi: ${data.waybill_id || "Menunggu"}\nTracking: ${data.tracking_url || "-"}`); }
      else alert(data.error || "Gagal membuat pengiriman");
    } catch { alert("Terjadi kesalahan saat membuat pengiriman"); }
    setShippingLoading(null);
  };

  const handlePrintLabel = (orderId: string) => window.open(`/api/shipping/label/${orderId}`, "_blank");

  const onCropComplete = useCallback((_: unknown, pixels: CropArea) => setCroppedAreaPixels(pixels), []);

  const openCropModal = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => { setCropSrc(reader.result as string); setCrop({ x: 0, y: 0 }); setZoom(1); setCroppedAreaPixels(null); setCropOpen(true); };
    reader.readAsDataURL(file);
  };

  const handleCropAndUpload = async () => {
    if (!cropSrc || !croppedAreaPixels) return;
    setCropUploading(true);
    setBannerMsg("");
    try {
      const blob = await getCroppedImg(cropSrc, croppedAreaPixels);
      const fd = new FormData();
      fd.append("file", blob, "banner.jpg");
      const headers: Record<string, string> = {};
      if (newBannerTitle) headers["X-Banner-Title"] = newBannerTitle;
      if (newBannerLink) headers["X-Banner-Link"] = newBannerLink;
      const res = await fetch("/api/banners/upload", { method: "POST", headers, body: fd });
      const data = await res.json();
      if (data.banner) {
        await loadBanners();
        setCropOpen(false);
        setCropSrc(null);
        setNewBannerTitle("");
        setNewBannerLink("");
        setBannerMsg("Banner berhasil ditambahkan!");
        setTimeout(() => setBannerMsg(""), 3000);
      } else {
        setBannerMsg(data.error || "Gagal upload banner");
      }
    } catch (e) {
      setBannerMsg("Gagal upload banner: " + (e instanceof Error ? e.message : "unknown error"));
    }
    setCropUploading(false);
  };

  const handleToggleBanner = async (b: BannerItem) => {
    const res = await fetch(`/api/banners/${b.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_active: !b.is_active }) });
    if (res.ok) setBanners((prev) => prev.map((x) => x.id === b.id ? { ...x, is_active: !b.is_active } : x));
  };

  const handleDeleteBanner = async (id: string) => {
    if (!confirm("Hapus banner ini?")) return;
    const res = await fetch(`/api/banners/${id}`, { method: "DELETE" });
    if (res.ok) setBanners((prev) => prev.filter((b) => b.id !== id));
  };

  const handleUpdateBanner = async (id: string, field: "title" | "link", value: string) => {
    setBanners((prev) => prev.map((b) => b.id === id ? { ...b, [field]: value } : b));
    await fetch(`/api/banners/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [field]: value }) });
  };

  const handleDragStart = (idx: number) => { dragBannerIdx.current = idx; };
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    const from = dragBannerIdx.current;
    if (from === null || from === idx) return;
    setBanners((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(from, 1);
      updated.splice(idx, 0, moved);
      dragBannerIdx.current = idx;
      return updated.map((b, i) => ({ ...b, display_order: i }));
    });
  };
  const handleDragEnd = async () => {
    dragBannerIdx.current = null;
    const items = banners.map((b, i) => ({ id: b.id, order: i }));
    await fetch("/api/banners/reorder", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items }) });
  };

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-gray-400">Memuat...</div></div>;

  const totalRevenue = orders.filter((o) => o.status === "paid" || o.status === "completed" || o.status === "shipped").reduce((s, o) => s + o.total, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-gray-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg></Link>
            <h1 className="text-lg font-bold">Dashboard Penjual</h1>
          </div>
          <span className="text-sm text-gray-500">{user?.name}</span>
        </div>
      </header>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg border p-4"><p className="text-sm text-gray-500">Total Produk</p><p className="text-2xl font-bold" data-testid="text-total-products">{products.length}</p></div>
          <div className="bg-white rounded-lg border p-4"><p className="text-sm text-gray-500">Total Pesanan</p><p className="text-2xl font-bold" data-testid="text-total-orders">{orders.length}</p></div>
          <div className="bg-white rounded-lg border p-4"><p className="text-sm text-gray-500">Pendapatan</p><p className="text-2xl font-bold text-green-600" data-testid="text-revenue">{formatPrice(totalRevenue)}</p></div>
        </div>
        <div className="flex gap-2 mb-4 flex-wrap">
          <button onClick={() => setTab("products")} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === "products" ? "bg-gray-900 text-white" : "bg-white border text-gray-700"}`} data-testid="tab-products">Produk ({products.length})</button>
          <button onClick={() => setTab("orders")} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === "orders" ? "bg-gray-900 text-white" : "bg-white border text-gray-700"}`} data-testid="tab-orders">Pesanan ({orders.length})</button>
          <button onClick={() => setTab("branding")} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === "branding" ? "bg-gray-900 text-white" : "bg-white border text-gray-700"}`} data-testid="tab-branding">Branding</button>
          <button onClick={() => setTab("settings")} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === "settings" ? "bg-gray-900 text-white" : "bg-white border text-gray-700"}`} data-testid="tab-settings">Pengaturan</button>
        </div>

        {tab === "products" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-lg">Daftar Produk</h2>
              <Link href="/seller/products/new" className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition" data-testid="button-add-product">+ Tambah Produk</Link>
            </div>
            <div className="space-y-2">
              {products.map((product) => (
                <div key={product.slug} className="bg-white rounded-lg border p-4 flex items-center gap-4" data-testid={`product-row-${product.slug}`}>
                  <img src={product.primary_image} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{product.name}</h3>
                    <p className="text-sm text-gray-500">{product.category}</p>
                    <div className="flex gap-4 mt-1 text-sm"><span className="text-red-600 font-medium">{formatPrice(product.price)}</span><span className="text-gray-400">Stok: {product.stock}</span><span className="text-gray-400">{product.sold_count} terjual</span></div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Link href={`/seller/products/${product.slug}`} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition" data-testid={`button-edit-${product.slug}`}>Edit</Link>
                    <button onClick={() => handleDelete(product.slug)} className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm hover:bg-red-100 transition" data-testid={`button-delete-${product.slug}`}>Hapus</button>
                  </div>
                </div>
              ))}
              {products.length === 0 && <div className="text-center py-12 text-gray-400">Belum ada produk</div>}
            </div>
          </div>
        )}

        {tab === "orders" && (
          <div className="space-y-2">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-lg border p-4" data-testid={`order-row-${order.id}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono text-gray-500">#{order.id.substring(0, 8)}</span>
                    {order.tracking_status && <ShippingBadge status={order.tracking_status} />}
                  </div>
                  <select value={order.status} onChange={(e) => handleStatusChange(order.id, e.target.value)} className="text-sm border rounded-lg px-2 py-1" data-testid={`select-status-${order.id}`}>
                    <option value="pending">Menunggu</option><option value="paid">Dibayar</option><option value="processing">Diproses</option><option value="shipped">Dikirim</option><option value="completed">Selesai</option><option value="cancelled">Dibatalkan</option>
                  </select>
                </div>
                {order.destination_contact_name && <p className="text-sm text-gray-600 mb-1">Penerima: {order.destination_contact_name}</p>}
                {order.shipping_address && <p className="text-xs text-gray-400 mb-2 truncate">Alamat: {order.shipping_address}</p>}
                <div className="space-y-1 mb-2">{order.items.map((item, i) => (<p key={i} className="text-sm">{item.product_name} x{item.quantity} - {formatPrice(item.price * item.quantity)}</p>))}</div>
                {order.courier_company && (
                  <div className="bg-gray-50 rounded-lg p-3 mb-2">
                    <div className="flex items-center gap-2 text-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>
                      <span className="font-medium">{order.courier_company.toUpperCase()}</span>
                      {order.courier_service_name && <span className="text-gray-400">- {order.courier_service_name}</span>}
                      {order.shipping_cost ? <span className="text-gray-500 ml-auto">{formatPrice(order.shipping_cost)}</span> : null}
                    </div>
                    {order.waybill_id && <p className="text-xs font-mono mt-1 text-gray-600">Resi: {order.waybill_id}</p>}
                    {order.shipping_etd && <p className="text-xs text-gray-400 mt-0.5">ETD: {order.shipping_etd}</p>}
                  </div>
                )}
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">{new Date(order.created_at).toLocaleDateString("id-ID")}</span>
                  <div className="flex items-center gap-2">
                    {(order.status === "paid" || order.status === "processing") && !order.biteship_order_id && (
                      <button onClick={() => handleCreateShipment(order.id)} disabled={shippingLoading === order.id} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition disabled:opacity-50" data-testid={`button-ship-${order.id}`}>
                        {shippingLoading === order.id ? "Memproses..." : "Kirim Paket"}
                      </button>
                    )}
                    {(order.status === "shipped" || order.biteship_order_id) && (
                      <button onClick={() => handlePrintLabel(order.id)} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition" data-testid={`button-label-${order.id}`}>Cetak Label</button>
                    )}
                    <span className="font-bold">{formatPrice(order.total)}</span>
                  </div>
                </div>
              </div>
            ))}
            {orders.length === 0 && <div className="text-center py-12 text-gray-400">Belum ada pesanan</div>}
          </div>
        )}

        {tab === "branding" && (
          <div className="space-y-4">
            {/* Logo + Colors + Font */}
            <div className="bg-white rounded-lg border p-6">
              <h2 className="font-bold text-lg mb-1">Branding Toko</h2>
              <p className="text-sm text-gray-500 mb-6">Atur logo, warna, dan font tampilan toko Anda.</p>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-1">Nama Toko / Website</label>
                  <p className="text-xs text-gray-500 mb-2">Digunakan sebagai judul tab browser, metadata halaman, dan nama di navbar.</p>
                  <input type="text" value={branding.store_name} onChange={(e) => setBranding((p) => ({ ...p, store_name: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Nama toko Anda" data-testid="input-store-name" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Favicon Website</label>
                  <p className="text-xs text-gray-500 mb-2">Ikon kecil yang muncul di tab browser. Perubahan aktif setelah halaman di-refresh.</p>
                  <div className="border-2 border-dashed rounded-lg p-4 flex items-center gap-4">
                    <div className="flex-shrink-0 w-16 h-16 rounded-lg border bg-gray-50 flex items-center justify-center overflow-hidden">
                      {branding.favicon ? (
                        <img src={branding.favicon} alt="Favicon" className="w-10 h-10 object-contain" data-testid="img-favicon-preview" />
                      ) : (
                        <span className="text-2xl">🌐</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition" data-testid="button-upload-favicon">
                        {faviconUploading ? "Mengupload..." : "Pilih Favicon"}
                        <input type="file" accept=".ico,.png,.svg,.webp,image/png,image/x-icon,image/vnd.microsoft.icon,image/svg+xml,image/webp" className="hidden" disabled={faviconUploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadFavicon(f); e.target.value = ""; }} />
                      </label>
                      <div className="mt-2 space-y-0.5">
                        <p className="text-xs font-medium text-gray-600">Rekomendasi:</p>
                        <p className="text-xs text-gray-500">• <span className="font-semibold text-gray-700">32 × 32 px</span> atau <span className="font-semibold text-gray-700">64 × 64 px</span></p>
                        <p className="text-xs text-gray-500">• Format: <span className="font-semibold text-gray-700">PNG</span>, ICO, SVG, atau WebP</p>
                        <p className="text-xs text-gray-500">• Maks. <span className="font-semibold text-gray-700">1 MB</span></p>
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Logo Toko</label>
                  <p className="text-xs text-gray-500 mb-2">Ditampilkan di pojok kiri navbar, tinggi ±36px.</p>
                  <div className="border-2 border-dashed rounded-lg p-4 text-center">
                    {branding.logo ? (
                      <img src={branding.logo} alt="Logo" className="max-h-24 mx-auto mb-3 object-contain" data-testid="img-logo-preview" />
                    ) : (
                      <div className="h-16 flex items-center justify-center text-gray-400 text-sm mb-3">Belum ada logo</div>
                    )}
                    <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition" data-testid="button-upload-logo">
                      {logoUploading ? "Mengupload..." : "Pilih Gambar"}
                      <input type="file" accept="image/*" className="hidden" disabled={logoUploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadLogo(f); e.target.value = ""; }} />
                    </label>
                    <div className="mt-3 text-left bg-gray-50 rounded-lg px-3 py-2 space-y-0.5">
                      <p className="text-xs font-medium text-gray-600">Rekomendasi:</p>
                      <p className="text-xs text-gray-500">• <span className="font-semibold text-gray-700">400 × 400 px</span> (persegi 1:1)</p>
                      <p className="text-xs text-gray-500">• PNG dengan latar transparan (terbaik)</p>
                      <p className="text-xs text-gray-500">• Maks. <span className="font-semibold text-gray-700">2 MB</span></p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Warna Utama</label>
                    <div className="flex items-center gap-3">
                      <input type="color" value={branding.brand_colors.primary} onChange={(e) => setBranding((p) => ({ ...p, brand_colors: { ...p.brand_colors, primary: e.target.value } }))} className="w-10 h-10 rounded border cursor-pointer p-0.5" data-testid="input-color-primary" />
                      <input type="text" value={branding.brand_colors.primary} onChange={(e) => setBranding((p) => ({ ...p, brand_colors: { ...p.brand_colors, primary: e.target.value } }))} className="flex-1 border rounded-lg px-3 py-2 text-sm font-mono" placeholder="#111827" data-testid="input-color-primary-text" />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Tombol, link aktif, navigasi</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Warna Aksen</label>
                    <div className="flex items-center gap-3">
                      <input type="color" value={branding.brand_colors.accent} onChange={(e) => setBranding((p) => ({ ...p, brand_colors: { ...p.brand_colors, accent: e.target.value } }))} className="w-10 h-10 rounded border cursor-pointer p-0.5" data-testid="input-color-accent" />
                      <input type="text" value={branding.brand_colors.accent} onChange={(e) => setBranding((p) => ({ ...p, brand_colors: { ...p.brand_colors, accent: e.target.value } }))} className="flex-1 border rounded-lg px-3 py-2 text-sm font-mono" placeholder="#ef4444" data-testid="input-color-accent-text" />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Harga, badge, sorotan</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Font</label>
                  <div className="flex gap-2 flex-wrap">
                    {FONTS.map((f) => (
                      <button key={f} onClick={() => setBranding((p) => ({ ...p, font: f }))} className={`px-4 py-2 rounded-lg text-sm border transition ${branding.font === f ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 hover:border-gray-400"}`} style={{ fontFamily: f }} data-testid={`button-font-${f}`}>{f}</button>
                    ))}
                  </div>
                </div>
                <div className="border rounded-lg p-4 bg-gray-50">
                  <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide">Preview Navbar</p>
                  <div className="bg-white rounded-lg border p-4 flex items-center gap-3">
                    {branding.logo ? (<img src={branding.logo} alt="logo" className="h-8 w-auto object-contain" />) : (<div className="w-8 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: branding.brand_colors.primary }} />)}
                    <span className="font-bold" style={{ fontFamily: branding.font, color: branding.brand_colors.primary }}>{branding.store_name || "Nama Toko"}</span>
                    <div className="ml-auto flex gap-2">
                      <span className="px-3 py-1 rounded-lg text-xs text-white" style={{ backgroundColor: branding.brand_colors.primary, fontFamily: branding.font }}>Masuk</span>
                      <span className="px-3 py-1 rounded-lg text-xs text-white" style={{ backgroundColor: branding.brand_colors.accent, fontFamily: branding.font }}>Daftar</span>
                    </div>
                  </div>
                </div>
                {brandMsg && (
                  <div className={`text-sm rounded-lg px-4 py-3 ${brandMsg.includes("berhasil") ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`} data-testid="text-brand-msg">{brandMsg}</div>
                )}
                <button onClick={handleSaveBranding} disabled={brandSaving} className="w-full bg-gray-900 text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition disabled:opacity-50" data-testid="button-save-branding">
                  {brandSaving ? "Menyimpan..." : "Simpan Perubahan Branding"}
                </button>
              </div>
            </div>

            {/* Banner Slider Manager */}
            <div className="bg-white rounded-lg border p-6">
              <div className="flex items-center justify-between mb-1">
                <h2 className="font-bold text-lg">Banner Slider</h2>
                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition" data-testid="button-add-banner">
                  + Tambah Banner
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) openCropModal(f); e.target.value = ""; }} />
                </label>
              </div>
              <p className="text-sm text-gray-500 mb-1">Upload beberapa banner untuk ditampilkan sebagai slider di halaman depan toko.</p>
              <p className="text-xs text-gray-400 mb-4">Rasio 3:1 (misal 1200×400px) • Seret untuk mengubah urutan • Klik toggle untuk aktif/nonaktif</p>

              {bannerMsg && (
                <div className={`text-sm rounded-lg px-4 py-3 mb-4 ${bannerMsg.includes("berhasil") ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`} data-testid="text-banner-msg">{bannerMsg}</div>
              )}

              {banners.length === 0 ? (
                <div className="border-2 border-dashed rounded-lg py-12 text-center text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto mb-2 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <p className="text-sm">Belum ada banner</p>
                  <p className="text-xs mt-1">Klik &ldquo;+ Tambah Banner&rdquo; untuk memulai</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {banners.map((b, idx) => (
                    <div
                      key={b.id}
                      draggable
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDragEnd={handleDragEnd}
                      className={`flex items-center gap-3 border rounded-lg p-3 bg-white cursor-grab active:cursor-grabbing transition ${!b.is_active ? "opacity-50" : ""}`}
                      data-testid={`banner-row-${b.id}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" /></svg>
                      <img src={b.image_url} alt="" className="w-24 h-8 object-cover rounded flex-shrink-0" />
                      <div className="flex-1 min-w-0 grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={b.title}
                          onChange={(e) => setBanners((prev) => prev.map((x) => x.id === b.id ? { ...x, title: e.target.value } : x))}
                          onBlur={(e) => handleUpdateBanner(b.id, "title", e.target.value)}
                          placeholder="Judul (opsional)"
                          className="border rounded px-2 py-1 text-xs w-full"
                          data-testid={`input-banner-title-${b.id}`}
                        />
                        <input
                          type="text"
                          value={b.link}
                          onChange={(e) => setBanners((prev) => prev.map((x) => x.id === b.id ? { ...x, link: e.target.value } : x))}
                          onBlur={(e) => handleUpdateBanner(b.id, "link", e.target.value)}
                          placeholder="Link URL (opsional)"
                          className="border rounded px-2 py-1 text-xs w-full"
                          data-testid={`input-banner-link-${b.id}`}
                        />
                      </div>
                      <button
                        onClick={() => handleToggleBanner(b)}
                        className={`flex-shrink-0 w-10 h-6 rounded-full transition-colors relative ${b.is_active ? "bg-green-500" : "bg-gray-300"}`}
                        title={b.is_active ? "Nonaktifkan" : "Aktifkan"}
                        data-testid={`toggle-banner-${b.id}`}
                      >
                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${b.is_active ? "left-5" : "left-1"}`} />
                      </button>
                      <button onClick={() => handleDeleteBanner(b.id)} className="flex-shrink-0 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition" data-testid={`button-delete-banner-${b.id}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "settings" && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg border p-6">
              <h2 className="font-bold text-lg mb-1">Profil, Alamat & Lokasi Pengiriman</h2>
              <p className="text-sm text-gray-500 mb-3">Kelola nama pengirim, telepon, alamat toko, dan lokasi origin pengiriman Biteship dari satu halaman.</p>
              {!shippingAvailable && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800 mb-4">
                  <p className="font-medium">Biteship belum dikonfigurasi</p>
                  <p className="mt-1">Tambahkan <code className="bg-yellow-100 px-1 rounded">BITESHIP_API_KEY</code> di Secrets tab untuk mengaktifkan fitur pengiriman.</p>
                </div>
              )}
              <a href="/change-password" className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition" data-testid="link-edit-profile">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                Edit Profil & Pengaturan
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Crop Modal */}
      {cropOpen && cropSrc && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div>
                <h3 className="font-bold text-base">Crop Banner</h3>
                <p className="text-xs text-gray-500 mt-0.5">Rasio tetap 3:1 • Zoom & seret untuk mengatur</p>
              </div>
              <button onClick={() => { setCropOpen(false); setCropSrc(null); }} className="text-gray-400 hover:text-gray-600 p-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="relative bg-gray-900" style={{ height: 240 }}>
              <Cropper
                image={cropSrc}
                crop={crop}
                zoom={zoom}
                aspect={BANNER_ASPECT}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <div className="px-5 py-3 border-t bg-gray-50">
              <div className="flex items-center gap-3 mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                <input type="range" min={1} max={3} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1 accent-gray-900" data-testid="input-crop-zoom" />
                <span className="text-xs text-gray-500 w-10 text-right">{zoom.toFixed(1)}×</span>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <input type="text" value={newBannerTitle} onChange={(e) => setNewBannerTitle(e.target.value)} placeholder="Judul banner (opsional)" className="border rounded-lg px-3 py-2 text-sm" data-testid="input-new-banner-title" />
                <input type="text" value={newBannerLink} onChange={(e) => setNewBannerLink(e.target.value)} placeholder="URL tujuan (opsional)" className="border rounded-lg px-3 py-2 text-sm" data-testid="input-new-banner-link" />
              </div>
              <button onClick={handleCropAndUpload} disabled={cropUploading || !croppedAreaPixels} className="w-full bg-gray-900 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-gray-800 transition disabled:opacity-50" data-testid="button-crop-upload">
                {cropUploading ? "Mengupload..." : "Crop & Upload Banner"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
