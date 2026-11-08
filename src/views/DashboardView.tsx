import React from 'react';
import { Users, Stamp, ArrowUpRight, Gift, ShoppingBag, PlusCircle, Scan, Sparkles, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { Customer, Transaction, StampLedger, Redemption, StoreSettings } from '../types';
import { formatRupiah, formatDate, getCustomerStampBalance } from '../utils/storage';

interface Props {
  customers: Customer[];
  transactions: Transaction[];
  ledgers: StampLedger[];
  redemptions: Redemption[];
  settings: StoreSettings;
  onNavigate: (tab: string) => void;
  onQuickTransaction: (customer?: Customer) => void;
  onQuickRedeem: (customer: Customer) => void;
  onSelectCustomer: (customer: Customer) => void;
}

export const DashboardView: React.FC<Props> = ({
  customers,
  transactions,
  ledgers,
  redemptions,
  settings,
  onNavigate,
  onQuickTransaction,
  onQuickRedeem,
  onSelectCustomer,
}) => {
  // Calculations
  const activeCustomers = customers.filter(c => c.status === 'active');
  const totalCustomers = activeCustomers.length;

  // Transactions today
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayTransactions = transactions.filter(t => t.createdAt.startsWith(todayStr) && t.status === 'confirmed');
  const todayRevenue = todayTransactions.reduce((sum, t) => sum + t.amount, 0);

  // Total stamps issued all time
  const totalStampsIssued = ledgers
    .filter(l => l.type === 'earn')
    .reduce((sum, l) => sum + l.amount, 0);

  // Customers ready for reward (balance >= 25)
  const customersWithBalance = customers.map(c => ({
    customer: c,
    balance: getCustomerStampBalance(c.id, ledgers),
  }));

  const readyForReward = customersWithBalance.filter(
    item => item.customer.status === 'active' && item.balance >= (settings.rewardRequiredStamps || 25)
  );

  const totalRewardsRedeemed = redemptions.filter(r => r.status === 'completed').length;

  // Recent transactions
  const recentTransactions = [...transactions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="bg-gradient-to-r from-orange-600 via-orange-500 to-amber-600 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
        {/* Background glow circle */}
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-xs text-xs font-semibold text-orange-100 mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{settings.storeName} Loyalty System</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Dashboard Loyalitas {settings.storeName}
            </h1>
            <p className="text-xs sm:text-sm text-orange-100 mt-1 max-w-xl">
              Kelola kartu stempel digital, catat transaksi kasir, dan berikan hadiah {settings.defaultRewardName} per {settings.rewardRequiredStamps || 25} stempel.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => onNavigate('customers')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-white text-xs font-bold transition border border-white/20 shadow-xs"
            >
              <Users className="w-4 h-4" />
              <span>Data Pelanggan</span>
            </button>
            <button
              onClick={() => onQuickTransaction()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-orange-700 hover:bg-orange-50 active:scale-95 text-xs font-bold transition shadow-md"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Input Transaksi</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5 KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Total Pelanggan */}
        <div
          onClick={() => onNavigate('customers')}
          className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-orange-300 transition shadow-xs cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Pelanggan</span>
            <div className="p-1.5 rounded-lg bg-orange-50 text-orange-600 group-hover:bg-orange-100 transition">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-800 tabular-nums">{totalCustomers}</p>
          <span className="text-[11px] text-slate-500 mt-1 block">Pelanggan terdaftar</span>
        </div>

        {/* Transaksi Hari Ini */}
        <div
          onClick={() => onNavigate('transactions')}
          className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-blue-300 transition shadow-xs cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Transaksi Hari Ini</span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-800 tabular-nums">{todayTransactions.length}</p>
          <span className="text-[11px] text-slate-500 mt-1 block truncate">
            {formatRupiah(todayRevenue)}
          </span>
        </div>

        {/* Total Stempel Diberikan */}
        <div
          onClick={() => onNavigate('reports')}
          className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-amber-300 transition shadow-xs cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Stempel Diberikan</span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 group-hover:bg-amber-100 transition">
              <Stamp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-800 tabular-nums">{totalStampsIssued}</p>
          <span className="text-[11px] text-slate-500 mt-1 block">Total stempel keluar</span>
        </div>

        {/* Hadiah Siap Ditukarkan (>= 25) */}
        <div
          onClick={() => onNavigate('rewards')}
          className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-emerald-300 transition shadow-xs cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Siap Tukar Hadiah</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 transition">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-600 tabular-nums">{readyForReward.length}</p>
          <span className="text-[11px] text-emerald-700 font-semibold mt-1 block">
            {readyForReward.length > 0 ? 'Perlu konfirmasi' : 'Semua sudah ditukar'}
          </span>
        </div>

        {/* Hadiah Sudah Ditukarkan */}
        <div
          onClick={() => onNavigate('rewards')}
          className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-purple-300 transition shadow-xs cursor-pointer group col-span-2 sm:col-span-1"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Hadiah Ditukarkan</span>
            <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600 group-hover:bg-purple-100 transition">
              <Gift className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-800 tabular-nums">{totalRewardsRedeemed}</p>
          <span className="text-[11px] text-slate-500 mt-1 block truncate">{settings.defaultRewardName}</span>
        </div>
      </div>

      {/* Two Column Layout: Reward Eligibility Queue & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 cols): Customers ready for reward */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                  <Gift className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800">Pelanggan Siap Tukar Hadiah</h3>
                  <p className="text-[11px] text-slate-500">Saldo mencapai minimal 25 stempel</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 tabular-nums">
                {readyForReward.length}
              </span>
            </div>

            <div className="divide-y divide-slate-100 mt-2">
              {readyForReward.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <Gift className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-300" />
                  <p className="text-xs font-medium text-slate-500">Belum ada pelanggan dengan 25 stempel</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Stempel akan bertambah setiap transaksi Rp20.000</p>
                </div>
              ) : (
                readyForReward.map(({ customer, balance }) => (
                  <div key={customer.id} className="py-3 flex items-center justify-between gap-3">
                    <div
                      onClick={() => onSelectCustomer(customer)}
                      className="cursor-pointer hover:opacity-80 transition"
                    >
                      <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        {customer.name}
                        <span className="font-mono text-[10px] text-slate-400">({customer.customerCode})</span>
                      </p>
                      <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                        {balance} stempel <span className="text-slate-400 font-normal">· Sisa +{balance - 25} jika ditukar</span>
                      </p>
                    </div>

                    <button
                      onClick={() => onQuickRedeem(customer)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition active:scale-95 shadow-xs whitespace-nowrap"
                    >
                      Tukar Hadiah
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <button
              onClick={() => onNavigate('rewards')}
              className="text-xs font-bold text-orange-600 hover:text-orange-700 inline-flex items-center gap-1"
            >
              <span>Lihat Semua Riwayat Penukaran</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right Column (7 cols): Recent Transactions */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-orange-100 text-orange-700">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800">Transaksi Stempel Terbaru</h3>
                  <p className="text-[11px] text-slate-500">Riwayat pencatatan kasir terkini</p>
                </div>
              </div>

              <button
                onClick={() => onNavigate('transactions')}
                className="text-xs font-bold text-orange-600 hover:text-orange-700"
              >
                Lihat Semua
              </button>
            </div>

            <div className="divide-y divide-slate-100 mt-2">
              {recentTransactions.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <Stamp className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-300" />
                  <p className="text-xs font-medium text-slate-500">Belum ada transaksi</p>
                </div>
              ) : (
                recentTransactions.map(trx => (
                  <div key={trx.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800 truncate">
                          {trx.customerName}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {formatDate(trx.createdAt)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {trx.description && trx.description !== 'Transaksi Toko' ? `${trx.description} · ` : ''}{formatRupiah(trx.amount)}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black tabular-nums ${
                        trx.status === 'confirmed'
                          ? 'bg-orange-50 text-orange-700 border border-orange-200'
                          : 'bg-slate-100 text-slate-400 line-through'
                      }`}>
                        <Stamp className="w-3 h-3 text-orange-500" />
                        +{trx.stampEarned} Stempel
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Aturan: 1 Stempel = Kelipatan {formatRupiah(settings.stampThreshold)}</span>
            <button
              onClick={() => onQuickTransaction()}
              className="text-xs font-bold text-orange-600 hover:text-orange-700"
            >
              + Tambah Transaksi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
