import React, { useState } from 'react';
import { Stamp, Search, Scan, Plus, CheckCircle2, ArrowRight, User, Calculator, AlertCircle, RefreshCw, Sparkles, Phone } from 'lucide-react';
import { Customer, TransactionCategory, StoreSettings, StampLedger, Transaction } from '../types';
import { calculateStampsFromAmount, formatRupiah, getCustomerStampBalance } from '../utils/storage';
import { sound } from '../utils/audio';
import { WhatsAppButton } from '../components/WhatsAppButton';
import { createTransactionWAMessage, sendWhatsAppMessage } from '../utils/whatsapp';

interface Props {
  customers: Customer[];
  categories?: TransactionCategory[];
  settings: StoreSettings;
  ledgers: StampLedger[];
  onSubmitTransaction: (data: {
    customerId: string;
    customerName: string;
    categoryId: string;
    categoryName: string;
    amount: number;
    stampEarned: number;
    description: string;
  }) => Transaction | void;
  onViewCustomerCard: (customer: Customer) => void;
  preSelectedCustomer?: Customer | null;
}

export const TransactionInputView: React.FC<Props> = ({
  customers,
  categories = [],
  settings,
  ledgers,
  onSubmitTransaction,
  onViewCustomerCard,
  preSelectedCustomer,
}) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    preSelectedCustomer?.id || customers[0]?.id || ''
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    categories[0]?.id || 'cat-1'
  );
  const [customerSearch, setCustomerSearch] = useState('');
  const [rawAmount, setRawAmount] = useState('');
  const [description, setDescription] = useState('');
  const [lastSuccess, setLastSuccess] = useState<{
    customer: Customer;
    transaction: Transaction;
    amount: number;
    stamps: number;
    newBalance: number;
  } | null>(null);

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
  const selectedCategory = categories.find(c => c.id === selectedCategoryId) || categories[0];
  const currentBalance = selectedCustomer ? getCustomerStampBalance(selectedCustomer.id, ledgers) : 0;

  const numericAmount = parseInt(rawAmount.replace(/\D/g, ''), 10) || 0;
  const stampsEarned = calculateStampsFromAmount(numericAmount, settings.stampThreshold);
  const balanceAfter = currentBalance + stampsEarned;

  const filteredCustomers = customers.filter(c =>
    c.status === 'active' && (
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.customerCode.toLowerCase().includes(customerSearch.toLowerCase()) ||
      (c.phone && c.phone.includes(customerSearch))
    )
  );

  const handleQuickAdd = (amt: number) => {
    const cur = parseInt(rawAmount.replace(/\D/g, ''), 10) || 0;
    setRawAmount((cur + amt).toLocaleString('id-ID'));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    if (!numericAmount || numericAmount <= 0) return;

    sound.playStamp();

    const catId = selectedCategory?.id || 'cat-1';
    const catName = selectedCategory?.name || 'Transaksi Toko';
    const descText = description.trim()
      ? `${catName} - ${description.trim()}`
      : catName;

    const createdTrx = onSubmitTransaction({
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      categoryId: catId,
      categoryName: catName,
      amount: numericAmount,
      stampEarned: stampsEarned,
      description: descText,
    });

    const fallbackTrx: Transaction = createdTrx || {
      id: `trx-${Date.now()}`,
      transactionCode: `TRX-${Date.now().toString(36).toUpperCase()}`,
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      categoryId: catId,
      categoryName: catName,
      amount: numericAmount,
      stampEarned: stampsEarned,
      status: 'confirmed',
      description: descText,
      createdBy: 'Admin SCS',
      createdAt: new Date().toISOString(),
    };

    setLastSuccess({
      customer: selectedCustomer,
      transaction: fallbackTrx,
      amount: numericAmount,
      stamps: stampsEarned,
      newBalance: balanceAfter,
    });

    // Reset inputs
    setRawAmount('');
    setDescription('');
  };

  const handleSendWA = () => {
    if (!lastSuccess) return;
    const msg = createTransactionWAMessage(
      lastSuccess.customer,
      lastSuccess.transaction,
      lastSuccess.newBalance,
      settings
    );
    sendWhatsAppMessage(lastSuccess.customer.phone, msg);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Stamp className="w-6 h-6 text-orange-600" />
            <span>Kasir & Input Transaksi Stempel</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pilih pelanggan via nama/nomor HP, masukkan nominal transaksi, dan kirim struk WhatsApp.
          </p>
        </div>
      </div>

      {/* Success Notification Banner from previous transaction with WhatsApp 1-Click */}
      {lastSuccess && (
        <div className="p-5 rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in duration-200 shadow-sm">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0 shadow-sm">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="font-extrabold text-sm text-emerald-950 flex items-center gap-2">
                <span>Transaksi Berhasil Disimpan!</span>
                <span className="font-mono text-[11px] bg-emerald-200/60 text-emerald-800 px-2 py-0.5 rounded-md font-bold">
                  {lastSuccess.transaction.transactionCode}
                </span>
              </p>
              <p className="text-xs text-emerald-800 mt-0.5">
                <strong>{lastSuccess.customer.name}</strong> ({lastSuccess.customer.customerCode}) mendapatkan <strong>+{lastSuccess.stamps} stempel</strong>. Total saldo stempel saat ini: <strong>{lastSuccess.newBalance} stempel</strong>.
              </p>
              {lastSuccess.customer.phone && (
                <p className="text-[11px] text-emerald-700 flex items-center gap-1 mt-1">
                  <Phone className="w-3 h-3 text-emerald-600" />
                  <span>WA Pelanggan: <strong>{lastSuccess.customer.phone}</strong></span>
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* 1-Click WhatsApp Button */}
            <WhatsAppButton
              onClick={handleSendWA}
              label="Kirim Struk WhatsApp"
              size="md"
            />

            <button
              onClick={() => onViewCustomerCard(lastSuccess.customer)}
              className="px-3.5 py-1.5 rounded-xl bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 text-xs font-bold transition shadow-xs"
            >
              Lihat Kartu Digital
            </button>
            <button
              onClick={() => setLastSuccess(null)}
              className="text-xs text-emerald-700 hover:underline px-2 py-1"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Main Two-Panel Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Panel: Customer Selector */}
        <div className="md:col-span-5 bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-4 h-4 text-orange-600" />
              1. Pilih Pelanggan
            </span>
            <span className="text-[10px] text-slate-500 font-medium">
              {filteredCustomers.length} pelanggan aktif
            </span>
          </div>

          {/* Customer Search Input */}
          <div className="relative mb-3">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari nama, ID, atau HP..."
              value={customerSearch}
              onChange={e => setCustomerSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>

          {/* Customer List */}
          <div className="flex-1 max-h-[360px] overflow-y-auto space-y-1.5 pr-1">
            {filteredCustomers.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                <User className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-300" />
                <p className="text-xs font-semibold text-slate-600">
                  {customerSearch ? 'Pelanggan tidak ditemukan' : 'Belum ada pelanggan terdaftar'}
                </p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                  {customerSearch
                    ? 'Coba kata kunci pencarian nama atau nomor HP lainnya.'
                    : 'Daftarkan pelanggan baru terlebih dahulu melalui tab Pelanggan.'}
                </p>
              </div>
            ) : (
              filteredCustomers.map(cust => {
                const isSelected = cust.id === selectedCustomerId;
                const bal = getCustomerStampBalance(cust.id, ledgers);

                return (
                  <button
                    key={cust.id}
                    type="button"
                    onClick={() => setSelectedCustomerId(cust.id)}
                    className={`w-full p-3 rounded-2xl border text-left transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-orange-50 border-orange-500 ring-1 ring-orange-400/50 shadow-xs'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <p className={`font-bold text-xs truncate ${isSelected ? 'text-orange-900' : 'text-slate-800'}`}>
                        {cust.name}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {cust.customerCode} {cust.phone ? `· ${cust.phone}` : ''}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`inline-block px-2 py-0.5 rounded-lg text-xs font-black tabular-nums ${
                        bal >= 25
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {bal} / 25
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {selectedCustomer && (
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">Pelanggan terpilih:</span>
              <button
                type="button"
                onClick={() => onViewCustomerCard(selectedCustomer)}
                className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
              >
                <span>Lihat Kartu 25 Kotak</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Right Panel: Transaction Input Form */}
        <div className="md:col-span-7 bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-orange-600" />
                2. Pilih Kategori & Nominal Transaksi
              </span>
              {selectedCustomer && (
                <span className="text-xs font-bold text-orange-700 bg-orange-100/70 px-2.5 py-0.5 rounded-full">
                  {selectedCustomer.name}
                </span>
              )}
            </div>

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

            {/* Nominal Transaksi */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Nominal Transaksi (Rp)
                </label>
                <span className="text-[11px] text-slate-500">
                  Minimal {formatRupiah(settings.stampThreshold)} = 1 stempel
                </span>
              </div>

              <div className="relative">
                <span className="absolute left-3.5 top-3 text-slate-400 font-bold text-sm">Rp</span>
                <input
                  type="text"
                  required
                  placeholder="0"
                  value={rawAmount}
                  onChange={e => {
                    const v = e.target.value.replace(/\D/g, '');
                    setRawAmount(v ? parseInt(v, 10).toLocaleString('id-ID') : '');
                  }}
                  className="w-full pl-11 pr-4 py-2.5 text-xl font-black text-slate-900 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 tabular-nums"
                />
              </div>

              {/* Quick Preset Buttons */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 mt-2">
                {[20000, 40000, 60000, 100000, 200000, 500000].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handleQuickAdd(amt)}
                    className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition active:scale-95 text-center"
                  >
                    +{amt >= 1000000 ? `${amt / 1000000}jt` : `${amt / 1000}rb`}
                  </button>
                ))}
              </div>
            </div>

            {/* Real-time Calculation Box */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200/80">
              <div className="flex items-center justify-between text-xs text-slate-600 mb-2">
                <span className="font-bold">Hasil Kalkulasi Stempel Otomatis:</span>
                <span className="font-mono text-[11px] text-slate-500">
                  {numericAmount > 0 ? `${formatRupiah(numericAmount)} ÷ Rp20.000` : 'Rp0'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white/80 p-2.5 rounded-xl border border-orange-100">
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">Stempel Lalu</p>
                  <p className="text-lg font-black text-slate-800 tabular-nums">{currentBalance}</p>
                </div>

                <div className="bg-orange-600 text-white p-2.5 rounded-xl shadow-xs">
                  <p className="text-[10px] text-orange-100 uppercase font-bold">Stempel Didapat</p>
                  <p className="text-xl font-black tabular-nums">+{stampsEarned}</p>
                </div>

                <div className="bg-white/80 p-2.5 rounded-xl border border-orange-100">
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">Total Stempel</p>
                  <p className={`text-lg font-black tabular-nums ${balanceAfter >= 25 ? 'text-emerald-600' : 'text-slate-900'}`}>
                    {balanceAfter}
                  </p>
                </div>
              </div>

              {balanceAfter >= 25 && (
                <div className="mt-3 p-2 rounded-xl bg-emerald-100 text-emerald-900 text-xs font-bold flex items-center justify-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Pelanggan ini langsung berhak atas Minyak Goreng 500ml!</span>
                </div>
              )}
            </div>

            {/* Optional note */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Keterangan Tambahan (Opsional)
              </label>
              <input
                type="text"
                placeholder="Contoh: No pelanggan PLN 5312-xxx / transfer BCA"
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>

            {/* Confirm Submit */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={!selectedCustomer || numericAmount <= 0}
                className="w-full py-3.5 px-4 rounded-2xl bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:pointer-events-none text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-600/20 active:scale-[0.98] transition"
              >
                <Stamp className="w-5 h-5" />
                <span>Konfirmasi Simpan Transaksi (+{stampsEarned} Stempel)</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
