import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Award, Gift, CheckCircle2, QrCode, Sparkles, ExternalLink, Copy, Check } from 'lucide-react';
import { Customer, StoreSettings } from '../types';

interface StampCardProps {
  customer: Customer;
  currentBalance: number;
  settings: StoreSettings;
  showQrToggle?: boolean;
  onRedeemClick?: () => void;
  canRedeem?: boolean;
}

export const StampCard: React.FC<StampCardProps> = ({
  customer,
  currentBalance,
  settings,
  showQrToggle = true,
  onRedeemClick,
  canRedeem = false,
}) => {
  const [showQr, setShowQr] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const totalSlots = settings.rewardRequiredStamps || 25; // default 25 slots
  // Current active stamps on this sheet: if currentBalance >= 25, sheet is 100% full (25/25)
  const filledSlots = Math.min(totalSlots, currentBalance);
  const isComplete = currentBalance >= totalSlots;
  const surplusStamps = Math.max(0, currentBalance - totalSlots);
  const progressPercent = Math.min(100, Math.round((currentBalance / totalSlots) * 100));

  // Generate QR Code data URL containing public card view link
  useEffect(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const publicUrl = `${origin}/#card=${customer.qrToken}`;

    QRCode.toDataURL(publicUrl, {
      width: 280,
      margin: 1,
      color: {
        dark: '#ea580c',
        light: '#ffffff',
      },
    })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error('QR generation error:', err));
  }, [customer.qrToken]);

  const copyPublicLink = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const publicUrl = `${origin}/#card=${customer.qrToken}`;
    navigator.clipboard.writeText(publicUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Fixed pseudo-random rotation per slot index for authentic manual stamping look
  const getStampRotation = (index: number) => {
    const rotations = [-6, 3, -2, 5, -4, 2, -5, 4, -3, 6, -1, 3, -4, 5, -2, 4, -6, 2, 5, -3, 4, -5, 3, -2, 1];
    return rotations[index % rotations.length];
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Physical-style Stamp Card Shell */}
      <div className="relative rounded-3xl bg-white border border-orange-200/80 shadow-xl overflow-hidden transition-all duration-300">
        {/* Top Decorative Header Strip */}
        <div className="bg-gradient-to-r from-orange-600 via-orange-500 to-amber-600 px-5 py-4 text-white">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3.5">
              {settings.storeLogo ? (
                <img
                  src={settings.storeLogo}
                  alt={settings.storeName}
                  className="w-20 h-20 rounded-2xl object-contain bg-white p-2 border border-white/30 shadow-lg shrink-0"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center font-black text-white text-2xl tracking-wider border border-white/25 shrink-0 shadow-sm">
                  SCS
                </div>
              )}
              <div>
                <h2 className="text-lg sm:text-xl font-black tracking-tight leading-tight">
                  {settings.storeName}
                </h2>
                <p className="text-[11px] text-orange-100 font-semibold tracking-wide mt-1">
                  KARTU STEMPEL DIGITAL · 25 KOTAK
                </p>
              </div>
            </div>

            {showQrToggle && (
              <button
                onClick={() => setShowQr(!showQr)}
                className="p-2 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-white transition border border-white/20 flex items-center gap-1.5 text-xs font-semibold"
                title="Tampilkan Kode QR Pelanggan"
              >
                <QrCode className="w-4 h-4" />
                <span className="hidden sm:inline">{showQr ? 'Kartu' : 'QR'}</span>
              </button>
            )}
          </div>

          {/* Customer Metadata Banner */}
          <div className="mt-3 pt-3 border-t border-white/15 flex items-center justify-between text-xs">
            <div>
              <p className="text-[10px] text-orange-200 uppercase font-semibold tracking-wider">Nama Pelanggan</p>
              <p className="font-bold text-sm tracking-tight truncate max-w-[200px]">{customer.name}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-orange-200 uppercase font-semibold tracking-wider">ID Pelanggan</p>
              <p className="font-mono font-bold text-xs bg-black/20 px-2 py-0.5 rounded-md inline-block">
                {customer.customerCode}
              </p>
            </div>
          </div>
        </div>

        {/* Card Body */}
        {showQr ? (
          /* QR Code View (for customer to present at cash register) */
          <div className="p-6 text-center animate-in fade-in duration-200">
            <div className="inline-block p-4 bg-orange-50/50 rounded-2xl border border-orange-100 shadow-inner my-2">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR Code ${customer.name}`}
                  className="w-56 h-56 mx-auto rounded-xl shadow-xs"
                />
              ) : (
                <div className="w-56 h-56 bg-slate-100 animate-pulse rounded-xl flex items-center justify-center text-slate-400 text-xs">
                  Membuat QR...
                </div>
              )}
            </div>
            <p className="font-mono text-xs font-bold text-slate-700 mt-2 tracking-wide">
              {customer.customerCode} · {customer.name}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Tunjukkan QR Code ini kepada kasir {settings.storeName} saat bertransaksi.
            </p>

            <div className="mt-5 flex items-center justify-center gap-2">
              <button
                onClick={copyPublicLink}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Tautan Disalin!' : 'Salin Tautan Kartu'}</span>
              </button>
              <button
                onClick={() => setShowQr(false)}
                className="px-4 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold transition"
              >
                Lihat Kartu Stempel
              </button>
            </div>
          </div>
        ) : (
          /* 25-Stamp Grid View */
          <div className="p-4 sm:p-5">
            {/* Stamp Stats & Progress Bar */}
            <div className="mb-4 bg-orange-50/60 rounded-2xl p-3 border border-orange-100">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-orange-600" />
                  Saldo Stempel:
                </span>
                <span className="font-extrabold text-base text-orange-700 tabular-nums">
                  {currentBalance} <span className="text-xs font-medium text-slate-500">/ 25 stempel</span>
                </span>
              </div>

              {/* Linear Progress Bar */}
              <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isComplete
                      ? 'bg-gradient-to-r from-emerald-500 to-green-600'
                      : 'bg-gradient-to-r from-orange-500 to-amber-500'
                  }`}
                  style={{ width: `${Math.min(100, (currentBalance / 25) * 100)}%` }}
                />
              </div>

              {/* Helper text / notification */}
              <div className="mt-2 flex items-center justify-between text-[11px]">
                {isComplete ? (
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    Siap tukar hadiah! {surplusStamps > 0 && `(Sisa +${surplusStamps} stempel)`}
                  </span>
                ) : (
                  <span className="text-slate-600">
                    Kurang <strong className="text-orange-700">{25 - currentBalance}</strong> stempel lagi menuju hadiah
                  </span>
                )}

                <span className="text-slate-500 font-medium tabular-nums">
                  {progressPercent}%
                </span>
              </div>
            </div>

            {/* 25 Boxes Grid (5 columns x 5 rows) */}
            <div className="grid grid-cols-5 gap-2 sm:gap-2.5 p-2 bg-slate-50/80 rounded-2xl border border-slate-200/80">
              {Array.from({ length: totalSlots }, (_, i) => {
                const slotNum = i + 1;
                const isStamped = slotNum <= filledSlots;
                const isRewardSlot = slotNum === totalSlots;
                const rotation = getStampRotation(i);

                return (
                  <div
                    key={slotNum}
                    className={`relative aspect-square rounded-xl flex flex-col items-center justify-center p-1 border transition-all ${
                      isStamped
                        ? 'bg-white border-orange-300 shadow-xs ring-1 ring-orange-200/50'
                        : isRewardSlot
                        ? 'bg-amber-50/80 border-dashed border-2 border-amber-400'
                        : 'bg-white border-dashed border-slate-300'
                    }`}
                  >
                    {isStamped ? (
                      /* Stamped Seal Visual */
                      <div
                        className="w-full h-full flex flex-col items-center justify-center select-none"
                        style={{ transform: `rotate(${rotation}deg)` }}
                      >
                        {settings.storeLogo ? (
                          /* Circular Ink Stamp with Custom Store Logo */
                          <div className="relative w-9 h-9 sm:w-11 sm:h-11 rounded-full border-2 border-orange-600 flex items-center justify-center bg-white shadow-xs p-1">
                            <img
                              src={settings.storeLogo}
                              alt="Logo Stempel"
                              className="w-6 h-6 sm:w-7 sm:h-7 object-contain rounded-full"
                            />
                            <span className="absolute -bottom-1 px-1 py-0.2 bg-orange-600 text-white rounded-full text-[6px] sm:text-[7px] font-black tracking-tight shadow-xs leading-none">
                              #{slotNum}
                            </span>
                            {isRewardSlot && (
                              <span className="absolute -top-1 -right-1 bg-amber-500 text-white rounded-full p-0.5 shadow-xs">
                                <Sparkles className="w-2.5 h-2.5" />
                              </span>
                            )}
                          </div>
                        ) : (
                          /* Default Circular Ink Stamp */
                          <div className="relative w-9 h-9 sm:w-11 sm:h-11 rounded-full border-2 border-orange-600 flex flex-col items-center justify-center bg-orange-50/40 shadow-xs">
                            <span className="text-[7px] font-black tracking-widest text-orange-700 uppercase leading-none">
                              {settings.storeName ? settings.storeName.substring(0, 4).toUpperCase() : 'SCS'}
                            </span>
                            <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-600 my-0.5" strokeWidth={2.5} />
                            <span className="text-[6px] font-bold text-orange-600 leading-none">
                              #{slotNum}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : isRewardSlot ? (
                      /* Reward Special Slot */
                      <div className="flex flex-col items-center justify-center text-center p-0.5">
                        <Gift className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 animate-pulse" />
                        <span className="text-[8px] font-black text-amber-700 leading-none mt-1">
                          HADIAH
                        </span>
                        <span className="text-[7px] text-amber-600 font-semibold">
                          25
                        </span>
                      </div>
                    ) : (
                      /* Unstamped Slot */
                      <div className="flex flex-col items-center justify-center text-center">
                        <span className="font-mono text-xs sm:text-sm font-semibold text-slate-400">
                          {slotNum}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom Reward Callout */}
            <div className="mt-4 p-3 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs shrink-0">
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-amber-900 leading-tight">
                    Hadiah: {settings.defaultRewardName}
                  </p>
                  <p className="text-[10px] text-slate-600">
                    Tukarkan 25 stempel di kasir {settings.storeName}
                  </p>
                </div>
              </div>

              {canRedeem && onRedeemClick && (
                <button
                  onClick={onRedeemClick}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs active:scale-95 transition whitespace-nowrap"
                >
                  Tukar Hadiah
                </button>
              )}
            </div>

            {/* Micro info note */}
            <div className="mt-3 text-center text-[10px] text-slate-500">
              Setiap 1 transaksi minimal Rp{new Intl.NumberFormat('id-ID').format(settings.stampThreshold)} mendapatkan 1 stempel.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
