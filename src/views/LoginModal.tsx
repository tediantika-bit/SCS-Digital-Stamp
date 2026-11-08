import React, { useState } from 'react';
import { Lock, KeyRound, ShieldAlert, CheckCircle, ArrowRight, Store } from 'lucide-react';
import { StoreSettings } from '../types';

interface Props {
  isOpen: boolean;
  onLoginSuccess: () => void;
  settings: StoreSettings;
}

export const LoginModal: React.FC<Props> = ({
  isOpen,
  onLoginSuccess,
  settings,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === settings.adminPin || pin === '1234') {
      onLoginSuccess();
    } else {
      setError('PIN Admin tidak sesuai. Silakan coba lagi.');
    }
  };

  const handleQuickDemoLogin = () => {
    onLoginSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-orange-600 text-white flex items-center justify-center mx-auto mb-3 shadow-lg shadow-orange-600/30 font-black text-xl">
            SCS
          </div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight">
            Masuk Admin SCS Fotocopy
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Masukkan PIN Kasir untuk mengelola stempel & pelanggan
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 text-center">
              PIN Kasir / Admin
            </label>
            <div className="relative">
              <input
                type="password"
                autoFocus
                maxLength={6}
                placeholder="••••"
                value={pin}
                onChange={e => {
                  setPin(e.target.value);
                  setError(null);
                }}
                className="w-full text-center text-2xl font-mono tracking-widest py-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
              />
            </div>
            <p className="text-[11px] text-slate-400 text-center mt-1">
              PIN Default: <strong className="text-slate-600 font-mono">1234</strong>
            </p>
          </div>

          {error && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs text-center font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-md shadow-orange-600/20 active:scale-95 transition flex items-center justify-center gap-2"
          >
            <KeyRound className="w-4 h-4" />
            <span>Buka Dashboard Kasir</span>
          </button>

          <button
            type="button"
            onClick={handleQuickDemoLogin}
            className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
          >
            Masuk Otomatis (Demo Admin)
          </button>
        </form>
      </div>
    </div>
  );
};
