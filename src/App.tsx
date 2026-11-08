/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Stamp,
  Users,
  ShoppingBag,
  Gift,
  BarChart3,
  Settings,
  PlusCircle,
  Plus,
  Lock,
  LogOut,
  ExternalLink,
  Smartphone,
  Store,
  RefreshCw,
} from 'lucide-react';

import {
  Customer,
  Transaction,
  StampLedger,
  Reward,
  Redemption,
  TransactionCategory,
  StoreSettings,
} from './types';
import {
  loadAppData,
  saveAppData,
  resetAllData,
  getCustomerStampBalance,
  generateId,
} from './utils/storage';
import { sound } from './utils/audio';
import {
  sendTransactionToGoogleSheets,
  sendCustomerToGoogleSheets,
  sendRedemptionToGoogleSheets,
  fetchDataFromGoogleSheets,
} from './utils/googleSheets';

// Views
import { DashboardView } from './views/DashboardView';
import { CustomersView } from './views/CustomersView';
import { TransactionInputView } from './views/TransactionInputView';
import { TransactionsView } from './views/TransactionsView';
import { RewardsView } from './views/RewardsView';
import { ReportsView } from './views/ReportsView';
import { SettingsView } from './views/SettingsView';
import { PublicCardView } from './views/PublicCardView';
import { LoginModal } from './views/LoginModal';

// Components
import { TransactionModal } from './components/TransactionModal';
import { CustomerModal } from './components/CustomerModal';
import { RedemptionModal } from './components/RedemptionModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';

type AdminTab =
  | 'dashboard'
  | 'cashier'
  | 'customers'
  | 'transactions'
  | 'rewards'
  | 'reports'
  | 'settings';

export default function App() {
  // App data state
  const [data, setData] = useState(() => loadAppData());
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');

  // Authentication
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('scs_admin_auth') === 'true';
    }
    return true;
  });

  // Public card view routing
  const [publicQrToken, setPublicQrToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash.startsWith('#card=')) {
        return hash.replace('#card=', '');
      }
    }
    return null;
  });

  // Selected customer for modal or inspection
  const [inspectCustomer, setInspectCustomer] = useState<Customer | null>(null);

  // Modals state
  const [isTrxModalOpen, setIsTrxModalOpen] = useState(false);
  const [trxCustomer, setTrxCustomer] = useState<Customer | null>(null);

  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const [isRedemptionModalOpen, setIsRedemptionModalOpen] = useState(false);
  const [redemptionCustomer, setRedemptionCustomer] = useState<Customer | null>(null);

  // Listen to hash changes for public card links
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#card=')) {
        setPublicQrToken(hash.replace('#card=', ''));
      } else {
        setPublicQrToken(null);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Sync auth state to localStorage
  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('scs_admin_auth', 'true');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('scs_admin_auth');
    }
  };

  // Google Sheets Auto-Pull on Mount & Manual Pull for Cross-Device Sync
  const [isPullingSheets, setIsPullingSheets] = useState(false);
  const [pullMessage, setPullMessage] = useState<string | null>(null);

  const handlePullFromSheets = async (showNotification = true): Promise<boolean> => {
    const url = data.settings.googleSheetsScriptUrl;
    if (!url) {
      if (showNotification) {
        setPullMessage('URL Google Apps Script belum diisi di Pengaturan.');
        setTimeout(() => setPullMessage(null), 4000);
      }
      return false;
    }

    setIsPullingSheets(true);
    try {
      const res = await fetchDataFromGoogleSheets(url);
      if (res.success && res.data) {
        setData(prev => {
          const next = {
            ...prev,
            customers: res.data!.customers,
            transactions: res.data!.transactions,
            ledgers: res.data!.ledgers,
            redemptions: res.data!.redemptions,
            settings: {
              ...prev.settings,
              googleSheetsLastSync: new Date().toISOString(),
            },
          };
          saveAppData(next);
          return next;
        });
        if (showNotification) {
          setPullMessage(res.message);
          setTimeout(() => setPullMessage(null), 4000);
        }
        return true;
      } else {
        if (showNotification) {
          setPullMessage(res.message);
          setTimeout(() => setPullMessage(null), 5000);
        }
        return false;
      }
    } catch (e: any) {
      if (showNotification) {
        setPullMessage('Gagal mengambil data dari Google Spreadsheet');
        setTimeout(() => setPullMessage(null), 4000);
      }
      return false;
    } finally {
      setIsPullingSheets(false);
    }
  };

  // Auto-pull on app load if script url is present
  useEffect(() => {
    if (data.settings.googleSheetsScriptUrl) {
      handlePullFromSheets(false);
    }
  }, []);

  // Transaction Handler
  const handleAddTransaction = (trxInput: {
    customerId: string;
    customerName: string;
    categoryId: string;
    categoryName: string;
    amount: number;
    stampEarned: number;
    description: string;
  }) => {
    const nowIso = new Date().toISOString();
    const dateCode = nowIso.slice(0, 10).replace(/-/g, '');
    const countSeq = String(data.transactions.length + 1).padStart(3, '0');

    const newTransaction: Transaction = {
      id: generateId('trx'),
      transactionCode: `TRX-${dateCode}-${countSeq}`,
      customerId: trxInput.customerId,
      customerName: trxInput.customerName,
      categoryId: trxInput.categoryId,
      categoryName: trxInput.categoryName,
      amount: trxInput.amount,
      stampEarned: trxInput.stampEarned,
      status: 'confirmed',
      description: trxInput.description,
      createdBy: 'Admin SCS',
      createdAt: nowIso,
    };

    const curBal = getCustomerStampBalance(trxInput.customerId, data.ledgers);
    const newBal = curBal + trxInput.stampEarned;

    const newLedger: StampLedger = {
      id: generateId('ldg'),
      customerId: trxInput.customerId,
      transactionId: newTransaction.id,
      type: 'earn',
      amount: trxInput.stampEarned,
      balanceAfter: newBal,
      description: `Stempel transaksi ${trxInput.categoryName} (${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(trxInput.amount)})`,
      createdBy: 'Admin SCS',
      createdAt: nowIso,
    };

    const nextTransactions = [newTransaction, ...data.transactions];
    const nextLedgers = [newLedger, ...data.ledgers];

    setData(prev => {
      const next = { ...prev, transactions: nextTransactions, ledgers: nextLedgers };
      saveAppData(next);
      return next;
    });

    // Background sync to Google Spreadsheet if configured
    if (data.settings.googleSheetsScriptUrl) {
      sendTransactionToGoogleSheets(data.settings.googleSheetsScriptUrl, newTransaction, newBal);
    }

    return newTransaction;
  };

  // Transaction Cancellation (with stamp reversal)
  const handleCancelTransaction = (transactionId: string, reason: string) => {
    const target = data.transactions.find(t => t.id === transactionId);
    if (!target || target.status === 'cancelled') return;

    const nowIso = new Date().toISOString();
    const curBal = getCustomerStampBalance(target.customerId, data.ledgers);
    const newBal = Math.max(0, curBal - target.stampEarned);

    const reversalLedger: StampLedger = {
      id: generateId('ldg-rev'),
      customerId: target.customerId,
      transactionId: target.id,
      type: 'reversal',
      amount: -target.stampEarned,
      balanceAfter: newBal,
      description: `Pembalikan stempel transaksi ${target.transactionCode} (${reason})`,
      createdBy: 'Admin SCS',
      createdAt: nowIso,
    };

    const updatedTransactions = data.transactions.map(t =>
      t.id === transactionId ? ({ ...t, status: 'cancelled' as const } as Transaction) : t
    );
    const updatedLedgers = [reversalLedger, ...data.ledgers];

    setData(prev => {
      const next = { ...prev, transactions: updatedTransactions, ledgers: updatedLedgers };
      saveAppData(next);
      return next;
    });
  };

  // Redemption Handler (deducts 25 stamps, keeps surplus)
  const handleRedeemReward = (input: {
    customerId: string;
    customerName: string;
    rewardId: string;
    rewardName: string;
    stampsUsed: number;
    notes?: string;
  }) => {
    const nowIso = new Date().toISOString();
    const dateCode = nowIso.slice(0, 10).replace(/-/g, '');
    const countSeq = String(data.redemptions.length + 1).padStart(3, '0');

    const newRedemption: Redemption = {
      id: generateId('rdm'),
      redemptionCode: `RDM-${dateCode}-${countSeq}`,
      customerId: input.customerId,
      customerName: input.customerName,
      rewardId: input.rewardId,
      rewardName: input.rewardName,
      stampsUsed: input.stampsUsed,
      status: 'completed',
      redeemedBy: 'Admin SCS',
      redeemedAt: nowIso,
      notes: input.notes,
    };

    const curBal = getCustomerStampBalance(input.customerId, data.ledgers);
    const newBal = curBal - input.stampsUsed;

    const newLedger: StampLedger = {
      id: generateId('ldg-rdm'),
      customerId: input.customerId,
      redemptionId: newRedemption.id,
      type: 'redeem',
      amount: -input.stampsUsed,
      balanceAfter: newBal,
      description: `Penukaran hadiah ${input.rewardName}`,
      createdBy: 'Admin SCS',
      createdAt: nowIso,
    };

    const nextRedemptions = [newRedemption, ...data.redemptions];
    const nextLedgers = [newLedger, ...data.ledgers];

    setData(prev => {
      const next = { ...prev, redemptions: nextRedemptions, ledgers: nextLedgers };
      saveAppData(next);
      return next;
    });

    // Background sync to Google Spreadsheet if configured
    if (data.settings.googleSheetsScriptUrl) {
      sendRedemptionToGoogleSheets(data.settings.googleSheetsScriptUrl, newRedemption, newBal);
    }

    return newRedemption;
  };

  // Customer Management
  const handleSaveCustomer = (cust: Customer) => {
    const exists = data.customers.some(c => c.id === cust.id);
    let nextCustomers: Customer[];
    if (exists) {
      nextCustomers = data.customers.map(c => (c.id === cust.id ? cust : c));
    } else {
      nextCustomers = [cust, ...data.customers];
    }

    setData(prev => {
      const next = { ...prev, customers: nextCustomers };
      saveAppData(next);
      return next;
    });

    // Background sync to Google Spreadsheet if configured
    if (data.settings.googleSheetsScriptUrl) {
      const bal = getCustomerStampBalance(cust.id, data.ledgers);
      sendCustomerToGoogleSheets(data.settings.googleSheetsScriptUrl, cust, bal);
    }
  };

  // Settings & Categories
  const handleSaveSettings = (newSettings: StoreSettings) => {
    setData(prev => {
      const next = { ...prev, settings: newSettings };
      saveAppData(next);
      return next;
    });
  };

  const handleSaveCategories = (newCategories: TransactionCategory[]) => {
    setData(prev => {
      const next = { ...prev, categories: newCategories };
      saveAppData(next);
      return next;
    });
  };

  const handleResetData = () => {
    const reset = resetAllData();
    setData(reset);
  };

  // If public card link is accessed via QR Code or URL Hash
  if (publicQrToken) {
    const matchedCustomer = data.customers.find(c => c.qrToken === publicQrToken);

    if (matchedCustomer) {
      return (
        <>
          <PublicCardView
            customer={matchedCustomer}
            currentBalance={getCustomerStampBalance(matchedCustomer.id, data.ledgers)}
            ledgers={data.ledgers}
            settings={data.settings}
            rewards={data.rewards}
            isAdmin={isAuthenticated}
            onBackToAdmin={() => {
              window.location.hash = '';
              setPublicQrToken(null);
            }}
          />
          <OfflineIndicator />
        </>
      );
    } else {
      // Invalid QR Token fallback
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-100">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 text-center shadow-lg">
            <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto mb-3 font-bold">
              SCS
            </div>
            <h2 className="text-lg font-bold text-slate-800">Kartu Tidak Ditemukan</h2>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Kode QR atau tautan kartu stempel tidak valid atau telah diperbarui.
            </p>
            <button
              onClick={() => {
                window.location.hash = '';
                setPublicQrToken(null);
              }}
              className="px-4 py-2 bg-orange-600 text-white rounded-xl text-xs font-bold"
            >
              Kembali ke Beranda
            </button>
          </div>
        </div>
      );
    }
  }

  // Admin Login Screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-between p-4">
        <LoginModal
          isOpen={true}
          onLoginSuccess={handleLoginSuccess}
          settings={data.settings}
        />
      </div>
    );
  }

  // Active view rendering
  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardView
            customers={data.customers}
            transactions={data.transactions}
            ledgers={data.ledgers}
            redemptions={data.redemptions}
            settings={data.settings}
            onNavigate={tab => setActiveTab(tab as AdminTab)}
            onQuickTransaction={cust => {
              if (cust) {
                setTrxCustomer(cust);
                setIsTrxModalOpen(true);
              } else {
                setActiveTab('cashier');
              }
            }}
            onQuickRedeem={cust => {
              setRedemptionCustomer(cust);
              setIsRedemptionModalOpen(true);
            }}
            onSelectCustomer={cust => setInspectCustomer(cust)}
          />
        );

      case 'cashier':
        return (
          <TransactionInputView
            customers={data.customers}
            categories={data.categories.filter(c => c.status === 'active')}
            settings={data.settings}
            ledgers={data.ledgers}
            onSubmitTransaction={handleAddTransaction}
            onViewCustomerCard={cust => setInspectCustomer(cust)}
            preSelectedCustomer={trxCustomer}
          />
        );

      case 'customers':
        return (
          <CustomersView
            customers={data.customers}
            ledgers={data.ledgers}
            transactions={data.transactions}
            settings={data.settings}
            onAddCustomer={() => {
              setEditingCustomer(null);
              setIsCustomerModalOpen(true);
            }}
            onEditCustomer={cust => {
              setEditingCustomer(cust);
              setIsCustomerModalOpen(true);
            }}
            onNewTransaction={cust => {
              setTrxCustomer(cust);
              setIsTrxModalOpen(true);
            }}
            onRedeemReward={cust => {
              setRedemptionCustomer(cust);
              setIsRedemptionModalOpen(true);
            }}
            selectedCustomer={inspectCustomer}
            onSelectCustomer={cust => setInspectCustomer(cust)}
            onViewPublicCard={qrToken => {
              window.location.hash = `#card=${qrToken}`;
              setPublicQrToken(qrToken);
            }}
          />
        );

      case 'transactions':
        return (
          <TransactionsView
            transactions={data.transactions}
            categories={data.categories}
            customers={data.customers}
            ledgers={data.ledgers}
            settings={data.settings}
            onCancelTransaction={handleCancelTransaction}
            onNewTransaction={() => setActiveTab('cashier')}
          />
        );

      case 'rewards':
        return (
          <RewardsView
            customers={data.customers}
            rewards={data.rewards}
            redemptions={data.redemptions}
            ledgers={data.ledgers}
            settings={data.settings}
            onRedeemReward={cust => {
              setRedemptionCustomer(cust);
              setIsRedemptionModalOpen(true);
            }}
          />
        );

      case 'reports':
        return (
          <ReportsView
            customers={data.customers}
            transactions={data.transactions}
            ledgers={data.ledgers}
            redemptions={data.redemptions}
            categories={data.categories}
            settings={data.settings}
          />
        );

      case 'settings':
        return (
          <SettingsView
            settings={data.settings}
            categories={data.categories}
            rewards={data.rewards}
            customers={data.customers}
            transactions={data.transactions}
            redemptions={data.redemptions}
            ledgers={data.ledgers}
            onSaveSettings={handleSaveSettings}
            onSaveCategories={handleSaveCategories}
            onResetData={handleResetData}
            onPullData={async () => {
              await handlePullFromSheets(true);
            }}
            isPulling={isPullingSheets}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans pb-24 md:pb-8 selection:bg-orange-500 selection:text-white w-full max-w-full overflow-x-hidden">
      {/* Top Bar (Follows Top Bar Contract) */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-3 sm:px-6 py-2.5 sm:py-3.5 w-full overflow-hidden">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-6 w-full">
          {/* Zone 1: Brand Wordmark */}
          <div
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-2 sm:gap-2.5 cursor-pointer shrink min-w-0"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-orange-600 text-white flex items-center justify-center font-black text-xs sm:text-sm shadow-md shadow-orange-600/20 shrink-0">
              SCS
            </div>
            <div className="min-w-0">
              <span className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight block leading-tight truncate">
                SCS Digital Stamp
              </span>
              <span className="hidden sm:block text-[10px] text-slate-500 font-semibold tracking-wide truncate">
                {data.settings.storeName}
              </span>
            </div>
          </div>

          {/* Zone 2: Navigation Links (Clean single line links) */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-slate-600">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`hover:text-orange-600 transition whitespace-nowrap shrink-0 ${
                activeTab === 'dashboard' ? 'text-orange-600 font-bold' : ''
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('cashier')}
              className={`hover:text-orange-600 transition whitespace-nowrap shrink-0 ${
                activeTab === 'cashier' ? 'text-orange-600 font-bold' : ''
              }`}
            >
              Kasir Transaksi
            </button>
            <button
              onClick={() => setActiveTab('customers')}
              className={`hover:text-orange-600 transition whitespace-nowrap shrink-0 ${
                activeTab === 'customers' ? 'text-orange-600 font-bold' : ''
              }`}
            >
              Pelanggan
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`hover:text-orange-600 transition whitespace-nowrap shrink-0 ${
                activeTab === 'transactions' ? 'text-orange-600 font-bold' : ''
              }`}
            >
              Riwayat
            </button>
            <button
              onClick={() => setActiveTab('rewards')}
              className={`hover:text-orange-600 transition whitespace-nowrap shrink-0 ${
                activeTab === 'rewards' ? 'text-orange-600 font-bold' : ''
              }`}
            >
              Hadiah
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`hover:text-orange-600 transition whitespace-nowrap shrink-0 ${
                activeTab === 'reports' ? 'text-orange-600 font-bold' : ''
              }`}
            >
              Laporan
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`hover:text-orange-600 transition whitespace-nowrap shrink-0 ${
                activeTab === 'settings' ? 'text-orange-600 font-bold' : ''
              }`}
            >
              Pengaturan
            </button>
          </nav>

          {/* Zone 3: 1 Primary Action + Quick Utilities */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Quick Pull Data from Google Sheets button */}
            {data.settings.googleSheetsScriptUrl && (
              <button
                type="button"
                onClick={() => handlePullFromSheets(true)}
                disabled={isPullingSheets}
                className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[11px] font-bold transition active:scale-95 shrink-0"
                title="Tarik data terbaru dari Google Spreadsheet"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${isPullingSheets ? 'animate-spin' : ''}`} />
                <span className="hidden md:inline">{isPullingSheets ? 'Menarik...' : 'Tarik Data'}</span>
              </button>
            )}

            {/* PWA Install Button */}
            <PWAInstallButton className="hidden sm:inline-flex" />

            {/* Primary Action Button: + Input Transaksi */}
            <button
              onClick={() => setActiveTab('cashier')}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition shadow-md shadow-orange-600/20 active:scale-95 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">+ Input Transaksi</span>
              <span className="sm:hidden">+ Transaksi</span>
            </button>

            {/* Settings Button (Desktop only, mobile has it in bottom bar) */}
            <button
              onClick={() => setActiveTab('settings')}
              className={`hidden lg:flex p-2 rounded-xl transition ${
                activeTab === 'settings'
                  ? 'bg-orange-50 text-orange-600 font-bold'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
              title="Pengaturan Toko"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Logout/Lock Button */}
            <button
              onClick={handleLogout}
              className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition shrink-0"
              title="Kunci Dashboard Admin"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Toast Notification Banner for Sheets Sync / Pull */}
      {pullMessage && (
        <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-3 animate-in fade-in duration-200">
          <div className="bg-emerald-700 text-white px-4 py-2.5 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 shrink-0" />
              <span>{pullMessage}</span>
            </div>
            <button
              onClick={() => setPullMessage(null)}
              className="text-emerald-200 hover:text-white text-xs font-bold px-2 py-0.5 ml-2"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Content Viewport */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 pt-4 sm:pt-6 pb-24 lg:pb-8 flex-1 w-full max-w-full">
        {renderActiveView()}
      </main>

      {/* Mobile Fixed Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-1 py-1 shadow-lg w-full">
        <div className="grid grid-cols-5 items-center w-full max-w-md mx-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center justify-center py-1 transition min-w-0 ${
              activeTab === 'dashboard' ? 'text-orange-600 font-bold' : 'text-slate-500'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-[10px] mt-0.5 truncate max-w-full px-0.5 leading-tight">Beranda</span>
          </button>

          <button
            onClick={() => setActiveTab('customers')}
            className={`flex flex-col items-center justify-center py-1 transition min-w-0 ${
              activeTab === 'customers' ? 'text-orange-600 font-bold' : 'text-slate-500'
            }`}
          >
            <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-[10px] mt-0.5 truncate max-w-full px-0.5 leading-tight">Pelanggan</span>
          </button>

          <button
            onClick={() => setActiveTab('rewards')}
            className={`flex flex-col items-center justify-center py-1 transition min-w-0 ${
              activeTab === 'rewards' ? 'text-orange-600 font-bold' : 'text-slate-500'
            }`}
          >
            <Gift className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-[10px] mt-0.5 truncate max-w-full px-0.5 leading-tight">Hadiah</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`flex flex-col items-center justify-center py-1 transition min-w-0 ${
              activeTab === 'reports' ? 'text-orange-600 font-bold' : 'text-slate-500'
            }`}
          >
            <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-[10px] mt-0.5 truncate max-w-full px-0.5 leading-tight">Laporan</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center justify-center py-1 transition min-w-0 ${
              activeTab === 'settings' ? 'text-orange-600 font-bold' : 'text-slate-500'
            }`}
          >
            <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-[10px] mt-0.5 truncate max-w-full px-0.5 leading-tight">Pengaturan</span>
          </button>
        </div>
      </nav>

      {/* Global Modals */}

      {/* 1. Transaction Modal */}
      {isTrxModalOpen && trxCustomer && (
        <TransactionModal
          isOpen={isTrxModalOpen}
          onClose={() => {
            setIsTrxModalOpen(false);
            setTrxCustomer(null);
          }}
          customer={trxCustomer}
          currentBalance={getCustomerStampBalance(trxCustomer.id, data.ledgers)}
          categories={data.categories.filter(c => c.status === 'active')}
          settings={data.settings}
          onSubmit={handleAddTransaction}
        />
      )}

      {/* 2. Customer Modal (Add/Edit) */}
      {isCustomerModalOpen && (
        <CustomerModal
          isOpen={isCustomerModalOpen}
          onClose={() => {
            setIsCustomerModalOpen(false);
            setEditingCustomer(null);
          }}
          customer={editingCustomer}
          existingCount={data.customers.length}
          settings={data.settings}
          onSave={handleSaveCustomer}
        />
      )}

      {/* 3. Redemption Modal */}
      {isRedemptionModalOpen && redemptionCustomer && (
        <RedemptionModal
          isOpen={isRedemptionModalOpen}
          onClose={() => {
            setIsRedemptionModalOpen(false);
            setRedemptionCustomer(null);
          }}
          customer={redemptionCustomer}
          currentBalance={getCustomerStampBalance(redemptionCustomer.id, data.ledgers)}
          rewards={data.rewards.filter(r => r.status === 'active')}
          settings={data.settings}
          onConfirmRedeem={handleRedeemReward}
        />
      )}

      {/* Offline Toast Indicator */}
      <OfflineIndicator />
    </div>
  );
}
