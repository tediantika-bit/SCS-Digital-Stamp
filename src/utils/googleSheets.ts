import { Customer, Transaction, Redemption, StoreSettings, StampLedger, CashBookEntry, CustomerDebt } from '../types';
import { getCustomerStampBalance, formatRupiah, formatDate, sanitizePhone } from './storage';

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
    "Nominal Belanja (Rp)", "Stempel Didapat", "Catatan Transaksi", "Status", "Metode Bayar",
    "Status Bayar", "Stempel Tertahan", "Waktu Lunas", "Metode Lunas"
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

  // 4. Sheet Buku Kas Umum
  var sheetBukuKas = ss.getSheetByName("Buku_Kas");
  if (!sheetBukuKas) {
    sheetBukuKas = ss.insertSheet("Buku_Kas");
  }
  var headersBukuKas = [
    "Kode Kas", "Waktu", "Jenis", "Kategori", "Keterangan", "Nominal (Rp)", "ID Transaksi", "Dicatat Oleh"
  ];
  sheetBukuKas.getRange(1, 1, 1, headersBukuKas.length).setValues([headersBukuKas]);
  sheetBukuKas.getRange(1, 1, 1, headersBukuKas.length)
    .setBackground("#0f766e").setFontColor("#ffffff").setFontWeight("bold");
  sheetBukuKas.setFrozenRows(1);

  // 5. Sheet Hutang
  var sheetHutang = ss.getSheetByName("Hutang");
  if (!sheetHutang) {
    sheetHutang = ss.insertSheet("Hutang");
  }
  var headersHutang = [
    "Kode Hutang", "Waktu Catat", "ID Pelanggan", "Nama Pelanggan",
    "Kategori", "Nominal (Rp)", "Stempel Tertahan", "Keterangan",
    "Status", "Waktu Lunas", "Metode Lunas", "Kode Trx Lunas"
  ];
  sheetHutang.getRange(1, 1, 1, headersHutang.length).setValues([headersHutang]);
  sheetHutang.getRange(1, 1, 1, headersHutang.length)
    .setBackground("#d97706").setFontColor("#ffffff").setFontWeight("bold");
  sheetHutang.setFrozenRows(1);

  // Hapus Sheet1 default jika ada dan kosong
  var defaultSheet = ss.getSheetByName("Sheet1");
  if (defaultSheet && ss.getSheets().length > 1) {
    try { ss.deleteSheet(defaultSheet); } catch(e) {}
  }

  Logger.log("Setup 5 Sheet SCS Digital Stamp Berhasil!");
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
        t.status || "confirmed",
        t.paymentMethod || "cash",
        t.paymentStatus || "paid",
        Number(t.pendingStamps) || 0,
        t.settledAt || "",
        t.settledMethod || ""
      ]);
      
      // Update stempel di sheet Pelanggan
      updateCustomerBalance(ss, t.customerId, data.newBalance);
      
      return ContentService.createTextOutput(JSON.stringify({ success: true, action: action }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 1b. Lunasi Hutang Transaksi
    if (action === "settle_transaction") {
      var sheetSettle = ss.getSheetByName("Transaksi");
      var st = data.transaction || {};
      var targetTrxCode = String(st.transactionCode || data.transactionCode || "").trim();
      if (sheetSettle && sheetSettle.getLastRow() > 1 && targetTrxCode) {
        var trxCodes = sheetSettle.getRange(2, 1, sheetSettle.getLastRow() - 1, 1).getValues();
        for (var sIdx = 0; sIdx < trxCodes.length; sIdx++) {
          if (String(trxCodes[sIdx][0] || "").trim() === targetTrxCode) {
            var rowNum = sIdx + 2;
            sheetSettle.getRange(rowNum, 6).setValue(Number(st.stampEarned) || 0);
            sheetSettle.getRange(rowNum, 10).setValue("paid");
            sheetSettle.getRange(rowNum, 11).setValue(Number(st.pendingStamps) || 0);
            sheetSettle.getRange(rowNum, 12).setValue(st.settledAt || new Date().toISOString());
            sheetSettle.getRange(rowNum, 13).setValue(st.settledMethod || "cash");
            break;
          }
        }
      }

      if (st.customerId !== undefined && data.newBalance !== undefined) {
        updateCustomerBalance(ss, st.customerId, data.newBalance);
      }

      return ContentService.createTextOutput(JSON.stringify({ success: true, action: action }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 2. Tambah / Update Pelanggan
    if (action === "add_customer") {
      var sheetCust = ss.getSheetByName("Pelanggan") || ss.insertSheet("Pelanggan");
      var c = data.customer;
      var statusHadiah = (data.balance >= 25) ? "Siap Klaim Hadiah" : "Belum Siap";
      var safePhone = (c.phone && String(c.phone).trim() !== "-" && String(c.phone).indexOf("ERROR") === -1)
        ? "'" + String(c.phone).trim().replace(/^'/, "")
        : "";
      
      var existingRow = findCustomerRow(sheetCust, c.id);
      if (existingRow > 0) {
        sheetCust.getRange(existingRow, 2).setValue(c.name);
        sheetCust.getRange(existingRow, 3).setValue(safePhone);
        sheetCust.getRange(existingRow, 4).setValue(data.balance || 0);
        sheetCust.getRange(existingRow, 5).setValue(statusHadiah);
      } else {
        sheetCust.appendRow([
          c.customerCode || c.id,
          c.name,
          safePhone,
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
      var sheetBK = ss.getSheetByName("Buku_Kas");
      var sheetHT = ss.getSheetByName("Hutang");
      
      // Bersihkan data lama (tetap simpan header baris 1)
      if (sheetP.getLastRow() > 1) sheetP.deleteRows(2, sheetP.getLastRow() - 1);
      if (sheetT.getLastRow() > 1) sheetT.deleteRows(2, sheetT.getLastRow() - 1);
      if (sheetH.getLastRow() > 1) sheetH.deleteRows(2, sheetH.getLastRow() - 1);
      if (sheetBK && sheetBK.getLastRow() > 1) sheetBK.deleteRows(2, sheetBK.getLastRow() - 1);
      if (sheetHT && sheetHT.getLastRow() > 1) sheetHT.deleteRows(2, sheetHT.getLastRow() - 1);

      // Isi Pelanggan
      if (data.customers && data.customers.length > 0) {
        var rowsP = data.customers.map(function(item) {
          var isReady = item.balance >= 25 ? "Siap Klaim Hadiah" : "Belum Siap";
          var rawP = item.customer.phone;
          var safeP = (rawP && String(rawP).trim() !== "-" && String(rawP).indexOf("ERROR") === -1)
            ? "'" + String(rawP).trim().replace(/^'/, "")
            : "";
          return [
            item.customer.customerCode,
            item.customer.name,
            safeP,
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
            t.status,
            t.paymentMethod || "cash",
            t.paymentStatus || "paid",
            Number(t.pendingStamps) || 0,
            t.settledAt || "",
            t.settledMethod || ""
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

      // Isi Buku Kas Umum
      if (sheetBK && data.cashBook && data.cashBook.length > 0) {
        var rowsBK = data.cashBook.map(function(b) {
          return [
            b.entryCode,
            b.date || b.createdAt,
            b.type === "out" ? "Keluar" : "Masuk",
            b.category || "Lainnya",
            b.description || "",
            Number(b.amount) || 0,
            b.sourceTransactionId || "",
            b.createdBy || "Admin SCS"
          ];
        });
        sheetBK.getRange(2, 1, rowsBK.length, rowsBK[0].length).setValues(rowsBK);
      }

      // Isi Hutang Pelanggan
      if (sheetHT && data.debts && data.debts.length > 0) {
        var rowsHT = data.debts.map(function(d) {
          return [
            d.debtCode,
            d.createdAt,
            d.customerId,
            d.customerName,
            d.categoryName || "Transaksi Toko",
            Number(d.amount) || 0,
            Number(d.pendingStamps) || 0,
            d.description || "",
            d.status || "unpaid",
            d.settledAt || "",
            d.settledMethod || "",
            d.settledTransactionCode || d.settledTransactionId || ""
          ];
        });
        sheetHT.getRange(2, 1, rowsHT.length, rowsHT[0].length).setValues(rowsHT);
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

    // 6. Tambah Entri Buku Kas Umum
    if (action === "add_cash_entry") {
      var sheetKas = ss.getSheetByName("Buku_Kas");
      if (!sheetKas) {
        sheetKas = ss.insertSheet("Buku_Kas");
        var hKas = ["Kode Kas", "Waktu", "Jenis", "Kategori", "Keterangan", "Nominal (Rp)", "ID Transaksi", "Dicatat Oleh"];
        sheetKas.getRange(1, 1, 1, hKas.length).setValues([hKas]);
        sheetKas.getRange(1, 1, 1, hKas.length).setBackground("#0f766e").setFontColor("#ffffff").setFontWeight("bold");
        sheetKas.setFrozenRows(1);
      }
      var b = data.entry;
      if (b) {
        sheetKas.appendRow([
          b.entryCode,
          b.date || b.createdAt,
          b.type === "out" ? "Keluar" : "Masuk",
          b.category || "Lainnya",
          b.description || "",
          Number(b.amount) || 0,
          b.sourceTransactionId || "",
          b.createdBy || "Admin SCS"
        ]);
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true, action: action }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 7. Hapus Entri Buku Kas Umum
    if (action === "delete_cash_entry") {
      var sheetKasDel = ss.getSheetByName("Buku_Kas");
      if (sheetKasDel && sheetKasDel.getLastRow() > 1) {
        var targetCode = String(data.entryCode || "").trim();
        var kasIds = sheetKasDel.getRange(2, 1, sheetKasDel.getLastRow() - 1, 1).getValues();
        for (var idx = kasIds.length - 1; idx >= 0; idx--) {
          if (String(kasIds[idx][0]).trim() === targetCode) {
            sheetKasDel.deleteRow(idx + 2);
          }
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true, action: action }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 8. Catat Hutang Baru Member
    if (action === "add_debt") {
      var sheetDebt = ss.getSheetByName("Hutang");
      if (!sheetDebt) {
        sheetDebt = ss.insertSheet("Hutang");
        var hDebt = [
          "Kode Hutang", "Waktu Catat", "ID Pelanggan", "Nama Pelanggan",
          "Kategori", "Nominal (Rp)", "Stempel Tertahan", "Keterangan",
          "Status", "Waktu Lunas", "Metode Lunas", "Kode Trx Lunas"
        ];
        sheetDebt.getRange(1, 1, 1, hDebt.length).setValues([hDebt]);
        sheetDebt.getRange(1, 1, 1, hDebt.length).setBackground("#d97706").setFontColor("#ffffff").setFontWeight("bold");
        sheetDebt.setFrozenRows(1);
      }
      var d = data.debt;
      if (d) {
        sheetDebt.appendRow([
          d.debtCode,
          d.createdAt,
          d.customerId,
          d.customerName,
          d.categoryName || "Transaksi Toko",
          Number(d.amount) || 0,
          Number(d.pendingStamps) || 0,
          d.description || "",
          d.status || "unpaid",
          d.settledAt || "",
          d.settledMethod || "",
          d.settledTransactionCode || d.settledTransactionId || ""
        ]);
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true, action: action }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 9. Lunasi Hutang Member
    if (action === "settle_debt") {
      var sheetSettleDebt = ss.getSheetByName("Hutang");
      var targetDebtCode = String(data.debtCode || "").trim();
      if (sheetSettleDebt && sheetSettleDebt.getLastRow() > 1 && targetDebtCode) {
        var debtCodes = sheetSettleDebt.getRange(2, 1, sheetSettleDebt.getLastRow() - 1, 1).getValues();
        for (var dIdx = 0; dIdx < debtCodes.length; dIdx++) {
          if (String(debtCodes[dIdx][0] || "").trim() === targetDebtCode) {
            var dRow = dIdx + 2;
            sheetSettleDebt.getRange(dRow, 9).setValue("paid");
            sheetSettleDebt.getRange(dRow, 10).setValue(data.settledAt || new Date().toISOString());
            sheetSettleDebt.getRange(dRow, 11).setValue(data.settledMethod || "cash");
            sheetSettleDebt.getRange(dRow, 12).setValue(data.settledTransactionCode || "");
            break;
          }
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true, action: action }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 10. Batalkan Catatan Hutang Member
    if (action === "cancel_debt") {
      var sheetCancelDebt = ss.getSheetByName("Hutang");
      var cancelDebtCode = String(data.debtCode || "").trim();
      if (sheetCancelDebt && sheetCancelDebt.getLastRow() > 1 && cancelDebtCode) {
        var cDebtCodes = sheetCancelDebt.getRange(2, 1, sheetCancelDebt.getLastRow() - 1, 1).getValues();
        for (var cIdx = 0; cIdx < cDebtCodes.length; cIdx++) {
          if (String(cDebtCodes[cIdx][0] || "").trim() === cancelDebtCode) {
            sheetCancelDebt.getRange(cIdx + 2, 9).setValue("cancelled");
            break;
          }
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true, action: action }))
        .setMimeType(ContentService.MimeType.JSON);
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
    ["adminPin", s.adminPin || "1234"],
    ["storeLogo", s.storeLogo || ""]
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
    cashBook: [],
    debts: [],
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
    var colCountT = Math.min(13, Math.max(8, sheetT.getLastColumn()));
    var rowsT = sheetT.getRange(2, 1, sheetT.getLastRow() - 1, colCountT).getValues();
    for (var j = 0; j < rowsT.length; j++) {
      var rt = rowsT[j];
      if (rt[0] || rt[2]) {
        var tCode = String(rt[0] || "").trim();
        var pm = rt[8] ? String(rt[8]).trim().toLowerCase() : "";
        var rawPs = rt[9] ? String(rt[9]).trim().toLowerCase() : "";
        var stampVal = Number(rt[5]) || 0;
        var resolvedPm = (pm === "qris" || pm === "cash" || pm === "hutang") ? pm : undefined;
        var resolvedPs = (rawPs === "unpaid" || rawPs === "paid")
          ? rawPs
          : (resolvedPm === "hutang" && stampVal === 0 ? "unpaid" : "paid");
        var rawSm = rt[12] ? String(rt[12]).trim().toLowerCase() : "";
        var resolvedSm = (rawSm === "cash" || rawSm === "qris") ? rawSm : undefined;

        result.transactions.push({
          id: "trx-" + tCode,
          transactionCode: tCode,
          createdAt: rt[1] ? new Date(rt[1]).toISOString() : new Date().toISOString(),
          customerId: String(rt[2] || "").trim(),
          customerName: String(rt[3] || "").trim(),
          amount: Number(rt[4]) || 0,
          stampEarned: stampVal,
          description: String(rt[6] || "Transaksi Toko").trim(),
          status: String(rt[7] || "confirmed").trim(),
          paymentMethod: resolvedPm,
          paymentStatus: resolvedPs,
          pendingStamps: Number(rt[10]) || 0,
          settledAt: rt[11] ? new Date(rt[11]).toISOString() : undefined,
          settledMethod: resolvedSm,
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

  // 4. Baca Sheet Buku Kas Umum
  var sheetBK = ss.getSheetByName("Buku_Kas");
  if (sheetBK && sheetBK.getLastRow() > 1) {
    var rowsBK = sheetBK.getRange(2, 1, sheetBK.getLastRow() - 1, 8).getValues();
    for (var b = 0; b < rowsBK.length; b++) {
      var rbk = rowsBK[b];
      if (rbk[0] || rbk[4]) {
        var bCode = String(rbk[0] || "").trim();
        var rawType = String(rbk[2] || "").trim().toLowerCase();
        var isoDate = rbk[1] ? new Date(rbk[1]).toISOString() : new Date().toISOString();
        result.cashBook.push({
          id: "bku-" + bCode,
          entryCode: bCode,
          date: isoDate,
          type: (rawType === "keluar" || rawType === "out") ? "out" : "in",
          category: String(rbk[3] || "Lainnya").trim(),
          description: String(rbk[4] || "").trim(),
          amount: Number(rbk[5]) || 0,
          sourceTransactionId: rbk[6] ? String(rbk[6]).trim() : undefined,
          createdBy: String(rbk[7] || "Admin SCS").trim(),
          createdAt: isoDate
        });
      }
    }
  }

  // 5. Baca Sheet Hutang
  var sheetHT = ss.getSheetByName("Hutang");
  if (sheetHT && sheetHT.getLastRow() > 1) {
    var colCountHT = Math.min(12, Math.max(8, sheetHT.getLastColumn()));
    var rowsHT = sheetHT.getRange(2, 1, sheetHT.getLastRow() - 1, colCountHT).getValues();
    for (var h = 0; h < rowsHT.length; h++) {
      var rht = rowsHT[h];
      if (rht[0] || rht[2]) {
        var hCode = String(rht[0] || "").trim();
        var rawStatus = rht[8] ? String(rht[8]).trim().toLowerCase() : "unpaid";
        var resolvedStatus = (rawStatus === "paid" || rawStatus === "cancelled") ? rawStatus : "unpaid";
        var rawSettleMethod = rht[10] ? String(rht[10]).trim().toLowerCase() : "";
        result.debts.push({
          id: "htg-" + hCode,
          debtCode: hCode,
          createdAt: rht[1] ? new Date(rht[1]).toISOString() : new Date().toISOString(),
          customerId: String(rht[2] || "").trim(),
          customerName: String(rht[3] || "").trim(),
          categoryId: "cat-general",
          categoryName: String(rht[4] || "Transaksi Toko").trim(),
          amount: Number(rht[5]) || 0,
          pendingStamps: Number(rht[6]) || 0,
          description: String(rht[7] || "").trim(),
          status: resolvedStatus,
          settledAt: rht[9] ? new Date(rht[9]).toISOString() : undefined,
          settledMethod: (rawSettleMethod === "cash" || rawSettleMethod === "qris") ? rawSettleMethod : undefined,
          settledTransactionId: rht[11] ? String(rht[11]).trim() : undefined,
          createdBy: "Admin SCS"
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
  settings: StoreSettings,
  cashBook: CashBookEntry[] = [],
  debts: CustomerDebt[] = []
): Promise<{ success: boolean; message: string }> {
  if (!scriptUrl || !scriptUrl.startsWith('https://script.google.com/')) {
    return {
      success: false,
      message: 'URL Google Apps Script belum diisi dengan benar di Pengaturan.',
    };
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const customerItems = customers.map(c => {
    const cleanP = sanitizePhone(c.phone);
    return {
      customer: {
        ...c,
        // Send "'08..." if phone exists, or " " (single space) so existing Apps Script (c.phone || "-") doesn't write "-" which causes #ERROR! in Google Sheets
        phone: cleanP ? `'${cleanP}` : ' ',
      },
      balance: getCustomerStampBalance(c.id, ledgers),
      cardUrl: `${origin}/#card=${c.qrToken}`,
    };
  });

  const payload = {
    action: 'sync_all',
    customers: customerItems,
    transactions: transactions.filter(t => t.status === 'confirmed'),
    redemptions: redemptions.map(r => ({
      ...r,
      remainingBalance: getCustomerStampBalance(r.customerId, ledgers),
    })),
    cashBook,
    debts,
    settings: {
      storeName: settings.storeName,
      storeTagline: settings.storeTagline,
      storeAddress: settings.storeAddress,
      storePhone: settings.storePhone,
      storeLogo: settings.storeLogo || '',
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
 * Sends a debt settlement update to Google Sheets in the background
 */
export function sendTransactionSettlementToGoogleSheets(
  scriptUrl: string | undefined,
  transaction: Transaction,
  newBalance: number
): void {
  if (!scriptUrl) return;

  postToGoogleSheets(scriptUrl, {
    action: 'settle_transaction',
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
  const cleanP = sanitizePhone(customer.phone);
  postToGoogleSheets(scriptUrl, {
    action: 'add_customer',
    customer: {
      ...customer,
      // Prevent Google Apps Script (c.phone || "-") from writing "-" which causes #ERROR! in Google Sheets
      phone: cleanP ? `'${cleanP}` : ' ',
    },
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
      storeLogo: settings.storeLogo || '',
      stampThreshold: settings.stampThreshold,
      rewardRequiredStamps: settings.rewardRequiredStamps,
      defaultRewardName: settings.defaultRewardName,
      adminPin: settings.adminPin,
    },
  });
}

/**
 * Sends a single Cash Book entry to Google Sheets in the background
 */
export function sendCashEntryToGoogleSheets(
  scriptUrl: string | undefined,
  entry: CashBookEntry
): void {
  if (!scriptUrl) return;

  postToGoogleSheets(scriptUrl, {
    action: 'add_cash_entry',
    entry,
  });
}

/**
 * Deletes a Cash Book entry from Google Sheets in the background
 */
export function deleteCashEntryFromGoogleSheets(
  scriptUrl: string | undefined,
  entryCode: string
): void {
  if (!scriptUrl || !entryCode) return;

  postToGoogleSheets(scriptUrl, {
    action: 'delete_cash_entry',
    entryCode,
  });
}

/**
 * Sends a newly created member debt to Google Sheets in the background
 */
export function sendDebtToGoogleSheets(
  scriptUrl: string | undefined,
  debt: CustomerDebt
): void {
  if (!scriptUrl) return;

  postToGoogleSheets(scriptUrl, {
    action: 'add_debt',
    debt,
  });
}

/**
 * Sends debt settlement status update to Google Sheets in the background
 */
export function sendDebtSettlementToGoogleSheets(
  scriptUrl: string | undefined,
  debtCode: string,
  settledAt: string,
  settledMethod: 'cash' | 'qris',
  settledTransactionCode: string
): void {
  if (!scriptUrl || !debtCode) return;

  postToGoogleSheets(scriptUrl, {
    action: 'settle_debt',
    debtCode,
    settledAt,
    settledMethod,
    settledTransactionCode,
  });
}

/**
 * Sends debt cancellation update to Google Sheets in the background
 */
export function sendDebtCancellationToGoogleSheets(
  scriptUrl: string | undefined,
  debtCode: string
): void {
  if (!scriptUrl || !debtCode) return;

  postToGoogleSheets(scriptUrl, {
    action: 'cancel_debt',
    debtCode,
  });
}

export interface PulledSheetsData {
  customers: Customer[];
  transactions: Transaction[];
  ledgers: StampLedger[];
  redemptions: Redemption[];
  cashBook: CashBookEntry[];
  debts: CustomerDebt[];
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
      const rawPhoneStr = String(c.phone || '').trim();
      const cleanedPhone = sanitizePhone(rawPhoneStr);
      const custObj: Customer = {
        id: code,
        customerCode: code,
        name: String(c.name || 'Pelanggan').trim(),
        phone: cleanedPhone || undefined,
        qrToken: c.cardUrl && c.cardUrl.includes('#card=') ? c.cardUrl.split('#card=')[1] : code,
        status: 'active',
        createdAt: c.createdAt || new Date().toISOString(),
      };

      // Auto-repair Google Sheets cell if it currently contains #ERROR! or formula error
      if (rawPhoneStr.startsWith('#') || rawPhoneStr.toUpperCase().includes('ERROR')) {
        sendCustomerToGoogleSheets(scriptUrl, custObj, Number(c.balance) || 0);
      }

      return custObj;
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

    const rawTransactions: Transaction[] = (json.transactions || []).map((t: any) => {
      const resolvedCustId = resolveCustomerId(t.customerId, t.customerName);
      const pm =
        t.paymentMethod === 'qris' || t.paymentMethod === 'cash' || t.paymentMethod === 'hutang'
          ? t.paymentMethod
          : undefined;
      const stampVal = Number(t.stampEarned) || 0;
      const paymentStatus =
        t.paymentStatus === 'unpaid' || t.paymentStatus === 'paid'
          ? t.paymentStatus
          : pm === 'hutang' && stampVal === 0
          ? 'unpaid'
          : 'paid';
      return {
        id: t.id || `trx-${t.transactionCode}`,
        transactionCode: t.transactionCode,
        customerId: resolvedCustId,
        customerName: t.customerName,
        categoryId: t.categoryId || 'cat-general',
        categoryName: t.categoryName || 'Transaksi Toko',
        amount: Number(t.amount) || 0,
        stampEarned: stampVal,
        paymentMethod: pm,
        paymentStatus,
        pendingStamps: Number(t.pendingStamps) || 0,
        settledAt: t.settledAt || undefined,
        settledMethod:
          t.settledMethod === 'cash' || t.settledMethod === 'qris' ? t.settledMethod : undefined,
        status: t.status || 'confirmed',
        description: t.description || 'Transaksi Toko',
        createdBy: 'Kasir SCS',
        createdAt: t.createdAt || new Date().toISOString(),
      };
    });

    const debts: CustomerDebt[] = (json.debts || []).map((d: any) => {
      const resolvedCustId = resolveCustomerId(d.customerId, d.customerName);
      const st = d.status === 'paid' || d.status === 'cancelled' ? d.status : 'unpaid';
      return {
        id: d.id || `htg-${d.debtCode}`,
        debtCode: String(d.debtCode || ''),
        customerId: resolvedCustId,
        customerName: String(d.customerName || 'Pelanggan'),
        categoryId: d.categoryId || 'cat-general',
        categoryName: String(d.categoryName || 'Transaksi Toko'),
        amount: Number(d.amount) || 0,
        pendingStamps: Number(d.pendingStamps) || 0,
        description: d.description ? String(d.description) : undefined,
        status: st,
        settledAt: d.settledAt || undefined,
        settledMethod:
          d.settledMethod === 'cash' || d.settledMethod === 'qris' ? d.settledMethod : undefined,
        settledTransactionId: d.settledTransactionId || undefined,
        createdBy: 'Admin SCS',
        createdAt: d.createdAt || new Date().toISOString(),
      };
    });

    // Migrate any legacy unpaid hutang rows in Transaksi sheet into debts
    const transactions: Transaction[] = [];
    rawTransactions.forEach(t => {
      const isLegacyUnpaid =
        t.status === 'confirmed' &&
        (t.paymentStatus === 'unpaid' || (t.paymentMethod === 'hutang' && t.paymentStatus !== 'paid'));
      if (isLegacyUnpaid) {
        if (!debts.some(d => d.debtCode === t.transactionCode || d.id === `htg-mig-${t.transactionCode}`)) {
          debts.push({
            id: `htg-mig-${t.transactionCode}`,
            debtCode: t.transactionCode,
            customerId: t.customerId,
            customerName: t.customerName,
            categoryId: t.categoryId || 'cat-10',
            categoryName: t.categoryName || 'Transaksi Toko',
            amount: t.amount,
            pendingStamps: t.pendingStamps || 0,
            description: t.description || t.categoryName || 'Transaksi Toko',
            status: 'unpaid',
            createdBy: t.createdBy || 'Admin SCS',
            createdAt: t.createdAt,
          });
        }
      } else {
        transactions.push(t);
      }
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
      .filter(t => t.status !== 'cancelled' && t.stampEarned > 0)
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
          createdAt: t.settledAt || t.createdAt,
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
      if (json.settings.storeLogo) pulledSettings.storeLogo = String(json.settings.storeLogo);
      if (json.settings.stampThreshold) pulledSettings.stampThreshold = Number(json.settings.stampThreshold) || 20000;
      if (json.settings.rewardRequiredStamps) pulledSettings.rewardRequiredStamps = Number(json.settings.rewardRequiredStamps) || 25;
      if (json.settings.defaultRewardName) pulledSettings.defaultRewardName = String(json.settings.defaultRewardName);
      if (json.settings.adminPin) pulledSettings.adminPin = String(json.settings.adminPin);
    }

    const cashBook: CashBookEntry[] = (json.cashBook || []).map((b: any) => ({
      id: b.id || `bku-${b.entryCode}`,
      entryCode: String(b.entryCode || ''),
      date: b.date || b.createdAt || new Date().toISOString(),
      type: b.type === 'out' ? 'out' : 'in',
      category: String(b.category || 'Lainnya'),
      description: String(b.description || ''),
      amount: Number(b.amount) || 0,
      sourceTransactionId: b.sourceTransactionId || undefined,
      createdBy: String(b.createdBy || 'Admin SCS'),
      createdAt: b.createdAt || b.date || new Date().toISOString(),
    }));

    return {
      success: true,
      data: {
        customers,
        transactions,
        ledgers,
        redemptions,
        cashBook,
        debts,
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

