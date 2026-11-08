import React, { useState } from 'react';
import { Download, Smartphone, X, Share2, PlusSquare } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface Props {
  className?: string;
  variant?: 'button' | 'banner';
}

export const PWAInstallButton: React.FC<Props> = ({ className = '', variant = 'button' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    if (variant === 'banner') {
      return (
        <div className={`bg-gradient-to-r from-orange-600 to-amber-600 text-white p-3 rounded-xl shadow-md flex items-center justify-between gap-3 ${className}`}>
          <div className="flex items-center gap-2.5">
            <Smartphone className="w-5 h-5 shrink-0" />
            <div className="text-left">
              <p className="text-xs font-semibold leading-tight">Pasang Aplikasi SCS Stamp</p>
              <p className="text-[11px] text-orange-100">Akses cepat di layar utama tanpa browser</p>
            </div>
          </div>
          <button
            onClick={install}
            className="px-3 py-1.5 bg-white text-orange-700 hover:bg-orange-50 active:scale-95 text-xs font-bold rounded-lg transition shadow-sm whitespace-nowrap"
          >
            Pasang
          </button>
        </div>
      );
    }

    return (
      <button
        onClick={install}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 active:scale-95 text-white text-xs font-medium transition shadow-sm whitespace-nowrap ${className}`}
        title="Pasang aplikasi di perangkat"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install App</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        {variant === 'banner' ? (
          <div className={`bg-gradient-to-r from-slate-800 to-slate-900 text-white p-3 rounded-xl shadow-md flex items-center justify-between gap-3 ${className}`}>
            <div className="flex items-center gap-2.5">
              <Smartphone className="w-5 h-5 text-orange-400 shrink-0" />
              <div className="text-left">
                <p className="text-xs font-semibold leading-tight">Pasang di iPhone / iPad</p>
                <p className="text-[11px] text-slate-300">Simpan kartu stempel di layar utama iOS</p>
              </div>
            </div>
            <button
              onClick={() => setShowIOSGuide(true)}
              className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-lg transition active:scale-95 whitespace-nowrap"
            >
              Petunjuk
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowIOSGuide(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition whitespace-nowrap ${className}`}
          >
            <Smartphone className="w-3.5 h-3.5 text-orange-500" />
            <span>Pasang di iOS</span>
          </button>
        )}

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl text-slate-900 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs">
                    SCS
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Pasang di Layar Utama iPhone</h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-600 my-4">
                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700 mt-0.5">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">1. Ketuk tombol Bagikan (Share)</p>
                    <p className="text-[11px] text-slate-500">Tombol kotak berpanah di bilah bawah browser Safari.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="p-1.5 rounded-lg bg-orange-100 text-orange-700 mt-0.5">
                    <PlusSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">2. Pilih "Tambah ke Layar Utama"</p>
                    <p className="text-[11px] text-slate-500">Gulir ke bawah pada menu pop-up dan ketuk "Add to Home Screen".</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs transition"
              >
                Mengerti
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
