import React, { useState } from 'react';
import { Users, Search, UserPlus, QrCode, Stamp, Gift, Phone, Calendar, ArrowRight, Eye, Edit2, CheckCircle2, XCircle, ExternalLink, Copy, Check } from 'lucide-react';
import { Customer, StampLedger, Transaction, StoreSettings } from '../types';
import { getCustomerStampBalance, formatDate, formatRupiah } from '../utils/storage';
import { StampCard } from '../components/StampCard';
import { WhatsAppButton } from '../components/WhatsAppButton';
import { createBalanceInquiryWAMessage, sendWhatsAppMessage } from '../utils/whatsapp';

interface Props {
  customers: Customer[];
  ledgers: StampLedger[];
  transactions: Transaction[];
  settings: StoreSettings;
  onAddCustomer: () => void;
  onEditCustomer: (customer: Customer) => void;
  onNewTransaction: (customer: Customer) => void;
  onRedeemReward: (customer: Customer) => void;
  selectedCustomer: Customer | null;
  onSelectCustomer: (customer: Customer | null) => void;
  onViewPublicCard: (qrToken: string) => void;
}

export const CustomersView: React.FC<Props> = ({
  customers,
  ledgers,
  transactions,
  settings,
  onAddCustomer,
  onEditCustomer,
  onNewTransaction,
  onRedeemReward,
  selectedCustomer,
  onSelectCustomer,
  onViewPublicCard,
}) => {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'reward_ready'>('all');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const customerItems = customers.map(c => {
    const balance = getCustomerStampBalance(c.id, ledgers);
    return {
      ...c,
      balance,
      isRewardReady: balance >= (settings.rewardRequiredStamps || 25),
    };
  });

  const filtered = customerItems.filter(c => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.customerCode.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone && c.phone.includes(search));

    if (!matchesSearch) return false;

    if (filterStatus === 'active') return c.status === 'active';
    if (filterStatus === 'reward_ready') return c.isRewardReady && c.status === 'active';
    return true;
  });

  const copyCustomerPublicLink = (qrToken: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const publicUrl = `${origin}/#card=${qrToken}`;
    navigator.clipboard.writeText(publicUrl).then(() => {
      setCopiedToken(qrToken);
      setTimeout(() => setCopiedToken(null), 2000);
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Manajemen Pelanggan
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar pelanggan kartu stempel {settings.storeName} dan status stempel
          </p>
        </div>

        <button
          onClick={onAddCustomer}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition shadow-md shadow-orange-600/20 active:scale-95"
        >
          <UserPlus className="w-4 h-4" />
          <span>Tambah Pelanggan</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari nama, ID pelanggan, atau No HP..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
          />
        </div>

        {/* Segmented Filter Buttons */}
        <div className="flex items-center gap-1 w-full sm:w-auto p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              filterStatus === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Semua ({customerItems.length})
          </button>
          <button
            onClick={() => setFilterStatus('reward_ready')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              filterStatus === 'reward_ready'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Siap Hadiah ({customerItems.filter(c => c.isRewardReady).length})
          </button>
          <button
            onClick={() => setFilterStatus('active')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              filterStatus === 'active'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Aktif
          </button>
        </div>
      </div>

      {/* Customer List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-3xl border border-slate-200/80">
            <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">Tidak ada pelanggan ditemukan</p>
            <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau tambah pelanggan baru</p>
          </div>
        ) : (
          filtered.map(customer => {
            const progress = Math.min(100, Math.round((customer.balance / 25) * 100));

            return (
              <div
                key={customer.id}
                className={`bg-white rounded-3xl border p-5 transition-all shadow-xs flex flex-col justify-between hover:shadow-md ${
                  customer.isRewardReady
                    ? 'border-emerald-300 ring-1 ring-emerald-200/60'
                    : 'border-slate-200/80 hover:border-orange-300'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                          {customer.customerCode}
                        </span>
                        {customer.status === 'inactive' && (
                          <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                            Nonaktif
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-base text-slate-900 mt-1.5 leading-snug">
                        {customer.name}
                      </h3>
                      {customer.phone && (
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{customer.phone}</span>
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <WhatsAppButton
                        variant="icon"
                        onClick={() => {
                          const msg = createBalanceInquiryWAMessage(customer, customer.balance, settings);
                          sendWhatsAppMessage(customer.phone, msg);
                        }}
                        title={`Kirim Info Saldo ke WhatsApp ${customer.name}`}
                      />
                      <button
                        onClick={() => onEditCustomer(customer)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                        title="Edit data pelanggan"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => copyCustomerPublicLink(customer.qrToken, e)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                        title="Salin link kartu digital publik"
                      >
                        {copiedToken === customer.qrToken ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Stamp Balance Box */}
                  <div className="mt-4 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-semibold text-slate-600 flex items-center gap-1">
                        <Stamp className="w-3.5 h-3.5 text-orange-600" />
                        Saldo Stempel:
                      </span>
                      <span className="font-extrabold text-sm text-slate-800 tabular-nums">
                        {customer.balance} <span className="text-[11px] font-normal text-slate-400">/ 25</span>
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          customer.isRewardReady
                            ? 'bg-emerald-500'
                            : 'bg-orange-500'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[11px]">
                      {customer.isRewardReady ? (
                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                          <Gift className="w-3 h-3 text-emerald-600" />
                          Siap Tukar Minyak Goreng!
                        </span>
                      ) : (
                        <span className="text-slate-500">
                          Kurang {25 - customer.balance} stempel lagi
                        </span>
                      )}
                      <span className="text-slate-400 font-mono text-[10px]">
                        {progress}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                  <button
                    onClick={() => onSelectCustomer(customer)}
                    className="flex-1 py-2 px-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Lihat Kartu</span>
                  </button>

                  {customer.isRewardReady ? (
                    <button
                      onClick={() => onRedeemReward(customer)}
                      className="flex-1 py-2 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition active:scale-95"
                    >
                      <Gift className="w-3.5 h-3.5" />
                      <span>Tukar Hadiah</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => onNewTransaction(customer)}
                      className="flex-1 py-2 px-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition active:scale-95"
                    >
                      <Stamp className="w-3.5 h-3.5" />
                      <span>+ Stempel</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Detail Customer Modal (Full 25-stamp card & customer history) */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden my-6">
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">{selectedCustomer.name}</h3>
                <p className="text-xs text-slate-400">
                  {selectedCustomer.customerCode} {selectedCustomer.phone ? `· ${selectedCustomer.phone}` : ''}
                </p>
              </div>
              <button
                onClick={() => onSelectCustomer(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            <div className="p-5 max-h-[80vh] overflow-y-auto space-y-5">
              {/* The 25-Stamp Digital Card */}
              <StampCard
                customer={selectedCustomer}
                currentBalance={getCustomerStampBalance(selectedCustomer.id, ledgers)}
                settings={settings}
                canRedeem={getCustomerStampBalance(selectedCustomer.id, ledgers) >= 25}
                onRedeemClick={() => {
                  onSelectCustomer(null);
                  onRedeemReward(selectedCustomer);
                }}
              />

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center gap-2">
                <WhatsAppButton
                  onClick={() => {
                    const bal = getCustomerStampBalance(selectedCustomer.id, ledgers);
                    const msg = createBalanceInquiryWAMessage(selectedCustomer, bal, settings);
                    sendWhatsAppMessage(selectedCustomer.phone, msg);
                  }}
                  label="Kirim Saldo WA"
                  size="md"
                  className="py-2.5 px-3.5"
                />

                <button
                  onClick={() => {
                    onSelectCustomer(null);
                    onNewTransaction(selectedCustomer);
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition active:scale-95"
                >
                  <Stamp className="w-4 h-4" />
                  <span>Input Transaksi Baru</span>
                </button>

                <button
                  onClick={() => {
                    onViewPublicCard(selectedCustomer.qrToken);
                    onSelectCustomer(null);
                  }}
                  className="py-2.5 px-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <ExternalLink className="w-4 h-4 text-orange-600" />
                  <span>Buka Kartu</span>
                </button>
              </div>

              {/* Transaction & Stamp History Tabs */}
              <div>
                <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider mb-2">
                  Riwayat Stempel Pelanggan
                </h4>

                <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 overflow-hidden text-xs">
                  {ledgers
                    .filter(l => l.customerId === selectedCustomer.id)
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map(item => (
                      <div key={item.id} className="p-3 flex items-center justify-between gap-2 bg-white">
                        <div>
                          <p className="font-semibold text-slate-800">{item.description}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{formatDate(item.createdAt)}</p>
                        </div>
                        <div className="text-right">
                          <span
                            className={`font-black tabular-nums text-xs ${
                              item.amount > 0 ? 'text-orange-600' : 'text-emerald-600'
                            }`}
                          >
                            {item.amount > 0 ? `+${item.amount}` : item.amount} Stempel
                          </span>
                          <p className="text-[10px] text-slate-400">Saldo: {item.balanceAfter}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
