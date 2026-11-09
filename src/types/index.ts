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

export interface Transaction {
  id: string;
  transactionCode: string; // e.g. TRX-20261108-001
  customerId: string;
  customerName: string;
  categoryId: string;
  categoryName: string;
  amount: number; // in IDR
  stampEarned: number;
  status: TransactionStatus;
  description?: string;
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
