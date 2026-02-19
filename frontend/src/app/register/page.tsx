"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const PROVINCES = [
  "Aceh", "Sumatera Utara", "Sumatera Barat", "Riau", "Jambi", "Sumatera Selatan",
  "Bengkulu", "Lampung", "Kep. Bangka Belitung", "Kep. Riau", "DKI Jakarta",
  "Jawa Barat", "Jawa Tengah", "DI Yogyakarta", "Jawa Timur", "Banten",
  "Bali", "Nusa Tenggara Barat", "Nusa Tenggara Timur", "Kalimantan Barat",
  "Kalimantan Tengah", "Kalimantan Selatan", "Kalimantan Timur", "Kalimantan Utara",
  "Sulawesi Utara", "Sulawesi Tengah", "Sulawesi Selatan", "Sulawesi Tenggara",
  "Gorontalo", "Sulawesi Barat", "Maluku", "Maluku Utara", "Papua", "Papua Barat",
  "Papua Selatan", "Papua Tengah", "Papua Pegunungan", "Papua Barat Daya",
];

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Password dan konfirmasi password tidak cocok");
      return;
    }

    if (password.length < 6) {
      setError("Password minimal 6 karakter");
      return;
    }

    const phoneClean = phone.replace(/\D/g, "");
    if (phoneClean.length < 10 || phoneClean.length > 15) {
      setError("Nomor telepon tidak valid (10-15 digit)");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, email, password, phone: phoneClean,
          address, city, province, postal_code: postalCode,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Pendaftaran gagal");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Terjadi kesalahan jaringan");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition text-sm";

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border p-8">
        <h1 className="text-2xl font-bold text-center mb-2">Daftar Akun</h1>
        <p className="text-gray-500 text-center mb-6 text-sm">Buat akun pembeli untuk mulai berbelanja</p>

        {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm" data-testid="text-register-error">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap <span className="text-red-500">*</span></label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Nama lengkap Anda" required data-testid="input-name" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="email@contoh.com" required data-testid="input-email" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Telepon / WhatsApp <span className="text-red-500">*</span></label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} placeholder="08xxxxxxxxxx" required data-testid="input-phone" />
            <p className="text-xs text-gray-400 mt-1">Untuk konfirmasi pesanan & pengiriman</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password <span className="text-red-500">*</span></label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} placeholder="Min. 6 karakter" required minLength={6} data-testid="input-password" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Konfirmasi <span className="text-red-500">*</span></label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputClass} placeholder="Ulangi password" required minLength={6} data-testid="input-confirm-password" />
            </div>
          </div>

          <div className="border-t pt-4 mt-2">
            <p className="text-sm font-medium text-gray-700 mb-3">Alamat Pengiriman <span className="text-xs text-gray-400 font-normal">(opsional, bisa diisi nanti)</span></p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Alamat Lengkap</label>
                <textarea value={address} onChange={(e) => setAddress(e.target.value)} className={`${inputClass} resize-none`} rows={2} placeholder="Nama jalan, nomor rumah, RT/RW, kelurahan, kecamatan" data-testid="input-address" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Kota / Kabupaten</label>
                  <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className={inputClass} placeholder="Jakarta Selatan" data-testid="input-city" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Provinsi</label>
                  <select value={province} onChange={(e) => setProvince(e.target.value)} className={inputClass} data-testid="input-province">
                    <option value="">Pilih Provinsi</option>
                    {PROVINCES.map((p) => (<option key={p} value={p}>{p}</option>))}
                  </select>
                </div>
              </div>

              <div className="w-1/2">
                <label className="block text-xs text-gray-500 mb-1">Kode Pos</label>
                <input type="text" value={postalCode} onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, "").slice(0, 5))} className={inputClass} placeholder="12345" maxLength={5} data-testid="input-postal-code" />
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-gray-900 text-white py-2.5 rounded-lg font-medium hover:bg-gray-800 transition disabled:opacity-50" data-testid="button-register">
            {loading ? "Memproses..." : "Daftar"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Sudah punya akun?{" "}
          <Link href="/login" className="text-gray-900 font-medium hover:underline">Masuk</Link>
        </p>
      </div>
    </div>
  );
}
