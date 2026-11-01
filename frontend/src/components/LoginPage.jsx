import React, { useState } from 'react';
import { loginUser } from '../services/api';

/**
 * LoginPage Component - Retro Manga Bento (Neo-Brutalist Soft UI)
 * Features tactile inputs, crisp contour borders, solid drop shadows,
 * input validation, and secure authentication flow without quick demo buttons.
 */
export default function LoginPage({ onLoginSuccess }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanId = identifier.trim();
    const cleanPass = password.trim();

    if (!cleanId || !cleanPass) {
      setErrorMessage('Email/NIK dan Kata Sandi wajib diisi.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await loginUser(cleanId, cleanPass);
      if (onLoginSuccess) {
        onLoginSuccess(response.user);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Kredensial login tidak cocok. Pastikan data yang dimasukkan benar.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 selection:bg-ink selection:text-canvas">
      {/* Outer Bento Frame */}
      <div className="w-full sm:max-w-[420px] bg-canvas rounded-none sm:rounded-[44px] p-5 sm:p-6 border-0 sm:border-4 border-ink shadow-none sm:shadow-art-lg relative flex flex-col gap-4 overflow-hidden">
        {/* ==================== 1. HEADER BENTO ==================== */}
        <header className="bg-widget rounded-[26px] p-4 border-2 border-ink shadow-art flex items-center gap-3.5 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-ink text-canvas border-2 border-ink flex items-center justify-center shadow-art-sm shrink-0">
            <i className="ph-bold ph-fingerprint text-2xl text-emerald-400"></i>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-wider font-tech uppercase text-ink truncate">
                Sisman Absensi
              </h1>
              <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-pill text-emerald-400 border border-ink shrink-0">
                v2.0 Neo
              </span>
            </div>
            <p className="text-xs font-semibold text-ink-muted mt-0.5">
              Masuk ke Sistem Kehadiran
            </p>
          </div>
        </header>

        {/* ==================== 2. LOGIN FORM WIDGET ==================== */}
        <div className="bg-widget rounded-[28px] p-5 border-2 border-ink shadow-art flex flex-col gap-4">
          <div className="flex items-center justify-between border-b-2 border-ink/15 pb-2.5">
            <span className="text-[10px] font-tech font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg bg-pill text-white shadow-art-sm">
              Autentikasi Akun
            </span>
            <span className="text-[11px] font-mono text-ink-muted font-semibold">
              Presensi GPS & Swafoto
            </span>
          </div>

          {/* Error Message Capsule */}
          {errorMessage && (
            <div
              role="alert"
              className="bg-rose-100 border-2 border-ink text-rose-950 px-3.5 py-2.5 rounded-xl text-xs font-tech font-bold shadow-art-sm flex items-start gap-2.5 animate-in fade-in"
            >
              <i className="ph-bold ph-warning-circle text-rose-600 text-base shrink-0 mt-0.5"></i>
              <div className="flex-1 leading-tight">
                <span className="block uppercase text-[10px] text-rose-700 tracking-wider">Akses Ditolak</span>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            {/* Input 1: Email / NIK */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="login-identifier"
                className="text-xs font-bold font-tech text-ink flex items-center gap-1.5 uppercase"
              >
                <i className="ph-bold ph-identification-card text-sm text-ink-muted"></i>
                Email atau NIK
              </label>
              <input
                id="login-identifier"
                type="text"
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Contoh: F5512530109 atau ilham@absensi.com"
                disabled={isLoading}
                className="w-full bg-[#EFF3ED] border-2 border-ink rounded-xl px-3.5 py-2.5 font-tech text-xs sm:text-sm text-ink placeholder:text-ink-light/70 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-ink focus:bg-white shadow-art-sm transition-all disabled:opacity-60"
              />
            </div>

            {/* Input 2: Kata Sandi */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="login-password"
                className="text-xs font-bold font-tech text-ink flex items-center justify-between uppercase"
              >
                <span className="flex items-center gap-1.5">
                  <i className="ph-bold ph-lock-key text-sm text-ink-muted"></i>
                  Kata Sandi
                </span>
              </label>
              <div className="relative flex items-center">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi"
                  disabled={isLoading}
                  className="w-full bg-[#EFF3ED] border-2 border-ink rounded-xl px-3.5 py-2.5 pr-10 font-tech text-xs sm:text-sm text-ink placeholder:text-ink-light/70 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-ink focus:bg-white shadow-art-sm transition-all disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  className="absolute right-2.5 text-ink-muted hover:text-ink p-1 rounded-lg focus:outline-none"
                >
                  <i className={`ph-bold ${showPassword ? 'ph-eye-slash' : 'ph-eye'} text-base`}></i>
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 w-full py-3 px-4 rounded-xl bg-ink text-canvas font-tech font-bold text-xs sm:text-sm uppercase tracking-wider shadow-art hover:bg-[#2C3331] active:translate-x-0.5 active:translate-y-0.5 active:shadow-art-pressed transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <i className="ph-bold ph-spinner animate-spin text-base"></i>
                  <span>Memverifikasi...</span>
                </>
              ) : (
                <>
                  <i className="ph-bold ph-sign-in text-base"></i>
                  <span>Masuk ke Akun</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* ==================== 3. FOOTER INFO ==================== */}
        <footer className="bg-widget rounded-[22px] p-3 border-2 border-ink shadow-art-sm flex items-center justify-between text-[11px] font-tech text-ink-muted">
          <div className="flex items-center gap-1.5 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Server Siap</span>
          </div>
          <div className="flex items-center gap-1 font-mono text-[10px]">
            <i className="ph-bold ph-shield-check text-xs text-ink"></i>
            <span>Sesi Terenkripsi</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
