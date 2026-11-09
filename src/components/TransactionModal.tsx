import React, { useState } from 'react';
import { X, Calculator, Plus, AlertCircle, ArrowRight, Stamp, CheckCircle2, Phone } from 'lucide-react';
import { Customer, TransactionCategory, StoreSettings, Transaction } from '../types';
import { calculateStampsFromAmount, formatRupiah } from '../utils/storage';
import { sound } from '../utils/audio';
import { WhatsAppIcon } from './WhatsAppButton';
import { createTransactionWAMessage, sendWhatsAppMessage } from '../utils/whatsapp';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
  currentBalance: number;
  categories?: TransactionCategory[];
  settings: StoreSettings;
  onSubmit: (data: {
    customerId: string;
    customerName: string;
    categoryId: string;
    categoryName: string;
    amount: number;
    stampEarned: number;
    description: string;
  }) => Transaction | void;
}

export const TransactionModal: React.FC<Props> = ({
  isOpen,
  onClose,
  customer,
  currentBalance,
  categories = [],
  settings,
  onSubmit,
}) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    categories[0]?.id || 'cat-1'
  );
  const [rawAmount, setRawAmount] = useState('');
  const [description, setDescription] = useState('');
  const [sendWA, setSendWA] = useState(!!customer.phone);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const selectedCategory = categories.find(c => c.id === selectedCategoryId) || categories[0];
  const isLainnya = selectedCategory?.name?.toLowerCase().trim() === 'lainnya' || selectedCategory?.id === 'cat-10';
  const numericAmount = parseInt(rawAmount.replace(/\D/g, ''), 10) || 0;
  const stampsEarned = calculateStampsFromAmount(numericAmount, settings.stampThreshold, selectedCategory?.name || selectedCategoryId);
  const balanceAfter = currentBalance + stampsEarned;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    setRawAmount(val ? parseInt(val, 10).toLocaleString('id-ID') : '');
    setError(null);
  };

  const handleQuickAdd = (amount: number) => {
    const current = parseInt(rawAmount.replace(/\D/g, ''), 10) || 0;
    const next = current + amount;
    setRawAmount(next.toLocaleString('id-ID'));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!numericAmount || numericAmount <= 0) {
      setError('Nominal transaksi harus berupa angka positif.');
      return;
    }

    sound.playStamp();

    const catId = selectedCategory?.id || 'cat-1';
    const catName = selectedCategory?.name || 'Transaksi Toko';
    const descText = description.trim()
      ? `${catName} - ${description.trim()}`
      : catName;

    const createdTrx = onSubmit({
      customerId: customer.id,
      customerName: customer.name,
      categoryId: catId,
      categoryName: catName,
      amount: numericAmount,
      stampEarned: stampsEarned,
      description: descText,
    });

    if (sendWA) {
      const trxToUse: Transaction = createdTrx || {
        id: `trx-${Date.now()}`,
        transactionCode: `TRX-${Date.now().toString(36).toUpperCase()}`,
        customerId: customer.id,
        customerName: customer.name,
        categoryId: catId,
        categoryName: catName,
        amount: numericAmount,
        stampEarned: stampsEarned,
        status: 'confirmed',
        description: descText,
        createdBy: 'Admin SCS',
        createdAt: new Date().toISOString(),
      };

      const msg = createTransactionWAMessage(customer, trxToUse, balanceAfter, settings);
      sendWhatsAppMessage(customer.phone, msg);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-lg max-h-[92vh] flex flex-col rounded-3xl bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header - Always Fixed at Top */}
        <div className="shrink-0 bg-gradient-to-r from-orange-600 to-amber-600 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/20 backdrop-blur-xs">
              <Stamp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Input Transaksi & Beri Stempel</h3>
              <p className="text-xs text-orange-100">{customer.name} ({customer.customerCode})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-orange-100 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">

          {/* Kategori Layanan */}
          {categories.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Kategori Layanan
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {categories.map(cat => {
                  const isSelected = cat.id === selectedCategory?.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategoryId(cat.id)}
                      className={`px-2.5 py-2 rounded-xl border text-xs font-bold transition text-left truncate ${
                        isSelected
                          ? 'bg-orange-600 border-orange-600 text-white shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Amount Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Nominal Transaksi (Rp)
              </label>
              <span className="text-[11px] font-semibold text-orange-600">
                {isLainnya
                  ? `Kelipatan ${formatRupiah(settings.stampThreshold)} = 1 stempel`
                  : `Min. ${formatRupiah(settings.stampThreshold)} = 1 stempel / transaksi`}
              </span>
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-3 text-slate-400 font-bold text-sm">Rp</span>
              <input
                type="text"
                required
                autoFocus
                placeholder="0"
                value={rawAmount}
                onChange={handleAmountChange}
                className="w-full pl-11 pr-4 py-2.5 text-lg font-bold text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 tabular-nums"
              />
            </div>

            {/* Quick Amount Buttons */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {[20000, 30000, 45000, 60000, 100000, 200000].map(amt => (
                <button
                  type="button"
                  key={amt}
                  onClick={() => handleQuickAdd(amt)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[11px] font-semibold text-slate-700 transition"
                >
                  +{formatRupiah(amt).replace('Rp', '').trim()}
                </button>
              ))}
            </div>
          </div>

          {/* Real-time Stamp Calculation Preview Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-orange-50/80 to-amber-50/80 border border-orange-200">
            <div className="flex items-center justify-between text-xs text-slate-600 mb-2">
              <span className="font-semibold">Perolehan Stempel Transaksi:</span>
              <span className="font-semibold text-[11px] text-orange-700">
                {isLainnya
                  ? `Kategori 'Lainnya' Berlaku Kelipatan (Kelipatan ${formatRupiah(settings.stampThreshold)})`
                  : `Min. ${formatRupiah(settings.stampThreshold)} = +1 Stempel`}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-orange-200/60">
              <div className="bg-white/80 p-2 rounded-xl">
                <p className="text-[10px] text-slate-500 uppercase font-semibold">Stempel Lalu</p>
                <p className="text-base font-extrabold text-slate-700 tabular-nums">{currentBalance}</p>
              </div>

              <div className="bg-orange-600 text-white p-2 rounded-xl shadow-xs">
                <p className="text-[10px] text-orange-200 uppercase font-semibold">Stempel Didapat</p>
                <p className="text-base font-black tabular-nums">+{stampsEarned}</p>
              </div>

              <div className="bg-white/80 p-2 rounded-xl">
                <p className="text-[10px] text-slate-500 uppercase font-semibold">Total Stempel</p>
                <p className={`text-base font-extrabold tabular-nums ${balanceAfter >= settings.rewardRequiredStamps ? 'text-emerald-600' : 'text-slate-800'}`}>
                  {balanceAfter}
                </p>
              </div>
            </div>

            {numericAmount > 0 && stampsEarned === 0 && (
              <p className="text-[11px] text-amber-700 mt-2 text-center font-medium">
                Transaksi di bawah {formatRupiah(settings.stampThreshold)} tidak mendapatkan stempel.
              </p>
            )}

            {balanceAfter >= settings.rewardRequiredStamps && (
              <div className="mt-2.5 p-2 rounded-xl bg-emerald-100/80 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Pelanggan ini akan berhak menukarkan Hadiah ({settings.defaultRewardName})!</span>
              </div>
            )}
          </div>

          {/* Description (Optional) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Keterangan (Opsional)
            </label>
            <input
              type="text"
              placeholder="Contoh: No token 1234-..., tujuan rek BCA, dll"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>

          {/* WhatsApp Receipt Checkbox */}
          <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={sendWA}
                onChange={e => setSendWA(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
              />
              <div className="flex items-center gap-1.5 text-xs text-emerald-950 font-semibold">
                <WhatsAppIcon className="w-4 h-4 text-emerald-600" />
                <span>Kirim Struk Digital via WhatsApp</span>
              </div>
            </label>
            <span className="text-[10px] text-emerald-700 font-mono">
              {customer.phone || 'Nomor HP'}
            </span>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          </div>

          {/* Sticky Action Buttons */}
          <div className="shrink-0 px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-md shadow-orange-600/20 active:scale-95 transition"
            >
              <Stamp className="w-4 h-4" />
              <span>Konfirmasi & Beri Stempel</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
