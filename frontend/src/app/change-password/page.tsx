"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AccountSettingsPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  const [currentEmail, setCurrentEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emError, setEmError] = useState("");
  const [emSuccess, setEmSuccess] = useState("");
  const [emLoading, setEmLoading] = useState(false);

  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (!data.user) router.push("/login");
        else { setCurrentEmail(data.user.email); setChecking(false); }
      })
      .catch(() => router.push("/login"));
  }, [router]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");
    setPwSuccess("");

    if (newPassword.length < 6) { setPwError("Password baru minimal 6 karakter"); return; }
    if (newPassword !== confirmPassword) { setPwError("Password baru dan konfirmasi tidak cocok"); return; }

    setPwLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setPwError(data.error || "Gagal mengubah password"); return; }
      setPwSuccess("Password berhasil diubah!");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch { setPwError("Terjadi kesalahan jaringan"); } finally { setPwLoading(false); }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmError("");
    setEmSuccess("");

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(newEmail)) { setEmError("Format email tidak valid"); return; }

    setEmLoading(true);
    try {
      const res = await fetch("/api/auth/change-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_email: newEmail, password: emailPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setEmError(data.error || "Gagal mengubah email"); return; }
      setEmSuccess("Email berhasil diubah!");
      setCurrentEmail(data.user?.email || newEmail);
      setNewEmail(""); setEmailPassword("");
    } catch { setEmError("Terjadi kesalahan jaringan"); } finally { setEmLoading(false); }
  };

  if (checking) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-gray-400">Memuat...</div></div>;

  const inputClass = "w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition text-sm";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-gray-600" data-testid="link-back-home">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </Link>
          <h1 className="text-lg font-bold">Pengaturan Akun</h1>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-8 space-y-6">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-base font-bold mb-4">Ubah Email</h2>
          <p className="text-sm text-gray-500 mb-4">Email saat ini: <span className="font-medium text-gray-700" data-testid="text-current-email">{currentEmail}</span></p>

          {emError && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm" data-testid="text-email-error">{emError}</div>}
          {emSuccess && <div className="bg-green-50 text-green-600 px-4 py-3 rounded-lg mb-4 text-sm" data-testid="text-email-success">{emSuccess}</div>}

          <form onSubmit={handleEmailSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Baru</label>
              <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className={inputClass} placeholder="email.baru@contoh.com" required data-testid="input-new-email" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password (untuk konfirmasi)</label>
              <input type="password" value={emailPassword} onChange={(e) => setEmailPassword(e.target.value)} className={inputClass} placeholder="Masukkan password Anda" required data-testid="input-email-password" />
            </div>
            <button type="submit" disabled={emLoading} className="w-full bg-gray-900 text-white py-2.5 rounded-lg font-medium hover:bg-gray-800 transition disabled:opacity-50" data-testid="button-change-email">
              {emLoading ? "Memproses..." : "Ubah Email"}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-base font-bold mb-4">Ubah Password</h2>

          {pwError && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm" data-testid="text-change-password-error">{pwError}</div>}
          {pwSuccess && <div className="bg-green-50 text-green-600 px-4 py-3 rounded-lg mb-4 text-sm" data-testid="text-change-password-success">{pwSuccess}</div>}

          <form onSubmit={handlePasswordSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password Lama</label>
              <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={inputClass} placeholder="Masukkan password lama" required data-testid="input-current-password" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password Baru</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputClass} placeholder="Minimal 6 karakter" required minLength={6} data-testid="input-new-password" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Konfirmasi Password Baru</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputClass} placeholder="Ulangi password baru" required minLength={6} data-testid="input-confirm-new-password" />
            </div>
            <button type="submit" disabled={pwLoading} className="w-full bg-gray-900 text-white py-2.5 rounded-lg font-medium hover:bg-gray-800 transition disabled:opacity-50" data-testid="button-change-password">
              {pwLoading ? "Memproses..." : "Ubah Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
