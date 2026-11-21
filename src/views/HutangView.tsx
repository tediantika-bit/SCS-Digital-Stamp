import React, { useMemo, useState } from 'react';
import {
  Clock,
  Plus,
  Search,
  CheckCircle2,
  Ban,
  Users,
  User,
  X,
  Banknote,
  QrCode,
  AlertTriangle,
  Receipt,
} from 'lucide-react';
import {
  Customer,
  CustomerDebt,
  StoreSettings,
  TransactionCategory,
} from '../types';
import { formatDate, formatRupiah } from '../utils/storage';
import {
  createConsolidatedDebtReminderWAMessage,
  createDebtCreatedWAMessage,
  createDebtReminderWAMessage,
  createDebtSettledWAMessage,
  sendWhatsAppMessage,
} from '../utils/whatsapp';
import { WhatsAppIcon } from '../components/WhatsAppButton';

interface Props {
  debts: CustomerDebt[];
  customers: Customer[];
  categories: TransactionCategory[];
  settings: StoreSettings;
  onAddDebt: (input: {
    customerId: string;
    customerName: string;
    categoryId: string;
    categoryName: string;
    amount: number;
    description: string;
  }) => CustomerDebt;
  onSettleDebt: (
    debtId: string,
    settledMethod: 'cash' | 'qris'
  ) => CustomerDebt | undefined;
  onCancelDebt: (debtId: string) => void;
}

export const HutangView: React.FC<Props> = ({
  debts,
  customers,
  categories,
  settings,
  onAddDebt,
  onSettleDebt,
  onCancelDebt,
}) => {
  const activeMembers = useMemo(
    () => customers.filter(c => c.status === 'active'),
    [customers]
  );

  const [statusTab, setStatusTab] = useState<'unpaid' | 'history'>('unpaid');
  const [viewMode, setViewMode] = useState<'per_nota' | 'per_pelanggan'>('per_nota');
  const [search, setSearch] = useState('');

  // Create Debt Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    categories[0]?.id || 'cat-1'
  );
  const [rawAmount, setRawAmount] = useState('');
  const [description, setDescription] = useState('');
  const [sendWAOnCreate, setSendWAOnCreate] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Settle Debt Modal State
  const [settlingDebt, setSettlingDebt] = useState<CustomerDebt | null>(null);
  const [settleMethod, setSettleMethod] = useState<'cash' | 'qris'>('cash');
  const [sendWAOnSettle, setSendWAOnSettle] = useState(true);

  // Cancel Debt Modal State
  const [cancellingDebt, setCancellingDebt] = useState<CustomerDebt | null>(null);

  const findCustomer = (debt: CustomerDebt): Customer => {
    return (
      customers.find(
        c =>
          c.id === debt.customerId ||
          c.customerCode === debt.customerId ||
          c.name.toLowerCase().trim() === debt.customerName.toLowerCase().trim()
      ) || {
        id: debt.customerId,
        customerCode: debt.customerId || 'MEMBER',
        name: debt.customerName,
        qrToken: 'scs_member',
        status: 'active',
        createdAt: debt.createdAt,
      }
    );
  };

  const unpaidDebts = useMemo(
    () =>
      debts
        .filter(d => d.status === 'unpaid')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [debts]
  );

  const paidDebts = useMemo(
    () => debts.filter(d => d.status === 'paid'),
    [debts]
  );

  const historyDebts = useMemo(
    () =>
      debts
        .filter(d => d.status === 'paid' || d.status === 'cancelled')
        .sort(
          (a, b) =>
            new Date(b.settledAt || b.createdAt).getTime() -
            new Date(a.settledAt || a.createdAt).getTime()
        ),
    [debts]
  );

  const totalUnpaidAmount = useMemo(
    () => unpaidDebts.reduce((s, d) => s + d.amount, 0),
    [unpaidDebts]
  );

  const uniqueUnpaidMemberCount = useMemo(() => {
    const keys = new Set<string>();
    unpaidDebts.forEach(d => {
      const cust = findCustomer(d);
      keys.add(cust.id || d.customerName);
    });
    return keys.size;
  }, [unpaidDebts, customers]);

  const totalPaidAmount = useMemo(
    () => paidDebts.reduce((s, d) => s + d.amount, 0),
    [paidDebts]
  );

  const filteredUnpaid = useMemo(() => {
    if (!search.trim()) return unpaidDebts;
    const q = search.toLowerCase();
    return unpaidDebts.filter(
      d =>
        d.customerName.toLowerCase().includes(q) ||
        d.debtCode.toLowerCase().includes(q) ||
        d.categoryName.toLowerCase().includes(q) ||
        (d.description && d.description.toLowerCase().includes(q))
    );
  }, [unpaidDebts, search]);

  const filteredHistory = useMemo(() => {
    if (!search.trim()) return historyDebts;
    const q = search.toLowerCase();
    return historyDebts.filter(
      d =>
        d.customerName.toLowerCase().includes(q) ||
        d.debtCode.toLowerCase().includes(q) ||
        d.categoryName.toLowerCase().includes(q) ||
        (d.description && d.description.toLowerCase().includes(q))
    );
  }, [historyDebts, search]);

  const groupedUnpaidByCustomer = useMemo(() => {
    const map = new Map<
      string,
      {
        customer: Customer;
        debts: CustomerDebt[];
        totalAmount: number;
      }
    >();

    filteredUnpaid.forEach(debt => {
      const cust = findCustomer(debt);
      const key = cust.id || debt.customerName;
      const existing = map.get(key);
      if (existing) {
        existing.debts.push(debt);
        existing.totalAmount += debt.amount;
      } else {
        map.set(key, {
          customer: cust,
          debts: [debt],
          totalAmount: debt.amount,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [filteredUnpaid, customers]);

  // Add Debt Modal calculations
  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return activeMembers;
    const q = memberSearch.toLowerCase();
    return activeMembers.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        c.customerCode.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(memberSearch))
    );
  }, [activeMembers, memberSearch]);

  const selectedMember = activeMembers.find(c => c.id === selectedMemberId) || null;
  const activeCategories = useMemo(
    () => categories.filter(c => c.status === 'active'),
    [categories]
  );
  const selectedCategory =
    activeCategories.find(c => c.id === selectedCategoryId) || activeCategories[0];
  const numericAmount = parseInt(rawAmount.replace(/\D/g, ''), 10) || 0;

  const openAddModal = () => {
    const firstMember = activeMembers[0] || null;
    setMemberSearch('');
    setSelectedMemberId(firstMember?.id || '');
    setSelectedCategoryId(activeCategories[0]?.id || 'cat-1');
    setRawAmount('');
    setDescription('');
    setSendWAOnCreate(Boolean(firstMember?.phone));
    setFormError(null);
    setIsAddOpen(true);
  };

  const handleSelectMember = (member: Customer) => {
    setSelectedMemberId(member.id);
    setSendWAOnCreate(Boolean(member.phone));
    setFormError(null);
  };

  const handleQuickAddAmount = (amt: number) => {
    const cur = parseInt(rawAmount.replace(/\D/g, ''), 10) || 0;
    setRawAmount((cur + amt).toLocaleString('id-ID'));
    setFormError(null);
  };

  const handleCreateDebt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) {
      setFormError('Pilih member terlebih dahulu.');
      return;
    }
    if (numericAmount <= 0) {
      setFormError('Nominal hutang harus lebih dari Rp0.');
      return;
    }

    const catId = selectedCategory?.id || 'cat-1';
    const catName = selectedCategory?.name || 'Transaksi Toko';
    const descText = description.trim() ? `${catName} - ${description.trim()}` : catName;

    const createdDebt = onAddDebt({
      customerId: selectedMember.id,
      customerName: selectedMember.name,
      categoryId: catId,
      categoryName: catName,
      amount: numericAmount,
      description: descText,
    });

    if (sendWAOnCreate) {
      const msg = createDebtCreatedWAMessage(
        selectedMember,
        createdDebt,
        settings
      );
      sendWhatsAppMessage(selectedMember.phone, msg);
    }

    setIsAddOpen(false);
  };

  const handleConfirmSettle = () => {
    if (!settlingDebt) return;
    const settled = onSettleDebt(settlingDebt.id, settleMethod);

    if (sendWAOnSettle && settled) {
      const cust = findCustomer(settlingDebt);
      const msg = createDebtSettledWAMessage(cust, settled, settings);
      sendWhatsAppMessage(cust.phone, msg);
    }

    setSettlingDebt(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Clock className="w-6 h-6 text-amber-600 shrink-0" />
            <span>Catatan Hutang Member</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Khusus member terdaftar · Pencatatan tagihan terpisah tanpa perolehan stempel
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-md shadow-amber-600/20 active:scale-95 whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Catat Hutang Baru</span>
        </button>
      </div>

      {/* 3 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Total Piutang Belum Lunas
            </span>
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-amber-700 tabular-nums">
            {formatRupiah(totalUnpaidAmount)}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block tabular-nums">
            {unpaidDebts.length} nota belum lunas
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Member Punya Hutang
            </span>
            <Users className="w-4 h-4 text-slate-500 shrink-0" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 tabular-nums">
            {uniqueUnpaidMemberCount}{' '}
            <span className="text-xs font-normal text-slate-400">member</span>
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Memiliki tagihan belum lunas · Tanpa stempel
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Total Sudah Lunas
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-600 tabular-nums">
            {formatRupiah(totalPaidAmount)}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block tabular-nums">
            {paidDebts.length} nota telah dilunasi
          </span>
        </div>
      </div>

      {/* Filter Tabs & Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status Tab */}
          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-xl shrink-0">
            <button
              type="button"
              onClick={() => setStatusTab('unpaid')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap shrink-0 ${
                statusTab === 'unpaid'
                  ? 'bg-white text-amber-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Belum Lunas ({unpaidDebts.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusTab('history')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap shrink-0 ${
                statusTab === 'history'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Riwayat Lunas &amp; Batal ({historyDebts.length})
            </button>
          </div>

          {/* Per Nota vs Rekap per Pelanggan (for Belum Lunas) */}
          {statusTab === 'unpaid' && (
            <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-xl shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('per_nota')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap shrink-0 ${
                  viewMode === 'per_nota'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Per Nota ({filteredUnpaid.length})
              </button>
              <button
                type="button"
                onClick={() => setViewMode('per_pelanggan')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap shrink-0 ${
                  viewMode === 'per_pelanggan'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Rekap per Pelanggan ({groupedUnpaidByCustomer.length})
              </button>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="relative w-full lg:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari nama member, kode HTG, atau layanan..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
        </div>
      </div>

      {/* Main Content Table */}
      {statusTab === 'unpaid' ? (
        viewMode === 'per_pelanggan' ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Member</th>
                    <th className="px-4 py-3">Daftar Nota</th>
                    <th className="px-4 py-3 text-right">Total Tagihan</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {groupedUnpaidByCustomer.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-12 text-center text-slate-400">
                        <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-300" />
                        <p className="font-semibold text-slate-700">
                          {unpaidDebts.length === 0
                            ? 'Tidak ada hutang member yang belum lunas'
                            : 'Tidak ada data hutang yang cocok dengan pencarian'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    groupedUnpaidByCustomer.map(group => (
                      <tr key={group.customer.id} className="hover:bg-slate-50/80 transition">
                        <td className="px-4 py-3">
                          <span className="font-bold text-slate-900 block">
                            {group.customer.name}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {group.customer.customerCode}
                            {group.customer.phone
                              ? ` · ${group.customer.phone}`
                              : ' · Belum ada No WA'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-slate-800 block tabular-nums">
                            {group.debts.length} nota belum lunas
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono truncate block max-w-xs">
                            {group.debts.map(d => d.debtCode).join(', ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-black text-amber-700 tabular-nums whitespace-nowrap">
                          {formatRupiah(group.totalAmount)}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              const msg = createConsolidatedDebtReminderWAMessage(
                                group.customer,
                                group.debts,
                                settings
                              );
                              sendWhatsAppMessage(group.customer.phone, msg);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition shadow-xs active:scale-95 whitespace-nowrap shrink-0"
                          >
                            <WhatsAppIcon className="w-3.5 h-3.5 text-white" />
                            <span>Tagih Total via WA</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Kode &amp; Tanggal</th>
                    <th className="px-4 py-3">Member</th>
                    <th className="px-4 py-3">Layanan &amp; Keterangan</th>
                    <th className="px-4 py-3 text-right">Nominal Tagihan</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUnpaid.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                        <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-300" />
                        <p className="font-semibold text-slate-700">
                          {unpaidDebts.length === 0
                            ? 'Belum ada catatan hutang aktif'
                            : 'Tidak ada catatan hutang yang cocok dengan pencarian'}
                        </p>
                        {unpaidDebts.length === 0 && (
                          <button
                            type="button"
                            onClick={openAddModal}
                            className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-xs"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Catat Hutang Member Pertama</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredUnpaid.map(debt => {
                      const cust = findCustomer(debt);
                      return (
                        <tr key={debt.id} className="hover:bg-slate-50/80 transition">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="font-mono font-bold text-slate-800 block">
                              {debt.debtCode}
                            </span>
                            <span className="text-[10px] text-slate-400 tabular-nums">
                              {formatDate(debt.createdAt)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-bold text-slate-900 block">
                              {debt.customerName}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {cust.customerCode}
                              {cust.phone ? ` · ${cust.phone}` : ''}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-slate-700 font-medium block max-w-xs truncate">
                              {debt.description || debt.categoryName || 'Transaksi Toko'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-black text-amber-700 tabular-nums whitespace-nowrap">
                            {formatRupiah(debt.amount)}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  const msg = createDebtReminderWAMessage(cust, debt, settings);
                                  sendWhatsAppMessage(cust.phone, msg);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold transition whitespace-nowrap shrink-0"
                                title="Kirim pengingat tagihan via WhatsApp"
                              >
                                <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Ingatkan WA</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setSettlingDebt(debt);
                                  setSettleMethod('cash');
                                  setSendWAOnSettle(Boolean(cust.phone));
                                }}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition shadow-xs active:scale-95 whitespace-nowrap shrink-0"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Lunasi</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setCancellingDebt(debt)}
                                className="px-2 py-1.5 rounded-lg text-[11px] font-semibold text-rose-600 hover:bg-rose-50 transition whitespace-nowrap shrink-0"
                                title="Batalkan catatan hutang"
                              >
                                Batalkan
                              </button>
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
        )
      ) : (
        /* History Tab (Paid & Cancelled) */
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                <tr>
                  <th className="px-4 py-3">Kode &amp; Waktu Catat</th>
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Layanan &amp; Keterangan</th>
                  <th className="px-4 py-3 text-right">Nominal</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                      <Receipt className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="font-semibold text-slate-700">
                        Belum ada riwayat hutang lunas atau dibatalkan
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map(debt => {
                    const isPaid = debt.status === 'paid';
                    return (
                      <tr key={debt.id} className="hover:bg-slate-50/80 transition">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-mono font-bold text-slate-800 block">
                            {debt.debtCode}
                          </span>
                          <span className="text-[10px] text-slate-400 tabular-nums">
                            {formatDate(debt.createdAt)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-bold text-slate-900 block">
                            {debt.customerName}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {debt.customerId}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-slate-700 font-medium block max-w-xs truncate">
                            {debt.description || debt.categoryName || 'Transaksi Toko'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <span className="font-black text-slate-800 tabular-nums block">
                            {formatRupiah(debt.amount)}
                          </span>
                          {isPaid && debt.settledMethod && (
                            <span
                              className={`text-[10px] font-semibold ${
                                debt.settledMethod === 'qris'
                                  ? 'text-blue-600'
                                  : 'text-emerald-700'
                              }`}
                            >
                              {debt.settledMethod === 'qris' ? 'Lunas via QRIS' : 'Lunas via Cash'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          {isPaid ? (
                            <span className="text-[11px] font-bold text-emerald-700 block">
                              Lunas
                              {debt.settledAt && (
                                <span className="block text-[10px] font-normal text-slate-400 tabular-nums">
                                  {formatDate(debt.settledAt)}
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                              <Ban className="w-3 h-3" />
                              Dibatalkan
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Catat Hutang Baru Member */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-xl max-h-[92vh] flex flex-col rounded-3xl bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="shrink-0 bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-white/20 backdrop-blur-xs">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">
                    Catat Hutang Member Baru
                  </h3>
                  <p className="text-xs text-amber-100">
                    Khusus member terdaftar · Catatan hutang tidak memperoleh stempel
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="p-1 rounded-lg text-amber-100 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDebt} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
                {/* 1. Pilih Member */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      1. Pilih Member Aktif
                    </label>
                    <span className="text-[11px] text-slate-500">
                      {activeMembers.length} member terdaftar
                    </span>
                  </div>

                  <div className="relative mb-2">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Cari nama member, kode ID, atau nomor HP..."
                      value={memberSearch}
                      onChange={e => setMemberSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                  </div>

                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 border border-slate-200/80 rounded-2xl p-2 bg-slate-50/70">
                    {filteredMembers.length === 0 ? (
                      <div className="py-5 text-center text-slate-400 text-xs">
                        <User className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                        <p className="font-semibold text-slate-600">
                          {activeMembers.length === 0
                            ? 'Belum ada member terdaftar'
                            : 'Member tidak ditemukan'}
                        </p>
                        {activeMembers.length === 0 && (
                          <p className="text-[11px] mt-0.5">
                            Daftarkan member di tab Pelanggan terlebih dahulu.
                          </p>
                        )}
                      </div>
                    ) : (
                      filteredMembers.map(m => {
                        const isSel = m.id === selectedMemberId;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => handleSelectMember(m)}
                            className={`w-full px-3 py-2 rounded-xl border text-left transition flex items-center justify-between ${
                              isSel
                                ? 'bg-amber-50 border-amber-500 ring-1 ring-amber-400/50'
                                : 'bg-white border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <p
                                className={`text-xs font-bold truncate ${
                                  isSel ? 'text-amber-950' : 'text-slate-800'
                                }`}
                              >
                                {m.name}
                              </p>
                              <p className="text-[10px] text-slate-500 truncate font-mono">
                                {m.customerCode}
                                {m.phone ? ` · ${m.phone}` : ''}
                              </p>
                            </div>
                            {isSel && (
                              <span className="text-[11px] font-bold text-amber-700 shrink-0">
                                Terpilih
                              </span>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* 2. Kategori Layanan */}
                {activeCategories.length > 0 && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      2. Kategori Layanan
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {activeCategories.map(cat => {
                        const isSel = cat.id === selectedCategory?.id;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setSelectedCategoryId(cat.id)}
                            className={`px-2.5 py-2 rounded-xl border text-xs font-bold transition text-left truncate ${
                              isSel
                                ? 'bg-amber-600 border-amber-600 text-white shadow-xs'
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

                {/* 3. Nominal Hutang */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      3. Nominal Hutang (Rp)
                    </label>
                    <span className="text-[11px] font-medium text-slate-500">
                      Tanpa perolehan stempel
                    </span>
                  </div>

                  <div className="relative">
                    <span className="absolute left-3.5 top-3 text-slate-400 font-bold text-sm">
                      Rp
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="0"
                      value={rawAmount}
                      onChange={e => {
                        const v = e.target.value.replace(/\D/g, '');
                        setRawAmount(v ? parseInt(v, 10).toLocaleString('id-ID') : '');
                        setFormError(null);
                      }}
                      className="w-full pl-11 pr-4 py-2.5 text-lg font-bold text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 tabular-nums"
                    />
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {[20000, 30000, 45000, 60000, 100000, 200000].map(amt => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => handleQuickAddAmount(amt)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[11px] font-semibold text-slate-700 transition"
                      >
                        +{amt >= 1000000 ? `${amt / 1000000}jt` : `${amt / 1000}rb`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Keterangan */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Keterangan Tambahan (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Fotocopy 200 lembar / Token listrik 100rb"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                {/* WA Checkbox */}
                <label className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between cursor-pointer select-none">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-950">
                    <WhatsAppIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Kirim Info Catatan Hutang via WA</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={sendWAOnCreate}
                    onChange={e => setSendWAOnCreate(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                  />
                </label>

                {formError && (
                  <p className="text-xs font-semibold text-rose-600">{formError}</p>
                )}
              </div>

              <div className="shrink-0 px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!selectedMember || numericAmount <= 0}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-amber-600/20 active:scale-95 transition"
                >
                  <Clock className="w-4 h-4" />
                  <span>Simpan Catatan Hutang</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Pelunasan Hutang */}
      {settlingDebt && (
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
                    {settlingDebt.customerName} · {settlingDebt.debtCode}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSettlingDebt(null)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase">
                    Total Tagihan Lunas
                  </p>
                  <p className="text-xl font-black text-slate-900 tabular-nums mt-0.5">
                    {formatRupiah(settlingDebt.amount)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase">
                    Status Pelunasan
                  </p>
                  <p className="text-xs font-bold text-slate-700 mt-1">
                    Sekali bayar lunas · Tanpa stempel
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
                    <div
                      className={`p-1.5 rounded-lg shrink-0 ${
                        settleMethod === 'cash'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      <Banknote className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold leading-tight">Cash (Tunai)</p>
                      <p className="text-[10px] text-slate-500 truncate">Pembayaran tunai</p>
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
                    <div
                      className={`p-1.5 rounded-lg shrink-0 ${
                        settleMethod === 'qris'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      <QrCode className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold leading-tight">QRIS</p>
                      <p className="text-[10px] text-slate-500 truncate">Pembayaran non-tunai</p>
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
                  onClick={() => setSettlingDebt(null)}
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

      {/* Modal: Batalkan Catatan Hutang */}
      {cancellingDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 rounded-2xl bg-rose-50 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">Batalkan Hutang?</h3>
                <p className="text-xs text-slate-500">
                  {cancellingDebt.debtCode} · {formatRupiah(cancellingDebt.amount)}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Catatan hutang milik <strong>{cancellingDebt.customerName}</strong> sebesar{' '}
              <strong>{formatRupiah(cancellingDebt.amount)}</strong> akan ditandai batal dan
              dipindahkan ke riwayat.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancellingDebt(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={() => {
                  onCancelDebt(cancellingDebt.id);
                  setCancellingDebt(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition"
              >
                Ya, Batalkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
