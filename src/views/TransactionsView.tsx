import React, { useState } from 'react';
import { ShoppingBag, Search, Filter, Calendar, Stamp, Ban, CheckCircle2, RotateCcw, AlertTriangle, Clock, Banknote, QrCode, X } from 'lucide-react';
import { Transaction, TransactionCategory, StoreSettings, Customer, StampLedger } from '../types';
import { formatRupiah, formatDate, getCustomerStampBalance } from '../utils/storage';
import { WhatsAppButton, WhatsAppIcon } from '../components/WhatsAppButton';
import { createTransactionWAMessage, createDebtReminderWAMessage, sendWhatsAppMessage } from '../utils/whatsapp';

interface Props {
  transactions: Transaction[];
  categories: TransactionCategory[];
  customers?: Customer[];
  ledgers?: StampLedger[];
  settings: StoreSettings;
  onCancelTransaction: (transactionId: string, reason: string) => void;
  onSettleDebt?: (
    transactionId: string,
    settledMethod: 'cash' | 'qris'
  ) => { transaction: Transaction; newBalance: number } | void;
  onNewTransaction: () => void;
}

export const TransactionsView: React.FC<Props> = ({
  transactions,
  categories,
  customers = [],
  ledgers = [],
  settings,
  onCancelTransaction,
  onSettleDebt,
  onNewTransaction,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>(''); // YYYY-MM-DD
  const [cancellingTrx, setCancellingTrx] = useState<Transaction | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [settlingTrx, setSettlingTrx] = useState<Transaction | null>(null);
  const [settleMethod, setSettleMethod] = useState<'cash' | 'qris'>('cash');
  const [sendWAOnSettle, setSendWAOnSettle] = useState(true);

  const isTrxUnpaid = (trx: Transaction) =>
    trx.status === 'confirmed' &&
    (trx.paymentStatus === 'unpaid' || (trx.paymentMethod === 'hutang' && trx.paymentStatus !== 'paid'));

  const findCustomerForTrx = (trx: Transaction): Customer =>
    customers.find(c => c.id === trx.customerId || c.customerCode === trx.customerId) || {
      id: trx.customerId,
      name: trx.customerName,
      customerCode: trx.customerId || 'MEMBER',
      qrToken: 'scs_member',
      status: 'active' as const,
      createdAt: trx.createdAt,
    };

  const handleSendWATransaction = (trx: Transaction) => {
    const cust = findCustomerForTrx(trx);
    if (isTrxUnpaid(trx)) {
      const msg = createDebtReminderWAMessage(cust, trx, settings);
      sendWhatsAppMessage(cust.phone, msg);
      return;
    }
    const bal = getCustomerStampBalance(cust.id, ledgers);
    const msg = createTransactionWAMessage(cust, trx, bal, settings);
    sendWhatsAppMessage(cust.phone, msg);
  };

  const handleConfirmSettle = () => {
    if (!settlingTrx || !onSettleDebt) return;
    const res = onSettleDebt(settlingTrx.id, settleMethod);

    if (sendWAOnSettle) {
      const cust = findCustomerForTrx(settlingTrx);
      const settledTrx: Transaction = res?.transaction || {
        ...settlingTrx,
        paymentStatus: 'paid',
        stampEarned: settlingTrx.pendingStamps || 0,
        settledAt: new Date().toISOString(),
        settledMethod: settleMethod,
      };
      const balAfter =
        res?.newBalance ??
        getCustomerStampBalance(cust.id, ledgers) + (settlingTrx.pendingStamps || 0);
      const msg = createTransactionWAMessage(cust, settledTrx, balAfter, settings);
      sendWhatsAppMessage(cust.phone, msg);
    }

    setSettlingTrx(null);
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
    if (selectedStatus === 'unpaid') {
      if (!isTrxUnpaid(t)) return false;
    } else if (selectedStatus === 'confirmed') {
      if (t.status !== 'confirmed' || isTrxUnpaid(t)) return false;
    } else if (selectedStatus !== 'all' && t.status !== selectedStatus) {
      return false;
    }
    if (dateFilter && !t.createdAt.startsWith(dateFilter)) return false;

    return true;
  });

  const totalAmount = filtered
    .filter(t => t.status === 'confirmed' && !isTrxUnpaid(t))
    .reduce((sum, t) => sum + t.amount, 0);

  const totalUnpaidAmount = filtered
    .filter(t => isTrxUnpaid(t))
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
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Nominal (Lunas)</span>
          <p className="text-xl font-black text-orange-600 mt-1 tabular-nums">
            {formatRupiah(totalAmount)}
          </p>
          {totalUnpaidAmount > 0 && (
            <span className="text-[11px] font-semibold text-amber-700 mt-0.5 block tabular-nums">
              Belum lunas (Hutang): {formatRupiah(totalUnpaidAmount)}
            </span>
          )}
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
              <option value="confirmed">Sukses (Lunas)</option>
              <option value="unpaid">Hutang (Belum Lunas)</option>
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
                  const unpaid = isTrxUnpaid(trx);
                  const heldStamps = trx.pendingStamps || 0;

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

                      <td className="px-4 py-3 text-right">
                        <span className="font-black text-slate-800 tabular-nums block">
                          {formatRupiah(trx.amount)}
                        </span>
                        {trx.paymentMethod && (
                          <span className={`text-[10px] font-semibold ${
                            unpaid
                              ? 'text-amber-700'
                              : trx.paymentMethod === 'qris' || trx.settledMethod === 'qris'
                              ? 'text-blue-600'
                              : 'text-emerald-700'
                          }`}>
                            {trx.paymentMethod === 'hutang'
                              ? unpaid
                                ? 'Hutang · Belum Lunas'
                                : `Hutang · Lunas (${trx.settledMethod === 'qris' ? 'QRIS' : 'Cash'})`
                              : trx.paymentMethod === 'qris'
                              ? 'QRIS'
                              : 'Cash'}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-center">
                        {unpaid ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 tabular-nums">
                            <Clock className="w-3 h-3 text-amber-600" />
                            +{heldStamps} tertahan
                          </span>
                        ) : (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black tabular-nums ${
                            isConfirmed
                              ? 'bg-orange-50 text-orange-700 border border-orange-200'
                              : 'bg-slate-100 text-slate-400 line-through'
                          }`}>
                            <Stamp className="w-3 h-3 text-orange-500" />
                            +{trx.stampEarned}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-center">
                        {!isConfirmed ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
                            <Ban className="w-3 h-3 text-rose-600" />
                            Dibatalkan
                          </span>
                        ) : unpaid ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full">
                            <Clock className="w-3 h-3 text-amber-600" />
                            Belum Lunas
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Sukses
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isConfirmed && unpaid && onSettleDebt && (
                            <button
                              type="button"
                              onClick={() => {
                                const cust = findCustomerForTrx(trx);
                                setSettlingTrx(trx);
                                setSettleMethod('cash');
                                setSendWAOnSettle(!!cust.phone);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition shadow-xs whitespace-nowrap shrink-0"
                            >
                              Lunasi
                            </button>
                          )}

                          {isConfirmed && (
                            <WhatsAppButton
                              variant="icon"
                              onClick={() => handleSendWATransaction(trx)}
                              title={unpaid ? 'Kirim Pengingat Hutang via WhatsApp' : 'Kirim Struk Transaksi via WhatsApp'}
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
              {isTrxUnpaid(cancellingTrx) ? (
                <>
                  Pembatalan catatan hutang ini akan menghapus tagihan <strong>{formatRupiah(cancellingTrx.amount)}</strong> milik <strong>{cancellingTrx.customerName}</strong> tanpa memotong saldo stempel (karena stempel masih tertahan).
                </>
              ) : (
                <>
                  Pembatalan transaksi akan otomatis memotong kembali <strong>{cancellingTrx.stampEarned} stempel</strong> dari saldo pelanggan <strong>{cancellingTrx.customerName}</strong> dan dicatat sebagai pembalikan di buku besar (stamp ledger).
                </>
              )}
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

      {/* Settle Debt Modal */}
      {settlingTrx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-white/20">
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">Pelunasan Hutang</h3>
                  <p className="text-xs text-emerald-100">
                    {settlingTrx.customerName} · {settlingTrx.transactionCode}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSettlingTrx(null)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase">Total Tagihan Lunas</p>
                  <p className="text-xl font-black text-slate-900 tabular-nums mt-0.5">
                    {formatRupiah(settlingTrx.amount)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase">Stempel Cair</p>
                  <p className="text-lg font-black text-orange-600 tabular-nums mt-0.5">
                    +{settlingTrx.pendingStamps || 0}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Metode Pembayaran Pelunasan
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSettleMethod('cash')}
                    className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 ${
                      settleMethod === 'cash'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-1 ring-emerald-400/50'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg shrink-0 ${settleMethod === 'cash' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                      <Banknote className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold leading-tight">Cash (Tunai)</p>
                      <p className="text-[10px] text-slate-500 truncate">Masuk Buku Kas</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSettleMethod('qris')}
                    className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 ${
                      settleMethod === 'qris'
                        ? 'bg-blue-50 border-blue-500 text-blue-950 ring-1 ring-blue-400/50'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg shrink-0 ${settleMethod === 'qris' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                      <QrCode className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold leading-tight">QRIS</p>
                      <p className="text-[10px] text-slate-500 truncate">Tidak ke kas laci</p>
                    </div>
                  </button>
                </div>
              </div>

              <label className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 cursor-pointer select-none">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-950">
                  <WhatsAppIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Kirim Struk Lunas via WhatsApp</span>
                </div>
                <input
                  type="checkbox"
                  checked={sendWAOnSettle}
                  onChange={e => setSendWAOnSettle(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                />
              </label>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setSettlingTrx(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSettle}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm active:scale-95"
                >
                  Konfirmasi Lunas
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
