export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'cashier';
}

export interface Customer {
  id: string;
  customerCode: string; // e.g. SCS-001
  name: string;
  phone?: string;
  qrToken: string; // unique random token for public URL
  status: 'active' | 'inactive';
  createdAt: string;
  notes?: string;
}

export interface TransactionCategory {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'inactive';
}

export type TransactionStatus = 'confirmed' | 'cancelled';
export type PaymentMethod = 'cash' | 'qris' | 'hutang';
export type PaymentStatus = 'paid' | 'unpaid';

export interface Transaction {
  id: string;
  transactionCode: string; // e.g. TRX-20261108-001
  customerId: string;
  customerName: string;
  categoryId: string;
  categoryName: string;
  amount: number; // in IDR
  stampEarned: number;
  paymentMethod?: PaymentMethod; // 'cash' enters Buku Kas Tunai, 'qris' non-cash, 'hutang' pay later
  paymentStatus?: PaymentStatus; // 'unpaid' while debt is unsettled, 'paid' when settled
  pendingStamps?: number; // stamps held until hutang is settled (Opsi A)
  settledAt?: string; // ISO timestamp when hutang was settled
  settledMethod?: 'cash' | 'qris'; // payment method used when settling hutang
  status: TransactionStatus;
  description?: string;
  createdBy: string;
  createdAt: string;
}

export type DebtStatus = 'unpaid' | 'paid' | 'cancelled';

export interface CustomerDebt {
  id: string;
  debtCode: string; // e.g. HTG-20261118-001
  customerId: string;
  customerName: string;
  categoryId: string;
  categoryName: string;
  amount: number; // in IDR
  pendingStamps: number; // stamps held until debt is settled
  description?: string;
  status: DebtStatus;
  settledAt?: string;
  settledMethod?: 'cash' | 'qris';
  settledTransactionId?: string;
  createdBy: string;
  createdAt: string;
}

export type CashBookEntryType = 'in' | 'out';

export interface CashBookEntry {
  id: string;
  entryCode: string; // e.g. BKU-20261118-001
  date: string; // ISO string
  type: CashBookEntryType; // 'in' = Kas Masuk Tunai, 'out' = Kas Keluar Tunai
  category: string;
  description: string;
  amount: number; // positive IDR
  sourceTransactionId?: string; // links to Transaction.id when auto-recorded from Cash customer trx
  createdBy: string;
  createdAt: string;
}

export type StampLedgerType = 'earn' | 'redeem' | 'adjustment' | 'reversal';

export interface StampLedger {
  id: string;
  customerId: string;
  transactionId?: string;
  redemptionId?: string;
  type: StampLedgerType;
  amount: number; // positive for earn, negative for redeem/reversal
  balanceAfter: number;
  description: string;
  createdBy: string;
  createdAt: string;
}

export interface Reward {
  id: string;
  name: string;
  description: string;
  requiredStamps: number;
  stock?: number;
  status: 'active' | 'inactive';
}

export interface Redemption {
  id: string;
  redemptionCode: string;
  customerId: string;
  customerName: string;
  rewardId: string;
  rewardName: string;
  stampsUsed: number;
  status: 'completed' | 'cancelled';
  redeemedBy: string;
  redeemedAt: string;
  notes?: string;
}

export interface StoreSettings {
  storeName: string;
  storeTagline: string;
  storeAddress: string;
  storePhone: string;
  storeLogo?: string; // Image URL or Base64 data URL for store logo
  stampThreshold: number; // default 20000
  rewardRequiredStamps: number; // default 25
  defaultRewardName: string;
  adminPin: string; // simple fast PIN for kiosk/cashier unlock
  googleSheetsScriptUrl?: string; // Google Apps Script Web App Deployment URL
  googleSheetsLastSync?: string; // Timestamp of last successful sync
}
