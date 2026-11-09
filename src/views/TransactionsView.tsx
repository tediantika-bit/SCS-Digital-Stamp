import React, { useState } from 'react';
import { ShoppingBag, Search, Filter, Calendar, Stamp, Ban, CheckCircle2, RotateCcw, AlertTriangle } from 'lucide-react';
import { Transaction, TransactionCategory, StoreSettings, Customer, StampLedger } from '../types';
import { formatRupiah, formatDate, getCustomerStampBalance } from '../utils/storage';
import { WhatsAppButton } from '../components/WhatsAppButton';
import { createTransactionWAMessage, sendWhatsAppMessage } from '../utils/whatsapp';

interface Props {
  transactions: Transaction[];
  categories: TransactionCategory[];
  customers?: Customer[];
  ledgers?: StampLedger[];
  settings: StoreSettings;
  onCancelTransaction: (transactionId: string, reason: string) => void;
  onNewTransaction: () => void;
}

export const TransactionsView: React.FC<Props> = ({
  transactions,
  categories,
  customers = [],
  ledgers = [],
  settings,
  onCancelTransaction,
  onNewTransaction,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>(''); // YYYY-MM-DD
  const [cancellingTrx, setCancellingTrx] = useState<Transaction | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const handleSendWATransaction = (trx: Transaction) => {
    const cust = customers.find(c => c.id === trx.customerId) || {
      id: trx.customerId,
      name: trx.customerName,
      customerCode: 'MEMBER',
      qrToken: 'scs_member',
      status: 'active' as const,
      createdAt: trx.createdAt,
    };
    const bal = getCustomerStampBalance(cust.id, ledgers);
    const msg = createTransactionWAMessage(cust, trx, bal, settings);
    sendWhatsAppMessage(cust.phone, msg);
  };

  const filtered = transactions.filter(t => {
    const matchesSearch =
      t.customerName.toLowerCase().includes(search.toLowerCase()) ||
      t.transactionCode.toLowerCase().includes(search.toLowerCase()) ||
      (t.categoryName && t.categoryName.toLowerCase().includes(search.toLowerCase())) ||
      (t.description && t.description.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;
    if (selectedCategory !== 'all') {
      const catObj = categories.find(c => c.id === selectedCategory);
      const matchesCat =
        t.categoryId === selectedCategory ||
        (catObj &&
          (t.categoryName?.toLowerCase() === catObj.name.toLowerCase() ||
            t.description?.toLowerCase().startsWith(catObj.name.toLowerCase())));
      if (!matchesCat) return false;
    }
    if (selectedStatus !== 'all' && t.status !== selectedStatus) return false;
    if (dateFilter && !t.createdAt.startsWith(dateFilter)) return false;

    return true;
  });

  const totalAmount = filtered
    .filter(t => t.status === 'confirmed')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalStamps = filtered
    .filter(t => t.status === 'confirmed')
    .reduce((sum, t) => sum + t.stampEarned, 0);

  const handleConfirmCancel = () => {
    if (!cancellingTrx) return;
    onCancelTransaction(cancellingTrx.id, cancelReason.trim() || 'Dibatalkan oleh kasir');
    setCancellingTrx(null);
    setCancelReason('');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Riwayat Transaksi Stempel
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar lengkap catatan transaksi pelanggan, perhitungan stempel, dan audit log
          </p>
        </div>

        <button
          onClick={onNewTransaction}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition shadow-md shadow-orange-600/20 active:scale-95"
        >
          <Stamp className="w-4 h-4" />
          <span>+ Input Transaksi Baru</span>
        </button>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Transaksi</span>
          <p className="text-xl font-black text-slate-800 mt-1 tabular-nums">
            {filtered.length} <span className="text-xs font-normal text-slate-400">transaksi</span>
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Nominal (Terkonfirmasi)</span>
          <p className="text-xl font-black text-orange-600 mt-1 tabular-nums">
            {formatRupiah(totalAmount)}
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Stempel Diterbitkan</span>
          <p className="text-xl font-black text-emerald-600 mt-1 tabular-nums">
            +{totalStamps} <span className="text-xs font-normal text-slate-400">stempel</span>
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search */}
          <div className="sm:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari kode transaksi, pelanggan, layanan..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>

          {/* Category Filter */}
          <div className="sm:col-span-3">
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-1.5 text-xs text-slate-800 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white"
            >
              <option value="all">Semua Kategori Layanan</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="sm:col-span-2">
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-1.5 text-xs text-slate-800 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white"
            >
              <option value="all">Semua Status</option>
              <option value="confirmed">Terkonfirmasi</option>
              <option value="cancelled">Dibatalkan</option>
            </select>
          </div>

          {/* Date Picker */}
          <div className="sm:col-span-3">
            <input
              type="date"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-xs text-slate-800 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white"
            />
          </div>
        </div>

        {dateFilter && (
          <div className="flex items-center gap-2 pt-1 text-xs text-slate-600">
            <span>Filter Tanggal: <strong>{dateFilter}</strong></span>
            <button
              onClick={() => setDateFilter('')}
              className="text-orange-600 hover:underline font-bold"
            >
              Reset Tanggal
            </button>
          </div>
        )}
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
              <tr>
                <th className="px-4 py-3">Kode / Waktu</th>
                <th className="px-4 py-3">Pelanggan</th>
                <th className="px-4 py-3">Kategori & Keterangan</th>
                <th className="px-4 py-3 text-right">Nominal</th>
                <th className="px-4 py-3 text-center">Stempel</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    <ShoppingBag className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">Tidak ada riwayat transaksi yang cocok</p>
                  </td>
                </tr>
              ) : (
                filtered.map(trx => {
                  const isConfirmed = trx.status === 'confirmed';

                  return (
                    <tr key={trx.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-slate-800 block">
                          {trx.transactionCode}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {formatDate(trx.createdAt)}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <span className="font-bold text-slate-900 block">
                          {trx.customerName}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <span className="inline-block px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-orange-50 text-orange-800 border border-orange-200/60 max-w-xs truncate">
                          {trx.description || trx.categoryName || 'Transaksi Toko'}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right font-black text-slate-800 tabular-nums">
                        {formatRupiah(trx.amount)}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black tabular-nums ${
                          isConfirmed
                            ? 'bg-orange-50 text-orange-700 border border-orange-200'
                            : 'bg-slate-100 text-slate-400 line-through'
                        }`}>
                          <Stamp className="w-3 h-3 text-orange-500" />
                          +{trx.stampEarned}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-center">
                        {isConfirmed ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Sukses
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
                            <Ban className="w-3 h-3 text-rose-600" />
                            Dibatalkan
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isConfirmed && (
                            <WhatsAppButton
                              variant="icon"
                              onClick={() => handleSendWATransaction(trx)}
                              title="Kirim Struk Transaksi via WhatsApp"
                            />
                          )}

                          {isConfirmed ? (
                            <button
                              onClick={() => setCancellingTrx(trx)}
                              className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded-lg transition"
                              title="Batalkan transaksi dan balikkan stempel di stamp ledger"
                            >
                              Batalkan
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Dibalikkan</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cancel Transaction Modal */}
      {cancellingTrx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="p-2.5 rounded-2xl bg-rose-100">
                <AlertTriangle className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">Batalkan Transaksi?</h3>
                <p className="text-xs text-slate-500">{cancellingTrx.transactionCode}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Pembatalan transaksi akan otomatis memotong kembali <strong>{cancellingTrx.stampEarned} stempel</strong> dari saldo pelanggan <strong>{cancellingTrx.customerName}</strong> dan dicatat sebagai pembalikan di buku besar (stamp ledger).
            </p>

            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Alasan Pembatalan:
              </label>
              <input
                type="text"
                placeholder="Contoh: Kesalahan input nominal / transaksi dibatalkan pelanggan"
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => setCancellingTrx(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                Kembali
              </button>
              <button
                onClick={handleConfirmCancel}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-sm active:scale-95"
              >
                Ya, Batalkan Transaksi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
