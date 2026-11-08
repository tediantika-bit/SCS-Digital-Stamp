import { Customer, Transaction, Redemption, StoreSettings } from '../types';
import { formatRupiah, formatDate } from './storage';

/**
 * Normalizes Indonesian phone numbers to international standard (628xxx)
 */
export function normalizePhoneNumber(phone?: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1);
  } else if (cleaned.startsWith('8')) {
    cleaned = '62' + cleaned;
  }
  return cleaned;
}

/**
 * Generates public card URL
 */
export function getCustomerCardUrl(qrToken: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/#card=${qrToken}`;
}

/**
 * Creates formatted WhatsApp message for transaction & stamp earning
 */
export function createTransactionWAMessage(
  customer: Customer,
  transaction: Transaction,
  newBalance: number,
  settings: StoreSettings
): string {
  const targetStamps = settings.rewardRequiredStamps || 25;
  const remaining = Math.max(0, targetStamps - newBalance);
  const cardUrl = getCustomerCardUrl(customer.qrToken);

  let statusSection = '';
  if (newBalance >= targetStamps) {
    statusSection = `🎉 *SELAMAT! KARTU STEMPEL ANDA SUDAH PENUH!*
Saldo stempel Anda saat ini mencapai *${newBalance} stempel*.
Anda berhak menukarkan *1 ${settings.defaultRewardName}* gratis di kasir ${settings.storeName}!`;
  } else {
    statusSection = `✨ Kumpulkan *${remaining} stempel lagi* untuk mendapatkan hadiah: *${settings.defaultRewardName}*!`;
  }

  const noteLine = transaction.description && transaction.description !== 'Transaksi Toko' && transaction.description !== 'Umum'
    ? `• Catatan: ${transaction.description}\n`
    : '';

  const message = `🧾 *STRUK DIGITAL STEMPEL - ${settings.storeName.toUpperCase()}*
----------------------------------------
Halo Kak *${customer.name}* (ID: ${customer.customerCode}),
Terima kasih telah bertransaksi di ${settings.storeName}!

📋 *Rincian Transaksi:*
• Nominal: ${formatRupiah(transaction.amount)}
${noteLine}• Kode Trx: ${transaction.transactionCode}
• Waktu: ${formatDate(transaction.createdAt)}

⭐ *Stempel Didapat:* *+${transaction.stampEarned} Stempel*
🎯 *Total Saldo Stempel:* *${newBalance} / ${targetStamps} Stempel*
----------------------------------------
${statusSection}

Lihat kartu stempel digital Anda secara online:
${cardUrl}

📍 *${settings.storeName}*
${settings.storeAddress}
Telp/WA: ${settings.storePhone}`;

  return message;
}

/**
 * Creates formatted WhatsApp message for reward redemption
 */
export function createRedemptionWAMessage(
  customer: Customer,
  redemption: Redemption,
  remainingBalance: number,
  settings: StoreSettings
): string {
  const cardUrl = getCustomerCardUrl(customer.qrToken);

  const message = `🎁 *BUKTI PENUKARAN HADIAH - ${settings.storeName.toUpperCase()}*
----------------------------------------
Halo Kak *${customer.name}* (ID: ${customer.customerCode}),
Hadiah loyalitas stempel Anda telah berhasil diserahkan:

🎁 *Hadiah:* *${redemption.rewardName}*
⭐ *Stempel Digunakan:* -${redemption.stampsUsed} Stempel
🎯 *Sisa Saldo Stempel:* *${remainingBalance} Stempel* (tetap aktif & dibawa ke periode kartu berikutnya)
🕒 *Waktu Penyerahan:* ${formatDate(redemption.redeemedAt)}
🔖 *No. Penukaran:* ${redemption.redemptionCode}

Terima kasih banyak atas kesetiaan Anda berlangganan di ${settings.storeName}!

Lihat sisa stempel di kartu digital Anda:
${cardUrl}

*${settings.storeName}* - ${settings.storeAddress}`;

  return message;
}

/**
 * Creates formatted WhatsApp message for customer balance inquiry / greeting
 */
export function createBalanceInquiryWAMessage(
  customer: Customer,
  currentBalance: number,
  settings: StoreSettings
): string {
  const targetStamps = settings.rewardRequiredStamps || 25;
  const remaining = Math.max(0, targetStamps - currentBalance);
  const cardUrl = getCustomerCardUrl(customer.qrToken);

  let statusSection = '';
  if (currentBalance >= targetStamps) {
    statusSection = `🎉 *KARTU SUDAH PENUH!* Anda berhak mengambil hadiah *${settings.defaultRewardName}* gratis di kasir kami.`;
  } else {
    statusSection = `✨ Tinggal *${remaining} stempel lagi* untuk mendapatkan hadiah *${settings.defaultRewardName}*.`;
  }

  const message = `⭐ *STATUS KARTU STEMPEL - ${settings.storeName.toUpperCase()}*
----------------------------------------
Halo Kak *${customer.name}* (ID: ${customer.customerCode}),
Berikut informasi saldo stempel loyalitas Anda:

🎯 *Total Saldo Stempel:* *${currentBalance} / ${targetStamps} Stempel*
${statusSection}

Lihat kartu stempel digital lengkap Anda:
${cardUrl}

*${settings.storeName}* - ${settings.storeAddress}`;

  return message;
}

/**
 * Opens WhatsApp directly in new window/app
 */
export function sendWhatsAppMessage(phone: string | undefined, text: string): boolean {
  const normalized = normalizePhoneNumber(phone);
  if (!normalized) {
    // If no phone number, open WA with prefilled text so cashier can choose contact
    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
    return true;
  }

  const encoded = encodeURIComponent(text);
  window.open(`https://api.whatsapp.com/send?phone=${normalized}&text=${encoded}`, '_blank');
  return true;
}
