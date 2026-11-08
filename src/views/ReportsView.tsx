import React, { useState } from 'react';
import { BarChart3, Calendar, FileText, Download, Printer, Filter, ShoppingBag, Stamp, Gift, Users } from 'lucide-react';
import { Customer, Transaction, StampLedger, Redemption, TransactionCategory, StoreSettings } from '../types';
import { formatRupiah, formatDate } from '../utils/storage';

interface Props {
  customers: Customer[];
  transactions: Transaction[];
  ledgers: StampLedger[];
  redemptions: Redemption[];
  categories: TransactionCategory[];
  settings: StoreSettings;
}

export const ReportsView: React.FC<Props> = ({
  customers,
  transactions,
  ledgers,
  redemptions,
  categories,
  settings,
}) => {
  const [period, setPeriod] = useState<'all' | 'today' | 'month'>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const currentMonthStr = now.toISOString().slice(0, 7);

  const filteredTransactions = transactions.filter(t => {
    if (period === 'today') return t.createdAt.startsWith(todayStr);
    if (period === 'month') return t.createdAt.startsWith(currentMonthStr);
    if (customStart && t.createdAt < customStart) return false;
    if (customEnd && t.createdAt > `${customEnd}T23:59:59.999Z`) return false;
    return true;
  });

  const confirmedTrx = filteredTransactions.filter(t => t.status === 'confirmed');
  const totalAmount = confirmedTrx.reduce((s, t) => s + t.amount, 0);
  const totalStamps = confirmedTrx.reduce((s, t) => s + t.stampEarned, 0);

  const filteredRedemptions = redemptions.filter(r => {
    if (period === 'today') return r.redeemedAt.startsWith(todayStr);
    if (period === 'month') return r.redeemedAt.startsWith(currentMonthStr);
    if (customStart && r.redeemedAt < customStart) return false;
    if (customEnd && r.redeemedAt > `${customEnd}T23:59:59.999Z`) return false;
    return true;
  });

  // Category breakdown
  const categoryStats = categories.map(cat => {
    const trxs = confirmedTrx.filter(t => t.categoryId === cat.id);
    const amount = trxs.reduce((s, t) => s + t.amount, 0);
    const count = trxs.length;
    const stamps = trxs.reduce((s, t) => s + t.stampEarned, 0);
    return {
      category: cat,
      count,
      amount,
      stamps,
      percentOfTotal: totalAmount > 0 ? Math.round((amount / totalAmount) * 100) : 0,
    };
  }).filter(c => c.count > 0).sort((a, b) => b.amount - a.amount);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 print:m-0 print:p-0">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-orange-600" />
            <span>Laporan & Statistik Loyalitas</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Ringkasan omzet transaksi, stempel diterbitkan, dan penukaran hadiah SCS Fotocopy
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-xs"
        >
          <Printer className="w-4 h-4 text-slate-500" />
          <span>Cetak Laporan</span>
        </button>
      </div>

      {/* Filter Ribbon */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => { setPeriod('all'); setCustomStart(''); setCustomEnd(''); }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              period === 'all' && !customStart ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Semua Waktu
          </button>
          <button
            onClick={() => { setPeriod('today'); setCustomStart(''); setCustomEnd(''); }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              period === 'today' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Hari Ini
          </button>
          <button
            onClick={() => { setPeriod('month'); setCustomStart(''); setCustomEnd(''); }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              period === 'month' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Bulan Ini
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium">Rentang Khusus:</span>
          <input
            type="date"
            value={customStart}
            onChange={e => { setCustomStart(e.target.value); setPeriod('all'); }}
            className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg text-slate-800"
          />
          <span className="text-slate-400">s/d</span>
          <input
            type="date"
            value={customEnd}
            onChange={e => { setCustomEnd(e.target.value); setPeriod('all'); }}
            className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg text-slate-800"
          />
        </div>
      </div>

      {/* Report KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Omzet Transaksi</span>
          <p className="text-2xl font-black text-slate-800 mt-1 tabular-nums">
            {formatRupiah(totalAmount)}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">{confirmedTrx.length} transaksi terkonfirmasi</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Stempel Diterbitkan</span>
          <p className="text-2xl font-black text-orange-600 mt-1 tabular-nums">
            +{totalStamps} <span className="text-xs font-normal text-slate-400">stempel</span>
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">Rata-rata: {confirmedTrx.length ? Math.round(totalStamps / confirmedTrx.length) : 0} stempel / trx</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Hadiah Minyak Goreng</span>
          <p className="text-2xl font-black text-emerald-600 mt-1 tabular-nums">
            {filteredRedemptions.length} <span className="text-xs font-normal text-slate-400">botol</span>
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">Ditukarkan dalam periode ini</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Pelanggan Terdaftar</span>
          <p className="text-2xl font-black text-blue-600 mt-1 tabular-nums">
            {customers.length} <span className="text-xs font-normal text-slate-400">orang</span>
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">Pemilik kartu digital</span>
        </div>
      </div>

      {/* Category Contribution Breakdown */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs">
        <h3 className="font-bold text-sm text-slate-800 mb-1">
          Kontribusi Per Kategori Layanan
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Rincian nominal dan jumlah stempel berdasarkan kategori transaksi
        </p>

        <div className="space-y-3">
          {categoryStats.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">Tidak ada transaksi dalam periode ini</p>
          ) : (
            categoryStats.map(item => (
              <div key={item.category.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-bold text-slate-800">{item.category.name}</span>
                  <div className="text-right">
                    <span className="font-black text-slate-900 tabular-nums mr-2">{formatRupiah(item.amount)}</span>
                    <span className="text-[11px] font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full tabular-nums">
                      +{item.stamps} stempel
                    </span>
                  </div>
                </div>

                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-orange-500 rounded-full transition-all duration-300"
                    style={{ width: `${item.percentOfTotal}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                  <span>{item.count} transaksi</span>
                  <span>{item.percentOfTotal}% dari total omzet</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
