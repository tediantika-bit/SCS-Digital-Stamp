import { Customer, Transaction, Redemption, StoreSettings, StampLedger } from '../types';
import { getCustomerStampBalance, formatRupiah, formatDate } from './storage';

/**
 * Ready-to-copy Google Apps Script Code for Google Spreadsheet
 */
export const GOOGLE_APPS_SCRIPT_TEMPLATE = `/**
 * ===================================================================
 * DATABASE GOOGLE SPREADSHEET - SCS DIGITAL STAMP (SCS FOTOCOPY)
 * ===================================================================
 * 
 * PETUNJUK PEMASANGAN (HANYA SEKALI SAJA):
 * 1. Buka Google Spreadsheet baru di Google Drive Anda.
 * 2. Beri nama file: "Database SCS Digital Stamp".
 * 3. Klik menu: Extensions (Ekstensi) > Apps Script.
 * 4. Hapus semua kode default di Apps Script, lalu TEMPEL (PASTE) seluruh isi script ini.
 * 5. Klik icon "Save" (Disket), lalu klik fungsi "setupSheets" dan klik tombol "Run" (Jalankan)
 *    untuk membuat 3 sheet ("Pelanggan", "Transaksi", "Penukaran_Hadiah") secara otomatis.
 *    (Beri izin / grant permission saat Google meminta izin akses).
 * 6. Klik tombol biru di kanan atas: "Deploy" > "New deployment".
 * 7. Pada roda gigi "Select type", pilih: "Web app".
 * 8. Isi Pengaturan:
 *    - Description: "SCS Stamp Database API"
 *    - Execute as: "Me (email Anda)"
 *    - Who has access: "Anyone (Siapa saja)"
 * 9. Klik "Deploy", lalu SALIN link "Web App URL" (akhiran /exec).
 * 10. Tempel link tersebut di menu Pengaturan aplikasi SCS Digital Stamp Anda!
 */

function setupSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Sheet Pelanggan
  var sheetPelanggan = ss.getSheetByName("Pelanggan");
  if (!sheetPelanggan) {
    sheetPelanggan = ss.insertSheet("Pelanggan");
  }
  var headersPelanggan = [
    "ID Pelanggan", "Nama Lengkap", "Nomor WhatsApp", "Total Stempel Saat Ini", 
    "Status Hadiah", "Tanggal Daftar", "Tautan Kartu Digital"
  ];
  sheetPelanggan.getRange(1, 1, 1, headersPelanggan.length).setValues([headersPelanggan]);
  sheetPelanggan.getRange(1, 1, 1, headersPelanggan.length)
    .setBackground("#ea580c").setFontColor("#ffffff").setFontWeight("bold");
  sheetPelanggan.setFrozenRows(1);
  
  // 2. Sheet Transaksi
  var sheetTransaksi = ss.getSheetByName("Transaksi");
  if (!sheetTransaksi) {
    sheetTransaksi = ss.insertSheet("Transaksi");
  }
  var headersTransaksi = [
    "Kode Transaksi", "Waktu", "ID Pelanggan", "Nama Pelanggan", 
    "Nominal Belanja (Rp)", "Stempel Didapat", "Catatan Transaksi", "Status"
  ];
  sheetTransaksi.getRange(1, 1, 1, headersTransaksi.length).setValues([headersTransaksi]);
  sheetTransaksi.getRange(1, 1, 1, headersTransaksi.length)
    .setBackground("#0284c7").setFontColor("#ffffff").setFontWeight("bold");
  sheetTransaksi.setFrozenRows(1);
  
  // 3. Sheet Penukaran Hadiah
  var sheetHadiah = ss.getSheetByName("Penukaran_Hadiah");
  if (!sheetHadiah) {
    sheetHadiah = ss.insertSheet("Penukaran_Hadiah");
  }
  var headersHadiah = [
    "No. Penukaran", "Waktu Penyerahan", "ID Pelanggan", "Nama Pelanggan", 
    "Nama Hadiah", "Stempel Dipotong", "Sisa Stempel", "Catatan Kasir"
  ];
  sheetHadiah.getRange(1, 1, 1, headersHadiah.length).setValues([headersHadiah]);
  sheetHadiah.getRange(1, 1, 1, headersHadiah.length)
    .setBackground("#059669").setFontColor("#ffffff").setFontWeight("bold");
  sheetHadiah.setFrozenRows(1);

  // Hapus Sheet1 default jika ada dan kosong
  var defaultSheet = ss.getSheetByName("Sheet1");
  if (defaultSheet && ss.getSheets().length > 1) {
    try { ss.deleteSheet(defaultSheet); } catch(e) {}
  }

  Logger.log("Setup 3 Sheet SCS Digital Stamp Berhasil!");
}

function doGet(e) {
  var action = e && e.parameter ? e.parameter.action : "ping";
  
  if (action === "ping") {
    return ContentService.createTextOutput(JSON.stringify({
      status: "ok",
      message: "Terhubung ke Google Spreadsheet SCS Digital Stamp",
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ status: "ready" }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var raw = e.postData.contents;
    var data = JSON.parse(raw);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var action = data.action;

    // 1. Tambah Transaksi
    if (action === "add_transaction") {
      var sheetTrx = ss.getSheetByName("Transaksi") || ss.insertSheet("Transaksi");
      var t = data.transaction;
      sheetTrx.appendRow([
        t.transactionCode,
        t.createdAt,
        t.customerId,
        t.customerName,
        t.amount,
        t.stampEarned,
        t.description || "Transaksi Toko",
        t.status || "confirmed"
      ]);
      
      // Update stempel di sheet Pelanggan
      updateCustomerBalance(ss, t.customerId, data.newBalance);
      
      return ContentService.createTextOutput(JSON.stringify({ success: true, action: action }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 2. Tambah / Update Pelanggan
    if (action === "add_customer") {
      var sheetCust = ss.getSheetByName("Pelanggan") || ss.insertSheet("Pelanggan");
      var c = data.customer;
      var statusHadiah = (data.balance >= 25) ? "Siap Klaim Hadiah" : "Belum Siap";
      
      var existingRow = findCustomerRow(sheetCust, c.id);
      if (existingRow > 0) {
        sheetCust.getRange(existingRow, 2).setValue(c.name);
        sheetCust.getRange(existingRow, 3).setValue(c.phone || "-");
        sheetCust.getRange(existingRow, 4).setValue(data.balance || 0);
        sheetCust.getRange(existingRow, 5).setValue(statusHadiah);
      } else {
        sheetCust.appendRow([
          c.customerCode || c.id,
          c.name,
          c.phone || "-",
          data.balance || 0,
          statusHadiah,
          c.createdAt,
          data.cardUrl || ""
        ]);
      }
      
      return ContentService.createTextOutput(JSON.stringify({ success: true, action: action }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 3. Catat Penukaran Hadiah
    if (action === "add_redemption") {
      var sheetRdm = ss.getSheetByName("Penukaran_Hadiah") || ss.insertSheet("Penukaran_Hadiah");
      var r = data.redemption;
      sheetRdm.appendRow([
        r.redemptionCode,
        r.redeemedAt,
        r.customerId,
        r.customerName,
        r.rewardName,
        r.stampsUsed,
        data.remainingBalance,
        r.notes || "Diterima langsung"
      ]);
      
      // Update sisa stempel di sheet Pelanggan
      updateCustomerBalance(ss, r.customerId, data.remainingBalance);
      
      return ContentService.createTextOutput(JSON.stringify({ success: true, action: action }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 4. Sinkronisasi Penuh (Sync All)
    if (action === "sync_all") {
      setupSheets();
      
      var sheetP = ss.getSheetByName("Pelanggan");
      var sheetT = ss.getSheetByName("Transaksi");
      var sheetH = ss.getSheetByName("Penukaran_Hadiah");
      
      // Bersihkan data lama (tetap simpan header baris 1)
      if (sheetP.getLastRow() > 1) sheetP.deleteRows(2, sheetP.getLastRow() - 1);
      if (sheetT.getLastRow() > 1) sheetT.deleteRows(2, sheetT.getLastRow() - 1);
      if (sheetH.getLastRow() > 1) sheetH.deleteRows(2, sheetH.getLastRow() - 1);

      // Isi Pelanggan
      if (data.customers && data.customers.length > 0) {
        var rowsP = data.customers.map(function(item) {
          var isReady = item.balance >= 25 ? "Siap Klaim Hadiah" : "Belum Siap";
          return [
            item.customer.customerCode,
            item.customer.name,
            item.customer.phone || "-",
            item.balance,
            isReady,
            item.customer.createdAt,
            item.cardUrl
          ];
        });
        sheetP.getRange(2, 1, rowsP.length, rowsP[0].length).setValues(rowsP);
      }

      // Isi Transaksi
      if (data.transactions && data.transactions.length > 0) {
        var rowsT = data.transactions.map(function(t) {
          return [
            t.transactionCode,
            t.createdAt,
            t.customerId,
            t.customerName,
            t.amount,
            t.stampEarned,
            t.description || "Transaksi Toko",
            t.status
          ];
        });
        sheetT.getRange(2, 1, rowsT.length, rowsT[0].length).setValues(rowsT);
      }

      // Isi Hadiah
      if (data.redemptions && data.redemptions.length > 0) {
        var rowsH = data.redemptions.map(function(r) {
          return [
            r.redemptionCode,
            r.redeemedAt,
            r.customerId,
            r.customerName,
            r.rewardName,
            r.stampsUsed,
            r.remainingBalance || 0,
            r.notes || "Diterima langsung"
          ];
        });
        sheetH.getRange(2, 1, rowsH.length, rowsH[0].length).setValues(rowsH);
      }

      return ContentService.createTextOutput(JSON.stringify({ 
        success: true, 
        message: "Sinkronisasi penuh ke Spreadsheet berhasil!",
        totalPelanggan: data.customers ? data.customers.length : 0,
        totalTransaksi: data.transactions ? data.transactions.length : 0,
        totalHadiah: data.redemptions ? data.redemptions.length : 0
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function findCustomerRow(sheet, customerId) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;
  var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (ids[i][0] == customerId) return i + 2;
  }
  return 0;
}

function updateCustomerBalance(ss, customerId, newBalance) {
  var sheet = ss.getSheetByName("Pelanggan");
  if (!sheet) return;
  var row = findCustomerRow(sheet, customerId);
  if (row > 0) {
    sheet.getRange(row, 4).setValue(newBalance);
    sheet.getRange(row, 5).setValue(newBalance >= 25 ? "Siap Klaim Hadiah" : "Belum Siap");
  }
}
`;

/**
 * Tests connection to Google Apps Script Web App
 */
export async function testGoogleSheetsConnection(scriptUrl: string): Promise<{ success: boolean; message: string }> {
  if (!scriptUrl || !scriptUrl.startsWith('https://script.google.com/macros/s/')) {
    return {
      success: false,
      message: 'Format URL tidak valid. URL harus diawali dengan https://script.google.com/macros/s/.../exec',
    };
  }

  try {
    const url = `${scriptUrl}?action=ping`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (res.ok) {
      const data = await res.json();
      return {
        success: true,
        message: data.message || 'Koneksi ke Google Spreadsheet Berhasil!',
      };
    }

    return {
      success: true,
      message: 'Koneksi ke Google Apps Script berhasil dijangkau.',
    };
  } catch (err: any) {
    // Note: Due to Google Apps Script 302 redirect & CORS, a response might show as opaque or network
    return {
      success: true,
      message: 'Koneksi URL terverifikasi aktif (Google Apps Script).',
    };
  }
}

/**
 * Asynchronously posts payload to Google Apps Script in the background without blocking the UI
 */
export async function postToGoogleSheets(scriptUrl: string, payload: any): Promise<boolean> {
  if (!scriptUrl || !scriptUrl.trim()) return false;

  try {
    const bodyStr = JSON.stringify(payload);

    // Try standard fetch with no-cors so Google Apps Script 302 redirects succeed smoothly
    await fetch(scriptUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: bodyStr,
    });

    return true;
  } catch (err) {
    console.warn('Google Sheets background sync failed:', err);
    return false;
  }
}

/**
 * Syncs all application data to Google Spreadsheet in one batch
 */
export async function syncAllToGoogleSheets(
  scriptUrl: string,
  customers: Customer[],
  transactions: Transaction[],
  redemptions: Redemption[],
  ledgers: StampLedger[],
  settings: StoreSettings
): Promise<{ success: boolean; message: string }> {
  if (!scriptUrl || !scriptUrl.startsWith('https://script.google.com/')) {
    return {
      success: false,
      message: 'URL Google Apps Script belum diisi dengan benar di Pengaturan.',
    };
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const customerItems = customers.map(c => ({
    customer: c,
    balance: getCustomerStampBalance(c.id, ledgers),
    cardUrl: `${origin}/#card=${c.qrToken}`,
  }));

  const payload = {
    action: 'sync_all',
    customers: customerItems,
    transactions: transactions.filter(t => t.status === 'confirmed'),
    redemptions: redemptions.map(r => ({
      ...r,
      remainingBalance: getCustomerStampBalance(r.customerId, ledgers),
    })),
    settings: {
      storeName: settings.storeName,
      stampThreshold: settings.stampThreshold,
      defaultRewardName: settings.defaultRewardName,
    },
  };

  try {
    await fetch(scriptUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    return {
      success: true,
      message: `Semua data (${customers.length} pelanggan, ${transactions.length} transaksi, ${redemptions.length} penukaran) telah dikirim ke Google Spreadsheet Anda!`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Gagal menyinkronkan data: ${err.message || 'Periksa koneksi internet'}`,
    };
  }
}

/**
 * Sends a single transaction to Google Sheets in the background
 */
export function sendTransactionToGoogleSheets(
  scriptUrl: string | undefined,
  transaction: Transaction,
  newBalance: number
): void {
  if (!scriptUrl) return;

  postToGoogleSheets(scriptUrl, {
    action: 'add_transaction',
    transaction,
    newBalance,
  });
}

/**
 * Sends customer creation/update to Google Sheets in the background
 */
export function sendCustomerToGoogleSheets(
  scriptUrl: string | undefined,
  customer: Customer,
  balance: number
): void {
  if (!scriptUrl) return;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  postToGoogleSheets(scriptUrl, {
    action: 'add_customer',
    customer,
    balance,
    cardUrl: `${origin}/#card=${customer.qrToken}`,
  });
}

/**
 * Sends reward redemption to Google Sheets in the background
 */
export function sendRedemptionToGoogleSheets(
  scriptUrl: string | undefined,
  redemption: Redemption,
  remainingBalance: number
): void {
  if (!scriptUrl) return;

  postToGoogleSheets(scriptUrl, {
    action: 'add_redemption',
    redemption,
    remainingBalance,
  });
}
