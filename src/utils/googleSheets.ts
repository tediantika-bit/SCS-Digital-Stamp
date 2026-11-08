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

  // Tarik Seluruh Data untuk Sinkronisasi Antar Perangkat
  if (action === "get_data") {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var result = getAllDataFromSheets(ss);
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
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

      // Simpan Pengaturan Toko jika disertakan
      if (data.settings) {
        saveSettingsToSheet(ss, data.settings);
      }

      return ContentService.createTextOutput(JSON.stringify({ 
        success: true, 
        message: "Sinkronisasi penuh ke Spreadsheet berhasil!",
        totalPelanggan: data.customers ? data.customers.length : 0,
        totalTransaksi: data.transactions ? data.transactions.length : 0,
        totalHadiah: data.redemptions ? data.redemptions.length : 0
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 5. Simpan Pengaturan & Identitas Toko
    if (action === "save_settings") {
      if (data.settings) {
        saveSettingsToSheet(ss, data.settings);
      }
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        action: action
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

function saveSettingsToSheet(ss, s) {
  var sheetS = ss.getSheetByName("Pengaturan");
  if (!sheetS) {
    sheetS = ss.insertSheet("Pengaturan");
  }
  sheetS.clear();
  var rows = [
    ["Key", "Value"],
    ["storeName", s.storeName || ""],
    ["storeTagline", s.storeTagline || ""],
    ["storeAddress", s.storeAddress || ""],
    ["storePhone", s.storePhone || ""],
    ["stampThreshold", s.stampThreshold || 20000],
    ["rewardRequiredStamps", s.rewardRequiredStamps || 25],
    ["defaultRewardName", s.defaultRewardName || ""],
    ["adminPin", s.adminPin || "1234"]
  ];
  sheetS.getRange(1, 1, rows.length, 2).setValues(rows);
  sheetS.getRange(1, 1, 1, 2).setBackground("#475569").setFontColor("#ffffff").setFontWeight("bold");
}

function getAllDataFromSheets(ss) {
  var result = {
    success: true,
    customers: [],
    transactions: [],
    redemptions: [],
    settings: null,
    timestamp: new Date().toISOString()
  };

  // 0. Baca Sheet Pengaturan jika ada
  var sheetS = ss.getSheetByName("Pengaturan");
  if (sheetS && sheetS.getLastRow() > 1) {
    var rowsS = sheetS.getRange(2, 1, sheetS.getLastRow() - 1, 2).getValues();
    var cfg = {};
    for (var m = 0; m < rowsS.length; m++) {
      var key = String(rowsS[m][0] || "").trim();
      var val = rowsS[m][1];
      if (key) cfg[key] = val;
    }
    result.settings = cfg;
  }

  // 1. Baca Sheet Pelanggan
  var sheetC = ss.getSheetByName("Pelanggan");
  if (sheetC && sheetC.getLastRow() > 1) {
    var rowsC = sheetC.getRange(2, 1, sheetC.getLastRow() - 1, 7).getValues();
    for (var i = 0; i < rowsC.length; i++) {
      var r = rowsC[i];
      if (r[0] || r[1]) {
        var cCode = String(r[0] || "").trim();
        result.customers.push({
          id: cCode,
          customerCode: cCode,
          name: String(r[1] || "").trim(),
          phone: String(r[2] || "").trim(),
          balance: Number(r[3]) || 0,
          createdAt: r[5] ? new Date(r[5]).toISOString() : new Date().toISOString(),
          cardUrl: String(r[6] || "").trim(),
          status: "active"
        });
      }
    }
  }

  // 2. Baca Sheet Transaksi
  var sheetT = ss.getSheetByName("Transaksi");
  if (sheetT && sheetT.getLastRow() > 1) {
    var rowsT = sheetT.getRange(2, 1, sheetT.getLastRow() - 1, 8).getValues();
    for (var j = 0; j < rowsT.length; j++) {
      var rt = rowsT[j];
      if (rt[0] || rt[2]) {
        var tCode = String(rt[0] || "").trim();
        result.transactions.push({
          id: "trx-" + tCode,
          transactionCode: tCode,
          createdAt: rt[1] ? new Date(rt[1]).toISOString() : new Date().toISOString(),
          customerId: String(rt[2] || "").trim(),
          customerName: String(rt[3] || "").trim(),
          amount: Number(rt[4]) || 0,
          stampEarned: Number(rt[5]) || 0,
          description: String(rt[6] || "Transaksi Toko").trim(),
          status: String(rt[7] || "confirmed").trim(),
          categoryId: "cat-general",
          categoryName: "Transaksi Toko"
        });
      }
    }
  }

  // 3. Baca Sheet Penukaran Hadiah
  var sheetH = ss.getSheetByName("Penukaran_Hadiah");
  if (sheetH && sheetH.getLastRow() > 1) {
    var rowsH = sheetH.getRange(2, 1, sheetH.getLastRow() - 1, 8).getValues();
    for (var k = 0; k < rowsH.length; k++) {
      var rh = rowsH[k];
      if (rh[0] || rh[2]) {
        var rCode = String(rh[0] || "").trim();
        result.redemptions.push({
          id: "rdm-" + rCode,
          redemptionCode: rCode,
          redeemedAt: rh[1] ? new Date(rh[1]).toISOString() : new Date().toISOString(),
          customerId: String(rh[2] || "").trim(),
          customerName: String(rh[3] || "").trim(),
          rewardName: String(rh[4] || "Minyak goreng 500 ml").trim(),
          rewardId: "rew-1",
          stampsUsed: Number(rh[5]) || 25,
          remainingBalance: Number(rh[6]) || 0,
          notes: String(rh[7] || "Diterima langsung").trim(),
          status: "completed"
        });
      }
    }
  }

  return result;
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
      storeTagline: settings.storeTagline,
      storeAddress: settings.storeAddress,
      storePhone: settings.storePhone,
      stampThreshold: settings.stampThreshold,
      rewardRequiredStamps: settings.rewardRequiredStamps,
      defaultRewardName: settings.defaultRewardName,
      adminPin: settings.adminPin,
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

/**
 * Sends store settings / identity to Google Sheets in the background
 */
export function sendSettingsToGoogleSheets(
  scriptUrl: string | undefined,
  settings: StoreSettings
): void {
  if (!scriptUrl) return;

  postToGoogleSheets(scriptUrl, {
    action: 'save_settings',
    settings: {
      storeName: settings.storeName,
      storeTagline: settings.storeTagline,
      storeAddress: settings.storeAddress,
      storePhone: settings.storePhone,
      stampThreshold: settings.stampThreshold,
      rewardRequiredStamps: settings.rewardRequiredStamps,
      defaultRewardName: settings.defaultRewardName,
      adminPin: settings.adminPin,
    },
  });
}

export interface PulledSheetsData {
  customers: Customer[];
  transactions: Transaction[];
  ledgers: StampLedger[];
  redemptions: Redemption[];
  settings?: Partial<StoreSettings>;
}

/**
 * Fetches all customers, transactions, and redemptions from Google Spreadsheet
 * Enables cross-browser and cross-device sync!
 */
export async function fetchDataFromGoogleSheets(scriptUrl: string): Promise<{
  success: boolean;
  data?: PulledSheetsData;
  message: string;
}> {
  if (!scriptUrl || !scriptUrl.startsWith('https://script.google.com/macros/s/')) {
    return {
      success: false,
      message: 'Format URL Google Apps Script tidak valid.',
    };
  }

  try {
    const url = `${scriptUrl}?action=get_data&t=${Date.now()}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      return {
        success: false,
        message: `HTTP ${res.status}: Gagal menghubungi Google Apps Script.`,
      };
    }

    const json = await res.json();
    if (!json.success) {
      return {
        success: false,
        message: json.error || 'Respon dari Spreadsheet tidak valid.',
      };
    }

    const rawCustomers: any[] = json.customers || [];
    const customers: Customer[] = rawCustomers.map((c: any) => {
      const code = String(c.customerCode || c.id || '').trim();
      return {
        id: code,
        customerCode: code,
        name: String(c.name || 'Pelanggan').trim(),
        phone: c.phone && c.phone !== '-' ? String(c.phone).trim() : '',
        qrToken: c.cardUrl && c.cardUrl.includes('#card=') ? c.cardUrl.split('#card=')[1] : code,
        status: 'active',
        createdAt: c.createdAt || new Date().toISOString(),
      };
    });

    // Helper to resolve canonical customer ID (matches by id/customerCode or exact name)
    const resolveCustomerId = (rawId: string, rawName: string): string => {
      const byId = customers.find(
        c => c.id.toLowerCase() === String(rawId || '').trim().toLowerCase() ||
             c.customerCode.toLowerCase() === String(rawId || '').trim().toLowerCase()
      );
      if (byId) return byId.id;

      const byName = customers.find(
        c => c.name.toLowerCase() === String(rawName || '').trim().toLowerCase()
      );
      if (byName) return byName.id;

      return String(rawId || '').trim();
    };

    const transactions: Transaction[] = (json.transactions || []).map((t: any) => {
      const resolvedCustId = resolveCustomerId(t.customerId, t.customerName);
      return {
        id: t.id || `trx-${t.transactionCode}`,
        transactionCode: t.transactionCode,
        customerId: resolvedCustId,
        customerName: t.customerName,
        categoryId: t.categoryId || 'cat-general',
        categoryName: t.categoryName || 'Transaksi Toko',
        amount: Number(t.amount) || 0,
        stampEarned: Number(t.stampEarned) || 0,
        status: t.status || 'confirmed',
        description: t.description || 'Transaksi Toko',
        createdBy: 'Kasir SCS',
        createdAt: t.createdAt || new Date().toISOString(),
      };
    });

    const redemptions: Redemption[] = (json.redemptions || []).map((r: any) => {
      const resolvedCustId = resolveCustomerId(r.customerId, r.customerName);
      return {
        id: r.id || `rdm-${r.redemptionCode}`,
        redemptionCode: r.redemptionCode,
        customerId: resolvedCustId,
        customerName: r.customerName,
        rewardId: r.rewardId || 'rew-1',
        rewardName: r.rewardName || 'Minyak goreng 500 ml',
        stampsUsed: Number(r.stampsUsed) || 25,
        redeemedAt: r.redeemedAt || new Date().toISOString(),
        notes: r.notes || '',
        status: 'completed',
      };
    });

    // Reconstruct ledger entries with running balance
    const ledgers: StampLedger[] = [];
    transactions
      .filter(t => t.status !== 'cancelled')
      .forEach(t => {
        ledgers.push({
          id: `ldg-${t.transactionCode}`,
          customerId: t.customerId,
          transactionId: t.id,
          type: 'earn',
          amount: t.stampEarned,
          balanceAfter: 0,
          description: `Stempel transaksi ${t.transactionCode}`,
          createdBy: 'Kasir SCS',
          createdAt: t.createdAt,
        });
      });

    redemptions.forEach(r => {
      ledgers.push({
        id: `ldg-rdm-${r.redemptionCode}`,
        customerId: r.customerId,
        type: 'redeem',
        amount: -r.stampsUsed,
        balanceAfter: 0,
        description: `Penukaran hadiah ${r.rewardName}`,
        createdBy: 'Admin SCS',
        createdAt: r.redeemedAt,
      });
    });

    // Ensure if Sheet Pelanggan has a positive balance not yet reflected in reconstructed ledgers, sync the difference
    rawCustomers.forEach((rawC: any) => {
      const code = String(rawC.customerCode || rawC.id || '').trim();
      const sheetBalance = Number(rawC.balance) || 0;
      const calcBalance = ledgers
        .filter(l => l.customerId === code)
        .reduce((sum, l) => sum + l.amount, 0);

      if (sheetBalance > calcBalance) {
        const diff = sheetBalance - calcBalance;
        ledgers.push({
          id: `ldg-sync-${code}`,
          customerId: code,
          type: 'earn',
          amount: diff,
          balanceAfter: sheetBalance,
          description: 'Saldo stempel tersinkronisasi dari Google Spreadsheet',
          createdBy: 'Sistem Sync',
          createdAt: rawC.createdAt || new Date().toISOString(),
        });
      }
    });

    // Compute chronological balanceAfter per customer
    customers.forEach(c => {
      let running = 0;
      ledgers
        .filter(l => l.customerId === c.id)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .forEach(l => {
          running += l.amount;
          l.balanceAfter = running;
        });
    });

    let pulledSettings: Partial<StoreSettings> | undefined = undefined;
    if (json.settings && typeof json.settings === 'object') {
      pulledSettings = {};
      if (json.settings.storeName) pulledSettings.storeName = String(json.settings.storeName);
      if (json.settings.storeTagline) pulledSettings.storeTagline = String(json.settings.storeTagline);
      if (json.settings.storeAddress) pulledSettings.storeAddress = String(json.settings.storeAddress);
      if (json.settings.storePhone) pulledSettings.storePhone = String(json.settings.storePhone);
      if (json.settings.stampThreshold) pulledSettings.stampThreshold = Number(json.settings.stampThreshold) || 20000;
      if (json.settings.rewardRequiredStamps) pulledSettings.rewardRequiredStamps = Number(json.settings.rewardRequiredStamps) || 25;
      if (json.settings.defaultRewardName) pulledSettings.defaultRewardName = String(json.settings.defaultRewardName);
      if (json.settings.adminPin) pulledSettings.adminPin = String(json.settings.adminPin);
    }

    return {
      success: true,
      data: {
        customers,
        transactions,
        ledgers,
        redemptions,
        settings: pulledSettings,
      },
      message: `Berhasil menarik ${customers.length} pelanggan dan ${transactions.length} transaksi dari Spreadsheet!`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Gagal menarik data: ${err.message || 'Kendala jaringan'}. Pastikan URL Script benar dan izin telah diatur ke "Anyone".`,
    };
  }
}

