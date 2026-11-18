import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  Plus,
  Minus,
  Search,
  Download,
  Trash2,
  X,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  QrCode,
  AlertTriangle,
  Calendar,
  Clock,
  CheckCircle2,
  Banknote,
  Stamp,
} from 'lucide-react';
import { CashBookEntry, CashBookEntryType, Transaction, StoreSettings, Customer, StampLedger } from '../types';
import { formatRupiah, formatDate, getCustomerStampBalance } from '../utils/storage';
import {
  createDebtReminderWAMessage,
  createConsolidatedDebtReminderWAMessage,
  createTransactionWAMessage,
  sendWhatsAppMessage,
} from '../utils/whatsapp';
import { WhatsAppIcon } from '../components/WhatsAppButton';

interface Props {
  entries: CashBookEntry[];
  transactions: Transaction[];
  customers?: Customer[];
  ledgers?: StampLedger[];
  settings: StoreSettings;
  onAddEntry: (input: {
    type: CashBookEntryType;
    category: string;
    description: string;
    amount: number;
    date: string;
  }) => void;
  onDeleteEntry: (entryId: string) => void;
  onSettleDebt?: (
    transactionId: string,
    settledMethod: 'cash' | 'qris'
  ) => { transaction: Transaction; newBalance: number } | void;
}

const IN_CATEGORIES = [
  'Penjualan Tunai (Non-Stempel)',
  'Saldo Awal Laci',
  'Tambah Modal Tunai',
  'Pendapatan Lainnya',
];

const OUT_CATEGORIES = [
  'Belanja Kertas / ATK',
  'Tinta / Toner / Servis',
  'Isi Saldo PPOB / Bank',
  'Tarik Tunai Pelanggan',
  'Stok Hadiah Stempel',
  'Listrik / Internet / Sewa',
  'Ambil Uang Pribadi',
  'Pengeluaran Lainnya',
];

function toLocalDateTimeInput(isoOrDate: Date | string): string {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const BukuKasView: React.FC<Props> = ({
  entries,
  transactions,
  customers = [],
  ledgers = [],
  settings,
  onAddEntry,
  onDeleteEntry,
  onSettleDebt,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'kas' | 'hutang'>('kas');
  const [periodFilter, setPeriodFilter] = useState<'today' | 'month' | 'all' | 'custom'>('all');
  const [customDate, setCustomDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [typeFilter, setTypeFilter] = useState<'all' | 'in' | 'out'>('all');
  const [search, setSearch] = useState('');
  const [debtSearch, setDebtSearch] = useState('');
  const [debtViewMode, setDebtViewMode] = useState<'per_nota' | 'per_pelanggan'>('per_nota');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Add Entry Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [entryType, setEntryType] = useState<CashBookEntryType>('in');
  const [category, setCategory] = useState<string>(IN_CATEGORIES[0]);
  const [rawAmount, setRawAmount] = useState('');
  const [description, setDescription] = useState('');
  const [entryDate, setEntryDate] = useState<string>(() => toLocalDateTimeInput(new Date()));
  const [formError, setFormError] = useState<string | null>(null);

  // Delete confirmation modal
  const [deletingEntry, setDeletingEntry] = useState<CashBookEntry | null>(null);

  // Debt settlement modal
  const [settlingTrx, setSettlingTrx] = useState<Transaction | null>(null);
  const [settleMethod, setSettleMethod] = useState<'cash' | 'qris'>('cash');
  const [sendWAOnSettle, setSendWAOnSettle] = useState(true);

  const todayPrefix = useMemo(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }, []);

  const monthPrefix = todayPrefix.slice(0, 7);

  // Helper to get YYYY-MM-DD in local time for any ISO date
  const getLocalDateKey = (iso: string): string => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso.slice(0, 10);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  // 1. Compute chronological running balance across ALL cash book entries
  const entriesWithBalance = useMemo(() => {
    const chronological = [...entries].sort((a, b) => {
      const diff = new Date(a.date || a.createdAt).getTime() - new Date(b.date || b.createdAt).getTime();
      if (diff !== 0) return diff;
      return a.createdAt.localeCompare(b.createdAt);
    });

    let running = 0;
    return chronological.map(item => {
      running += item.type === 'in' ? item.amount : -item.amount;
      return {
        ...item,
        runningBalance: running,
      };
    });
  }, [entries]);

  // All-time cash drawer balance
  const currentCashBalance = useMemo(() => {
    return entries.reduce((sum, e) => sum + (e.type === 'in' ? e.amount : -e.amount), 0);
  }, [entries]);

  // 2. Apply Period Filter for Summary Cards & Table
  const matchesPeriod = (iso: string): boolean => {
    const localDay = getLocalDateKey(iso);
    if (periodFilter === 'today') return localDay === todayPrefix;
    if (periodFilter === 'month') return localDay.startsWith(monthPrefix);
    if (periodFilter === 'custom') return localDay === customDate;
    return true;
  };

  const periodEntries = useMemo(
    () => entriesWithBalance.filter(e => matchesPeriod(e.date || e.createdAt)),
    [entriesWithBalance, periodFilter, customDate, todayPrefix, monthPrefix]
  );

  const periodCashIn = useMemo(
    () => periodEntries.filter(e => e.type === 'in').reduce((s, e) => s + e.amount, 0),
    [periodEntries]
  );

  const periodCashOut = useMemo(
    () => periodEntries.filter(e => e.type === 'out').reduce((s, e) => s + e.amount, 0),
    [periodEntries]
  );

  const isQrisRevenue = (t: Transaction) =>
    t.status === 'confirmed' &&
    (t.paymentMethod === 'qris' ||
      (t.paymentMethod === 'hutang' && t.paymentStatus === 'paid' && t.settledMethod === 'qris'));

  const periodQrisTotal = useMemo(() => {
    return transactions
      .filter(t => isQrisRevenue(t) && matchesPeriod(t.settledAt || t.createdAt))
      .reduce((s, t) => s + t.amount, 0);
  }, [transactions, periodFilter, customDate, todayPrefix, monthPrefix]);

  const periodQrisCount = useMemo(() => {
    return transactions.filter(
      t => isQrisRevenue(t) && matchesPeriod(t.settledAt || t.createdAt)
    ).length;
  }, [transactions, periodFilter, customDate, todayPrefix, monthPrefix]);

  // Unpaid customer debts (Hutang)
  const unpaidDebts = useMemo(() => {
    return transactions.filter(
      t =>
        t.status === 'confirmed' &&
        (t.paymentStatus === 'unpaid' || (t.paymentMethod === 'hutang' && t.paymentStatus !== 'paid'))
    );
  }, [transactions]);

  const totalUnpaidAmount = useMemo(
    () => unpaidDebts.reduce((s, t) => s + t.amount, 0),
    [unpaidDebts]
  );

  const totalHeldStamps = useMemo(
    () => unpaidDebts.reduce((s, t) => s + (t.pendingStamps || 0), 0),
    [unpaidDebts]
  );

  const filteredDebts = useMemo(() => {
    if (!debtSearch.trim()) return unpaidDebts;
    const q = debtSearch.toLowerCase();
    return unpaidDebts.filter(
      t =>
        t.customerName.toLowerCase().includes(q) ||
        t.transactionCode.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q))
    );
  }, [unpaidDebts, debtSearch]);

  const groupedDebtsByCustomer = useMemo(() => {
    const map = new Map<
      string,
      {
        customer: Customer;
        transactions: Transaction[];
        totalAmount: number;
        totalHeld: number;
      }
    >();

    filteredDebts.forEach(trx => {
      const key = trx.customerId || trx.customerName;
      const existing = map.get(key);
      if (existing) {
        existing.transactions.push(trx);
        existing.totalAmount += trx.amount;
        existing.totalHeld += trx.pendingStamps || 0;
      } else {
        const cust =
          customers.find(c => c.id === trx.customerId || c.customerCode === trx.customerId) || {
            id: trx.customerId,
            name: trx.customerName,
            customerCode: trx.customerId || 'MEMBER',
            qrToken: 'scs_member',
            status: 'active',
            createdAt: trx.createdAt,
          };
        map.set(key, {
          customer: cust,
          transactions: [trx],
          totalAmount: trx.amount,
          totalHeld: trx.pendingStamps || 0,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [filteredDebts, customers]);

  const findCustomerForTrx = (trx: Transaction): Customer => {
    return (
      customers.find(c => c.id === trx.customerId || c.customerCode === trx.customerId) || {
        id: trx.customerId,
        name: trx.customerName,
        customerCode: trx.customerId || 'MEMBER',
        qrToken: 'scs_member',
        status: 'active',
        createdAt: trx.createdAt,
      }
    );
  };

  const handleSendReminderWA = (trx: Transaction) => {
    const cust = findCustomerForTrx(trx);
    const msg = createDebtReminderWAMessage(cust, trx, settings);
    sendWhatsAppMessage(cust.phone, msg);
  };

  const handleSendConsolidatedReminderWA = (customer: Customer, trxs: Transaction[]) => {
    const msg = createConsolidatedDebtReminderWAMessage(customer, trxs, settings);
    sendWhatsAppMessage(customer.phone, msg);
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

  // 3. Apply Type & Search Filter + Display Sort Order
  const displayedEntries = useMemo(() => {
    const filtered = periodEntries.filter(e => {
      if (typeFilter !== 'all' && e.type !== typeFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hit =
          e.entryCode.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });

    return sortOrder === 'desc' ? [...filtered].reverse() : filtered;
  }, [periodEntries, typeFilter, search, sortOrder]);

  const openAddModal = (defaultType: CashBookEntryType) => {
    setEntryType(defaultType);
    setCategory(defaultType === 'in' ? IN_CATEGORIES[0] : OUT_CATEGORIES[0]);
    setRawAmount('');
    setDescription('');
    setEntryDate(toLocalDateTimeInput(new Date()));
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleTypeSwitch = (nextType: CashBookEntryType) => {
    setEntryType(nextType);
    setCategory(nextType === 'in' ? IN_CATEGORIES[0] : OUT_CATEGORIES[0]);
    setFormError(null);
  };

  const handleQuickAddAmount = (amt: number) => {
    const cur = parseInt(rawAmount.replace(/\D/g, ''), 10) || 0;
    setRawAmount((cur + amt).toLocaleString('id-ID'));
    setFormError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseInt(rawAmount.replace(/\D/g, ''), 10) || 0;
    if (numericAmount <= 0) {
      setFormError('Nominal harus lebih dari Rp0.');
      return;
    }

    const parsedDate = entryDate ? new Date(entryDate) : new Date();
    const isoDate = isNaN(parsedDate.getTime()) ? new Date().toISOString() : parsedDate.toISOString();

    onAddEntry({
      type: entryType,
      category: category.trim() || (entryType === 'in' ? 'Pendapatan Lainnya' : 'Pengeluaran Lainnya'),
      description: description.trim() || category,
      amount: numericAmount,
      date: isoDate,
    });

    setIsModalOpen(false);
  };

  const handleExportCSV = () => {
    const rows = [
      ['Kode Kas', 'Waktu', 'Jenis', 'Kategori', 'Keterangan', 'Masuk (Rp)', 'Keluar (Rp)', 'Saldo (Rp)'],
      ...displayedEntries.map(e => [
        e.entryCode,
        formatDate(e.date || e.createdAt),
        e.type === 'in' ? 'Masuk' : 'Keluar',
        e.category,
        `"${(e.description || '').replace(/"/g, '""')}"`,
        e.type === 'in' ? e.amount : 0,
        e.type === 'out' ? e.amount : 0,
        e.runningBalance,
      ]),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(r => r.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Buku_Kas_Umum_${todayPrefix}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const periodLabel =
    periodFilter === 'today'
      ? 'Hari Ini'
      : periodFilter === 'month'
      ? 'Bulan Ini'
      : periodFilter === 'custom'
      ? customDate
      : 'Semua Waktu';

  return (
    <div className="space-y-6">
      {/* Header & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-teal-600 shrink-0" />
            <span>Buku Kas Umum (BKU)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Catatan arus uang masuk &amp; keluar tunai laci {settings.storeName}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1 p-1 bg-slate-200/70 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveSubTab('kas')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap shrink-0 ${
                activeSubTab === 'kas'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Buku Kas Tunai
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('hutang')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeSubTab === 'hutang'
                  ? 'bg-white text-amber-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Hutang Pelanggan</span>
              {unpaidDebts.length > 0 && (
                <span className="font-mono text-[10px] font-black text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-md tabular-nums">
                  {unpaidDebts.length}
                </span>
              )}
            </button>
          </div>

          {activeSubTab === 'kas' && (
            <>
              <button
                type="button"
                onClick={() => openAddModal('in')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs active:scale-95 whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Catat Kas Masuk</span>
              </button>

              <button
                type="button"
                onClick={() => openAddModal('out')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs active:scale-95 whitespace-nowrap shrink-0"
              >
                <Minus className="w-4 h-4" />
                <span>Catat Kas Keluar</span>
              </button>
            </>
          )}
        </div>
      </div>

      {activeSubTab === 'hutang' ? (
        <div className="space-y-5">
          {/* 3 Summary Cards for Piutang / Hutang */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider">Total Piutang Belum Lunas</span>
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
              </div>
              <p className="text-xl sm:text-2xl font-black text-amber-700 tabular-nums">
                {formatRupiah(totalUnpaidAmount)}
              </p>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Belum masuk kas laci atau omzet QRIS
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider">Nota Hutang Aktif</span>
                <BookOpen className="w-4 h-4 text-slate-500 shrink-0" />
              </div>
              <p className="text-xl sm:text-2xl font-black text-slate-900 tabular-nums">
                {unpaidDebts.length} <span className="text-xs font-normal text-slate-400">transaksi</span>
              </p>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Sekali bayar lunas (Cash / QRIS)
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider">Stempel Tertahan</span>
                <Stamp className="w-4 h-4 text-orange-600 shrink-0" />
              </div>
              <p className="text-xl sm:text-2xl font-black text-orange-600 tabular-nums">
                +{totalHeldStamps} <span className="text-xs font-normal text-slate-400">stempel</span>
              </p>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Otomatis diberikan saat lunas
              </span>
            </div>
          </div>

          {/* Debt Search & Mode Switch */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-xl shrink-0">
                <button
                  type="button"
                  onClick={() => setDebtViewMode('per_nota')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap shrink-0 ${
                    debtViewMode === 'per_nota'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Per Nota ({filteredDebts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setDebtViewMode('per_pelanggan')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap shrink-0 ${
                    debtViewMode === 'per_pelanggan'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Rekap per Pelanggan ({groupedDebtsByCustomer.length})
                </button>
              </div>

              <div className="relative flex-1 min-w-[200px] sm:max-w-xs">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari nama pelanggan atau kode transaksi..."
                  value={debtSearch}
                  onChange={e => setDebtSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              Saat dilunasi via <strong className="text-emerald-700">Cash</strong> otomatis masuk Buku Kas Tunai · via <strong className="text-blue-700">QRIS</strong> masuk Omzet QRIS.
            </p>
          </div>

          {/* Unpaid Debts Table */}
          {debtViewMode === 'per_pelanggan' ? (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Pelanggan</th>
                      <th className="px-4 py-3">Jumlah Nota</th>
                      <th className="px-4 py-3 text-right">Total Tagihan</th>
                      <th className="px-4 py-3 text-center">Stempel Tertahan</th>
                      <th className="px-4 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {groupedDebtsByCustomer.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                          <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-300" />
                          <p className="font-semibold text-slate-700">
                            {unpaidDebts.length === 0
                              ? 'Tidak ada hutang pelanggan yang belum lunas'
                              : 'Tidak ada data hutang yang cocok dengan pencarian'}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      groupedDebtsByCustomer.map(group => (
                        <tr key={group.customer.id} className="hover:bg-slate-50/80 transition">
                          <td className="px-4 py-3">
                            <span className="font-bold text-slate-900 block">{group.customer.name}</span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {group.customer.customerCode}
                              {group.customer.phone ? ` · ${group.customer.phone}` : ' · Belum ada No WA'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-slate-800 block tabular-nums">
                              {group.transactions.length} nota belum lunas
                            </span>
                            <span className="text-[10px] text-slate-400 truncate block max-w-xs">
                              {group.transactions.map(t => t.transactionCode).join(', ')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-black text-amber-700 tabular-nums whitespace-nowrap">
                            {formatRupiah(group.totalAmount)}
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <span className="text-xs font-bold text-amber-700 tabular-nums">
                              {group.totalHeld > 0 ? `+${group.totalHeld} tertahan` : '0'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() =>
                                handleSendConsolidatedReminderWA(group.customer, group.transactions)
                              }
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
                      <th className="px-4 py-3">Tanggal &amp; Kode</th>
                      <th className="px-4 py-3">Pelanggan</th>
                      <th className="px-4 py-3">Layanan &amp; Keterangan</th>
                      <th className="px-4 py-3 text-right">Nominal Tagihan</th>
                      <th className="px-4 py-3 text-center">Stempel Tertahan</th>
                      <th className="px-4 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDebts.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                          <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-300" />
                          <p className="font-semibold text-slate-700">
                            {unpaidDebts.length === 0
                              ? 'Tidak ada hutang pelanggan yang belum lunas'
                              : 'Tidak ada data hutang yang cocok dengan pencarian'}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredDebts.map(trx => {
                        const cust = findCustomerForTrx(trx);
                        const held = trx.pendingStamps || 0;
                        return (
                          <tr key={trx.id} className="hover:bg-slate-50/80 transition">
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="font-mono font-bold text-slate-800 block">
                                {trx.transactionCode}
                              </span>
                              <span className="text-[10px] text-slate-400 tabular-nums">
                                {formatDate(trx.createdAt)}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-bold text-slate-900 block">{trx.customerName}</span>
                              {cust.phone && (
                                <span className="text-[10px] text-slate-500 font-mono">{cust.phone}</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-slate-700 font-medium block max-w-xs truncate">
                                {trx.description || trx.categoryName || 'Transaksi Toko'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-black text-amber-700 tabular-nums whitespace-nowrap">
                              {formatRupiah(trx.amount)}
                            </td>
                            <td className="px-4 py-3 text-center whitespace-nowrap">
                              <span className="text-xs font-bold text-amber-700 tabular-nums">
                                {held > 0 ? `+${held} tertahan` : '0'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              <div className="inline-flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleSendReminderWA(trx)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold transition whitespace-nowrap shrink-0"
                                  title="Kirim pengingat tagihan via WhatsApp"
                                >
                                  <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Ingatkan WA</span>
                                </button>
                                {onSettleDebt && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSettlingTrx(trx);
                                      setSettleMethod('cash');
                                      setSendWAOnSettle(!!cust.phone);
                                    }}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition shadow-xs active:scale-95 whitespace-nowrap shrink-0"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Lunasi</span>
                                  </button>
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
          )}
        </div>
      ) : (
        <>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* 1. Saldo Kas Tunai (Laci) */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Saldo Kas Laci (Saat Ini)</span>
            <Wallet className="w-4 h-4 text-teal-600 shrink-0" />
          </div>
          <p className={`text-xl sm:text-2xl font-black tabular-nums ${currentCashBalance < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
            {formatRupiah(currentCashBalance)}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Total uang fisik laci ({entries.length} catatan)
          </span>
        </div>

        {/* 2. Kas Masuk Tunai */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Kas Masuk ({periodLabel})</span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-600 shrink-0" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-600 tabular-nums">
            +{formatRupiah(periodCashIn)}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Tunai masuk dari kasir &amp; manual
          </span>
        </div>

        {/* 3. Kas Keluar Tunai */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Kas Keluar ({periodLabel})</span>
            <ArrowUpRight className="w-4 h-4 text-rose-600 shrink-0" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-rose-600 tabular-nums">
            -{formatRupiah(periodCashOut)}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Belanja, isi saldo, atau tarik tunai
          </span>
        </div>

        {/* 4. Info QRIS (Terpisah dari Laci) */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Omzet QRIS ({periodLabel})</span>
            <QrCode className="w-4 h-4 text-blue-600 shrink-0" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-blue-600 tabular-nums">
            {formatRupiah(periodQrisTotal)}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {periodQrisCount} transaksi QRIS · Tidak masuk laci
          </span>
        </div>
      </div>

      {/* Filters & Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Period Segmented Control */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
              {(
                [
                  { key: 'today', label: 'Hari Ini' },
                  { key: 'month', label: 'Bulan Ini' },
                  { key: 'all', label: 'Semua' },
                  { key: 'custom', label: 'Tanggal' },
                ] as const
              ).map(opt => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setPeriodFilter(opt.key)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap shrink-0 ${
                    periodFilter === opt.key
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {periodFilter === 'custom' && (
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                <input
                  type="date"
                  value={customDate}
                  onChange={e => setCustomDate(e.target.value)}
                  className="pl-8 pr-2.5 py-1.5 text-xs border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>
            )}

            {/* Type Filter */}
            <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
              {(
                [
                  { key: 'all', label: 'Semua Arus' },
                  { key: 'in', label: 'Masuk' },
                  { key: 'out', label: 'Keluar' },
                ] as const
              ).map(opt => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setTypeFilter(opt.key)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap shrink-0 ${
                    typeFilter === opt.key
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search, Sort & CSV */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari kode, kategori, uraian..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>

            <button
              type="button"
              onClick={() => setSortOrder(prev => (prev === 'desc' ? 'asc' : 'desc'))}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition whitespace-nowrap shrink-0"
              title="Ubah urutan tampil"
            >
              {sortOrder === 'desc' ? 'Urutan: Terbaru' : 'Urutan: Kronologis'}
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              disabled={displayedEntries.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 text-xs font-bold text-slate-700 transition whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Buku Kas Umum Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
              <tr>
                <th className="px-4 py-3">Tanggal &amp; Kode</th>
                <th className="px-4 py-3">Uraian &amp; Kategori</th>
                <th className="px-4 py-3 text-right">Masuk (Debit)</th>
                <th className="px-4 py-3 text-right">Keluar (Kredit)</th>
                <th className="px-4 py-3 text-right">Saldo Laci</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedEntries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    <BookOpen className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-700">
                      {entries.length === 0
                        ? 'Buku Kas Umum masih kosong'
                        : 'Tidak ada catatan kas pada filter ini'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-md mx-auto">
                      {entries.length === 0
                        ? 'Transaksi pelanggan dengan metode Cash otomatis masuk ke sini. Anda juga dapat mencatat Saldo Awal Laci atau pengeluaran operasional secara manual.'
                        : 'Coba ubah filter tanggal atau kata kunci pencarian.'}
                    </p>
                    {entries.length === 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setEntryType('in');
                          setCategory('Saldo Awal Laci');
                          setRawAmount('');
                          setDescription('Saldo awal uang tunai di laci kasir');
                          setEntryDate(toLocalDateTimeInput(new Date()));
                          setFormError(null);
                          setIsModalOpen(true);
                        }}
                        className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition shadow-xs"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Catat Saldo Awal / Kas Pertama</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                displayedEntries.map(entry => {
                  const isIn = entry.type === 'in';
                  return (
                    <tr key={entry.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-mono font-bold text-slate-800 block">
                          {entry.entryCode}
                        </span>
                        <span className="text-[10px] text-slate-400 tabular-nums">
                          {formatDate(entry.date || entry.createdAt)}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <span className="font-bold text-slate-900 block">
                          {entry.description || entry.category}
                        </span>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                          <span>{entry.category}</span>
                          {entry.sourceTransactionId && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-teal-700 font-medium">Otomatis dari Kasir</span>
                            </>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-right font-bold text-emerald-600 tabular-nums whitespace-nowrap">
                        {isIn ? `+${formatRupiah(entry.amount)}` : '-'}
                      </td>

                      <td className="px-4 py-3 text-right font-bold text-rose-600 tabular-nums whitespace-nowrap">
                        {!isIn ? `-${formatRupiah(entry.amount)}` : '-'}
                      </td>

                      <td className="px-4 py-3 text-right font-black text-slate-900 tabular-nums whitespace-nowrap">
                        {formatRupiah(entry.runningBalance)}
                      </td>

                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setDeletingEntry(entry)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Hapus catatan kas"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}

      {/* Modal Add Kas Masuk / Kas Keluar */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-lg max-h-[92vh] flex flex-col rounded-3xl bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div
              className={`shrink-0 px-6 py-4 text-white flex items-center justify-between ${
                entryType === 'in'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600'
                  : 'bg-gradient-to-r from-rose-600 to-red-600'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-white/20 backdrop-blur-xs">
                  {entryType === 'in' ? (
                    <ArrowDownLeft className="w-5 h-5 text-white" />
                  ) : (
                    <ArrowUpRight className="w-5 h-5 text-white" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">
                    {entryType === 'in' ? 'Catat Kas Masuk Tunai' : 'Catat Kas Keluar Tunai'}
                  </h3>
                  <p className="text-xs text-white/85">Perbarui catatan uang tunai laci toko</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
                {/* Jenis Kas Switch */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Jenis Transaksi Kas
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleTypeSwitch('in')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                        entryType === 'in'
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-1 ring-emerald-400/50'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <ArrowDownLeft className="w-4 h-4" />
                      <span>Kas Masuk (Debit)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTypeSwitch('out')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                        entryType === 'out'
                          ? 'bg-rose-50 border-rose-500 text-rose-800 ring-1 ring-rose-400/50'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <ArrowUpRight className="w-4 h-4" />
                      <span>Kas Keluar (Kredit)</span>
                    </button>
                  </div>
                </div>

                {/* Kategori Preset */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Kategori
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(entryType === 'in' ? IN_CATEGORIES : OUT_CATEGORIES).map(cat => {
                      const active = category === cat;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setCategory(cat)}
                          className={`px-2.5 py-2 rounded-xl border text-[11px] font-bold text-left truncate transition ${
                            active
                              ? entryType === 'in'
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'bg-rose-600 border-rose-600 text-white'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Nominal */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Nominal (Rp)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-3 text-slate-400 font-bold text-sm">Rp</span>
                    <input
                      type="text"
                      required
                      autoFocus
                      placeholder="0"
                      value={rawAmount}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '');
                        setRawAmount(val ? parseInt(val, 10).toLocaleString('id-ID') : '');
                        setFormError(null);
                      }}
                      className="w-full pl-11 pr-4 py-2.5 text-lg font-bold text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 tabular-nums"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {[10000, 20000, 50000, 100000, 500000].map(amt => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => handleQuickAddAmount(amt)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[11px] font-semibold text-slate-700 transition"
                      >
                        +{formatRupiah(amt).replace('Rp', '').trim()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tanggal & Waktu */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Tanggal &amp; Waktu
                  </label>
                  <input
                    type="datetime-local"
                    value={entryDate}
                    onChange={e => setEntryDate(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs font-medium text-slate-800 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>

                {/* Keterangan */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Keterangan / Uraian
                  </label>
                  <input
                    type="text"
                    placeholder={
                      entryType === 'in'
                        ? 'Contoh: Print & jilid 15rb, atau Saldo awal laci pagi'
                        : 'Contoh: Beli kertas A4 2 rim, atau Top up saldo PPOB'
                    }
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>

                {formError && (
                  <p className="text-xs font-semibold text-rose-600">{formError}</p>
                )}
              </div>

              <div className="shrink-0 p-4 sm:px-6 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-xl text-white text-xs font-bold transition shadow-xs active:scale-95 ${
                    entryType === 'in'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  Simpan ke Buku Kas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 rounded-2xl bg-rose-50 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">Hapus Catatan Kas?</h3>
                <p className="text-xs text-slate-500">
                  {deletingEntry.entryCode} · {formatRupiah(deletingEntry.amount)}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Catatan <strong>"{deletingEntry.description || deletingEntry.category}"</strong> akan dihapus dari Buku Kas Umum dan saldo laci akan dihitung ulang.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingEntry(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteEntry(deletingEntry.id);
                  setDeletingEntry(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Debt Settlement Modal */}
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
