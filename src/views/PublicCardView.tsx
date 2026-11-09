import React, { useState } from 'react';
import { Customer, StampLedger, StoreSettings, Reward } from '../types';
import { StampCard } from '../components/StampCard';
import { PWAInstallButton } from '../components/PWAInstallButton';
import { WhatsAppButton } from '../components/WhatsAppButton';
import { sendWhatsAppMessage } from '../utils/whatsapp';
import { Store, Phone, MapPin, Sparkles, ChevronRight, History, ShieldCheck, ArrowLeft, QrCode } from 'lucide-react';
import { formatDate, formatRupiah } from '../utils/storage';

interface Props {
  customer: Customer;
  currentBalance: number;
  ledgers: StampLedger[];
  settings: StoreSettings;
  rewards: Reward[];
  onBackToAdmin?: () => void;
  isAdmin?: boolean;
}

export const PublicCardView: React.FC<Props> = ({
  customer,
  currentBalance,
  ledgers,
  settings,
  rewards,
  onBackToAdmin,
  isAdmin = false,
}) => {
  const [activeTab, setActiveTab] = useState<'card' | 'history' | 'info'>('card');
  const customerLedgers = ledgers
    .filter(l => l.customerId === customer.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const isEligible = currentBalance >= (settings.rewardRequiredStamps || 25);
  const remaining = Math.max(0, (settings.rewardRequiredStamps || 25) - currentBalance);

  return (
    <div className="min-h-screen bg-slate-100/70 pb-12 font-sans">
      {/* Top Mobile Bar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            {settings.storeLogo ? (
              <img
                src={settings.storeLogo}
                alt={settings.storeName}
                className="w-16 h-16 rounded-2xl object-contain bg-white border border-slate-200/80 p-1 shadow-sm shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-orange-600 text-white flex items-center justify-center font-black text-base shadow-sm shrink-0">
                SCS
              </div>
            )}
            <div>
              <h1 className="font-extrabold text-base text-slate-900 leading-tight">
                {settings.storeName}
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Kartu Stempel Digital</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <PWAInstallButton className="hidden sm:inline-flex" />
            {isAdmin && onBackToAdmin && (
              <button
                onClick={onBackToAdmin}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-bold"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Admin</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-md mx-auto p-4 space-y-4">
        {/* PWA Install Banner */}
        <PWAInstallButton variant="banner" />

        {/* Customer Welcome & Status Badge */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Pemilik Kartu</span>
            <h2 className="text-base font-extrabold text-slate-900">{customer.name}</h2>
            <p className="text-xs font-mono text-slate-500">{customer.customerCode}</p>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Saldo Stempel</span>
            <p className="text-2xl font-black text-orange-600 tabular-nums">
              {currentBalance} <span className="text-xs font-semibold text-slate-400">/ 25</span>
            </p>
          </div>
        </div>

        {/* Reward Status Banner */}
        {isEligible ? (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center font-bold text-white shrink-0">
              <Sparkles className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <p className="font-extrabold text-sm leading-tight">SELAMAT! Hadiah Siap Ditukarkan</p>
              <p className="text-xs text-emerald-100 mt-0.5">
                Tunjukkan kartu ini kepada kasir {settings.storeName} untuk klaim <strong>{settings.defaultRewardName}</strong>!
              </p>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl bg-orange-50 border border-orange-200 text-orange-950 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-orange-600 shrink-0" />
              <span>Kumpulkan <strong>{remaining} stempel lagi</strong> untuk mendapatkan <strong>{settings.defaultRewardName}</strong>!</span>
            </div>
          </div>
        )}

        {/* Segmented Tabs: Kartu Stempel / Riwayat / Info Toko */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-200/70 rounded-2xl">
          <button
            onClick={() => setActiveTab('card')}
            className={`py-2 text-xs font-bold rounded-xl transition ${
              activeTab === 'card'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Kartu 25 Kotak
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-2 text-xs font-bold rounded-xl transition ${
              activeTab === 'history'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Riwayat ({customerLedgers.length})
          </button>
          <button
            onClick={() => setActiveTab('info')}
            className={`py-2 text-xs font-bold rounded-xl transition ${
              activeTab === 'info'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Info Toko
          </button>
        </div>

        {/* TAB 1: Digital Stamp Card */}
        {activeTab === 'card' && (
          <div className="animate-in fade-in duration-150">
            <StampCard
              customer={customer}
              currentBalance={currentBalance}
              settings={settings}
              showQrToggle={true}
            />
          </div>
        )}

        {/* TAB 2: Stamp & Transaction History */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <History className="w-4 h-4 text-orange-600" />
              <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                Catatan Stempel Anda
              </h3>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {customerLedgers.length === 0 ? (
                <p className="text-slate-400 text-center py-6">Belum ada riwayat transaksi stempel</p>
              ) : (
                customerLedgers.map(l => (
                  <div key={l.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-800">{l.description}</p>
                      <p className="text-[10px] text-slate-400">{formatDate(l.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <span className={`font-black tabular-nums ${l.amount > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>
                        {l.amount > 0 ? `+${l.amount}` : l.amount} Stempel
                      </span>
                      <p className="text-[10px] text-slate-400">Saldo: {l.balanceAfter}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 3: Store Info & Loyalty Rules */}
        {activeTab === 'info' && (
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4 animate-in fade-in duration-150 text-xs">
            <div>
              <h3 className="font-bold text-sm text-slate-900 mb-1">{settings.storeName}</h3>
              <p className="text-slate-500">{settings.storeTagline}</p>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-start gap-2.5 text-slate-600">
                <MapPin className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                <span>{settings.storeAddress}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <div className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-orange-600 shrink-0" />
                  <span>{settings.storePhone}</span>
                </div>
                <WhatsAppButton
                  variant="badge"
                  onClick={() => sendWhatsAppMessage(settings.storePhone, `Halo ${settings.storeName}, saya ${customer.name} (ID: ${customer.customerCode}) ingin bertanya tentang kartu stempel/layanan.`)}
                  label="Chat WhatsApp Kasir"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-2">
              <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                Ketentuan Program Stempel:
              </h4>
              <ul className="space-y-1.5 text-slate-600 list-disc list-inside">
                <li>Setiap 1 kali transaksi layanan (Pulsa, Token listrik, PLN Pascabayar, Top Up E-Money, Transfer, Angsuran, BTN, Tarik tunai, Top Up Game Online) minimal <strong>{formatRupiah(settings.stampThreshold)}</strong> mendapatkan <strong>1 stempel</strong> (tidak berlaku kelipatan).</li>
                <li>Khusus kategori <strong>Lainnya</strong> (Fotocopy, ATK, Cetak, dll), berlaku kelipatan setiap <strong>{formatRupiah(settings.stampThreshold)}</strong> = 1 stempel (contoh: Rp45.000 = 2 stempel).</li>
                <li>{settings.rewardRequiredStamps} stempel dapat ditukarkan dengan <strong>{settings.defaultRewardName}</strong>.</li>
                <li>Sisa stempel tidak hangus dan otomatis dibawa ke lembar stempel periode berikutnya.</li>
              </ul>
            </div>
          </div>
        )}

        {/* Footer Security Notice */}
        <div className="text-center text-[10px] text-slate-400 pt-2 flex items-center justify-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
          <span>Halaman Resmi Pelanggan · SCS Digital Stamp System</span>
        </div>
      </main>
    </div>
  );
};
