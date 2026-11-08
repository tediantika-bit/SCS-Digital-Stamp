import { Customer, Transaction, TransactionCategory, StampLedger, Reward, Redemption, StoreSettings } from '../types';

const ENV_SHEETS_URL = (import.meta as any).env?.VITE_GOOGLE_SHEETS_URL || '';

export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: 'SCS Fotocopy',
  storeTagline: 'Pusat Fotocopy, PPOB & Pembayaran Digital',
  storeAddress: 'Jl. Raya Utama No. 88',
  storePhone: '0812-3456-7890',
  stampThreshold: 20000, // Rp20.000 = 1 stamp
  rewardRequiredStamps: 25, // 25 stamps = 1 reward
  defaultRewardName: 'Minyak goreng 500 ml',
  adminPin: '1234',
  googleSheetsScriptUrl: ENV_SHEETS_URL,
};

export const DEFAULT_CATEGORIES: TransactionCategory[] = [
  { id: 'cat-1', name: 'Pulsa', status: 'active' },
  { id: 'cat-2', name: 'Token listrik', status: 'active' },
  { id: 'cat-3', name: 'PLN Pascabayar', status: 'active' },
  { id: 'cat-4', name: 'Top Up E-Money', status: 'active' },
  { id: 'cat-5', name: 'Transfer', status: 'active' },
  { id: 'cat-6', name: 'Angsuran', status: 'active' },
  { id: 'cat-7', name: 'BTN', status: 'active' },
  { id: 'cat-8', name: 'Tarik tunai', status: 'active' },
  { id: 'cat-9', name: 'Top Up Game Online', status: 'active' },
];

export const DEFAULT_REWARDS: Reward[] = [
  {
    id: 'rew-1',
    name: 'Minyak goreng 500 ml',
    description: 'Hadiah utama loyalitas kartu stempel SCS Fotocopy per 25 stempel.',
    requiredStamps: 25,
    stock: 50,
    status: 'active',
  },
];

export const DEFAULT_CUSTOMERS: Customer[] = [];

export const DEFAULT_TRANSACTIONS: Transaction[] = [];

export const DEFAULT_LEDGERS: StampLedger[] = [];

export const DEFAULT_REDEMPTIONS: Redemption[] = [];

// Storage Keys
const STORAGE_PREFIX = 'scs_stamp_v2_';
const KEYS = {
  SETTINGS: `${STORAGE_PREFIX}settings`,
  CATEGORIES: `${STORAGE_PREFIX}categories`,
  CUSTOMERS: `${STORAGE_PREFIX}customers`,
  TRANSACTIONS: `${STORAGE_PREFIX}transactions`,
  LEDGERS: `${STORAGE_PREFIX}ledgers`,
  REWARDS: `${STORAGE_PREFIX}rewards`,
  REDEMPTIONS: `${STORAGE_PREFIX}redemptions`,
};

export interface AppData {
  settings: StoreSettings;
  categories: TransactionCategory[];
  customers: Customer[];
  transactions: Transaction[];
  ledgers: StampLedger[];
  rewards: Reward[];
  redemptions: Redemption[];
}

export function loadAppData(): AppData {
  if (typeof window === 'undefined') {
    return {
      settings: DEFAULT_SETTINGS,
      categories: DEFAULT_CATEGORIES,
      customers: DEFAULT_CUSTOMERS,
      transactions: DEFAULT_TRANSACTIONS,
      ledgers: DEFAULT_LEDGERS,
      rewards: DEFAULT_REWARDS,
      redemptions: DEFAULT_REDEMPTIONS,
    };
  }

  try {
    const rawSettings = localStorage.getItem(KEYS.SETTINGS);
    const rawCategories = localStorage.getItem(KEYS.CATEGORIES);
    const rawCustomers = localStorage.getItem(KEYS.CUSTOMERS);
    const rawTransactions = localStorage.getItem(KEYS.TRANSACTIONS);
    const rawLedgers = localStorage.getItem(KEYS.LEDGERS);
    const rawRewards = localStorage.getItem(KEYS.REWARDS);
    const rawRedemptions = localStorage.getItem(KEYS.REDEMPTIONS);

    let settings: StoreSettings = rawSettings ? JSON.parse(rawSettings) : DEFAULT_SETTINGS;

    // Check query params (?sheetUrl=... or ?sheetsUrl=...) to auto-configure device
    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search);
        const qUrl = params.get('sheetsUrl') || params.get('sheetUrl');
        if (qUrl && qUrl.startsWith('https://script.google.com/')) {
          settings = { ...settings, googleSheetsScriptUrl: qUrl };
          localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
        } else if (!settings.googleSheetsScriptUrl && ENV_SHEETS_URL) {
          settings = { ...settings, googleSheetsScriptUrl: ENV_SHEETS_URL };
        }
      } catch (e) {
        // ignore url parsing error
      }
    }

    return {
      settings,
      categories: rawCategories ? JSON.parse(rawCategories) : DEFAULT_CATEGORIES,
      customers: rawCustomers ? JSON.parse(rawCustomers) : DEFAULT_CUSTOMERS,
      transactions: rawTransactions ? JSON.parse(rawTransactions) : DEFAULT_TRANSACTIONS,
      ledgers: rawLedgers ? JSON.parse(rawLedgers) : DEFAULT_LEDGERS,
      rewards: rawRewards ? JSON.parse(rawRewards) : DEFAULT_REWARDS,
      redemptions: rawRedemptions ? JSON.parse(rawRedemptions) : DEFAULT_REDEMPTIONS,
    };
  } catch (err) {
    console.error('Failed to parse stored app data:', err);
    return {
      settings: DEFAULT_SETTINGS,
      categories: DEFAULT_CATEGORIES,
      customers: DEFAULT_CUSTOMERS,
      transactions: DEFAULT_TRANSACTIONS,
      ledgers: DEFAULT_LEDGERS,
      rewards: DEFAULT_REWARDS,
      redemptions: DEFAULT_REDEMPTIONS,
    };
  }
}

export function saveAppData(data: Partial<AppData>) {
  if (typeof window === 'undefined') return;
  try {
    if (data.settings) localStorage.setItem(KEYS.SETTINGS, JSON.stringify(data.settings));
    if (data.categories) localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(data.categories));
    if (data.customers) localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(data.customers));
    if (data.transactions) localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(data.transactions));
    if (data.ledgers) localStorage.setItem(KEYS.LEDGERS, JSON.stringify(data.ledgers));
    if (data.rewards) localStorage.setItem(KEYS.REWARDS, JSON.stringify(data.rewards));
    if (data.redemptions) localStorage.setItem(KEYS.REDEMPTIONS, JSON.stringify(data.redemptions));
  } catch (err) {
    console.error('Failed to persist app data:', err);
  }
}

export function resetAllData(): AppData {
  const initialData: AppData = {
    settings: DEFAULT_SETTINGS,
    categories: DEFAULT_CATEGORIES,
    customers: DEFAULT_CUSTOMERS,
    transactions: DEFAULT_TRANSACTIONS,
    ledgers: DEFAULT_LEDGERS,
    rewards: DEFAULT_REWARDS,
    redemptions: DEFAULT_REDEMPTIONS,
  };
  saveAppData(initialData);
  return initialData;
}

// Business Rules & Calculations
export function calculateStampsFromAmount(amount: number, threshold: number = 20000): number {
  if (!amount || amount < threshold) return 0;
  return Math.floor(amount / threshold);
}

export function getCustomerStampBalance(customerId: string, ledgers: StampLedger[]): number {
  return ledgers
    .filter(l => l.customerId === customerId)
    .reduce((sum, item) => sum + item.amount, 0);
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export function formatDate(isoString: string): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return isoString;
  }
}

export function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
}

export function generateQrToken(name: string): string {
  const clean = name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8);
  const rand = Math.random().toString(36).substring(2, 10);
  return `scs_${clean}_${rand}`;
}
