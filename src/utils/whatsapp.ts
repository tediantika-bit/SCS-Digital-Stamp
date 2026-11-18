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

  const serviceName = transaction.categoryName || transaction.description || 'Transaksi Toko';
  const noteLine =
    transaction.description &&
    transaction.description !== serviceName &&
    transaction.description !== 'Transaksi Toko' &&
    transaction.description !== 'Umum'
      ? `• Catatan: ${transaction.description}\n`
      : '';

  if (transaction.paymentStatus === 'unpaid' || transaction.paymentMethod === 'hutang' && transaction.paymentStatus !== 'paid') {
    const heldStamps = transaction.pendingStamps ?? 0;
    return `🧾 *CATATAN TRANSAKSI (BELUM LUNAS) - ${settings.storeName.toUpperCase()}*
----------------------------------------
Halo Kak *${customer.name}* (ID: ${customer.customerCode}),
Berikut rincian transaksi Anda yang tercatat sebagai *Hutang / Bayar Nanti*:

📋 *Rincian Transaksi:*
• Layanan: ${serviceName}
• Nominal Tagihan: *${formatRupiah(transaction.amount)}*
${noteLine}• Kode Trx: ${transaction.transactionCode}
• Waktu: ${formatDate(transaction.createdAt)}

⏳ *Status Pembayaran:* *BELUM LUNAS*
⭐ *Stempel Tertahan:* *+${heldStamps} Stempel* (otomatis masuk setelah tagihan dilunasi)
🎯 *Saldo Stempel Aktif:* *${newBalance} / ${targetStamps} Stempel*
----------------------------------------
Terima kasih! Stempel akan langsung ditambahkan begitu pembayaran diselesaikan.

📍 *${settings.storeName}*
${settings.storeAddress}
Telp/WA: ${settings.storePhone}`;
  }

  const payLabel =
    transaction.paymentMethod === 'qris' || transaction.settledMethod === 'qris'
      ? 'QRIS'
      : 'Cash (Tunai)';

  const message = `🧾 *STRUK DIGITAL STEMPEL - ${settings.storeName.toUpperCase()}*
----------------------------------------
Halo Kak *${customer.name}* (ID: ${customer.customerCode}),
Terima kasih telah bertransaksi di ${settings.storeName}!

📋 *Rincian Transaksi:*
• Layanan: ${serviceName}
• Nominal: ${formatRupiah(transaction.amount)} (${payLabel})
${noteLine}• Kode Trx: ${transaction.transactionCode}
• Waktu: ${formatDate(transaction.settledAt || transaction.createdAt)}

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
 * Creates formatted WhatsApp reminder message for unpaid debt
 */
export function createDebtReminderWAMessage(
  customer: Customer,
  transaction: Transaction,
  settings: StoreSettings
): string {
  const heldStamps = transaction.pendingStamps ?? 0;
  return `📌 *PENGINGAT TAGIHAN - ${settings.storeName.toUpperCase()}*
----------------------------------------
Halo Kak *${customer.name}* (ID: ${customer.customerCode}),
Menginformasikan rincian transaksi yang belum diselesaikan di ${settings.storeName}:

• Kode Trx: ${transaction.transactionCode}
• Tanggal: ${formatDate(transaction.createdAt)}
• Layanan: ${transaction.description || transaction.categoryName || 'Transaksi Toko'}
• Total Tagihan: *${formatRupiah(transaction.amount)}*
${heldStamps > 0 ? `• Stempel Tertahan: *+${heldStamps} stempel* (langsung masuk saat lunas)\n` : ''}
Pembayaran dapat dilakukan secara tunai di kasir atau via QRIS. Terima kasih!

📍 *${settings.storeName}*
${settings.storeAddress}
Telp/WA: ${settings.storePhone}`;
}

/**
 * Creates consolidated WhatsApp reminder message for one or multiple unpaid debts of a customer
 */
export function createConsolidatedDebtReminderWAMessage(
  customer: Customer,
  unpaidTransactions: Transaction[],
  settings: StoreSettings
): string {
  if (unpaidTransactions.length === 1) {
    return createDebtReminderWAMessage(customer, unpaidTransactions[0], settings);
  }

  const totalAmount = unpaidTransactions.reduce((sum, t) => sum + t.amount, 0);
  const totalHeld = unpaidTransactions.reduce((sum, t) => sum + (t.pendingStamps || 0), 0);

  const lines = unpaidTransactions
    .map((t, idx) => {
      const label = t.description || t.categoryName || 'Transaksi Toko';
      return `${idx + 1}. *${formatRupiah(t.amount)}* — ${label} (${t.transactionCode}, ${formatDate(t.createdAt)})`;
    })
    .join('\n');

  return `📌 *PENGINGAT TAGIHAN - ${settings.storeName.toUpperCase()}*
----------------------------------------
Halo Kak *${customer.name}* (ID: ${customer.customerCode}),
Menginformasikan total *${unpaidTransactions.length} nota transaksi* yang belum diselesaikan di ${settings.storeName}:

${lines}

----------------------------------------
💰 *Total Tagihan:* *${formatRupiah(totalAmount)}*
${totalHeld > 0 ? `⭐ *Stempel Tertahan:* *+${totalHeld} stempel* (otomatis masuk setelah lunas)\n` : ''}
Pembayaran dapat dilakukan secara tunai (Cash) di kasir atau via QRIS. Terima kasih banyak!

📍 *${settings.storeName}*
${settings.storeAddress}
Telp/WA: ${settings.storePhone}`;
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
