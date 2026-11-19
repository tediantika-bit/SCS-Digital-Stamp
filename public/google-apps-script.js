/**
 * ===================================================================
 * DATABASE GOOGLE SPREADSHEET - SCS DIGITAL STAMP (SCS FOTOCOPY)
 * ===================================================================
 * 
 * PETUNJUK PEMASANGAN (HANYA SEKALI SAJA):
 * 1. Buka Google Spreadsheet baru di Google Drive Anda (drive.google.com).
 * 2. Beri nama file spreadsheet: "Database SCS Digital Stamp".
 * 3. Klik menu atas: Extensions (Ekstensi) > Apps Script.
 * 4. Hapus semua tulisan kode bawaan, lalu SALIN & TEMPEL (PASTE) seluruh kode di file ini.
 * 5. Klik ikon "Simpan" (ikon disket).
 * 6. Di dropdown fungsi (sebelah tombol Debug), pilih "setupSheets", lalu klik "Run" (Jalankan).
 *    (Jika Google meminta izin/Authorization Required, klik "Review permissions" > Pilih Akun Google > Advanced > Go to Untitled (unsafe) > Allow).
 *    -> Tiga sheet ("Pelanggan", "Transaksi", "Penukaran_Hadiah") akan otomatis terbuat dengan judul warna rapi!
 * 7. Klik tombol biru di pojok kanan atas: "Deploy" > "New deployment".
 * 8. Pada roda gigi kecil "Select type", pilih: "Web app".
 * 9. Konfigurasi:
 *    - Description: Database SCS Digital Stamp
 *    - Execute as: Me (email akun Google Anda)
 *    - Who has access: Anyone (Siapa saja)
 * 10. Klik "Deploy", lalu SALIN link "Web App URL" (akhiran /exec).
 * 11. Buka aplikasi SCS Digital Stamp > Menu Pengaturan > Tempel URL tersebut dan klik Simpan!
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

  // Hapus Sheet1 bawaan jika kosong
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

    // 1. Catat Transaksi Baru
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
      
      // Update saldo stempel pelanggan
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

    // 2. Tambah / Perbarui Pelanggan
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

    // 4. Sinkronisasi Keseluruhan (Sync All)
    if (action === "sync_all") {
      setupSheets();
      
      var sheetP = ss.getSheetByName("Pelanggan");
      var sheetT = ss.getSheetByName("Transaksi");
      var sheetH = ss.getSheetByName("Penukaran_Hadiah");
      var sheetBK = ss.getSheetByName("Buku_Kas");
      var sheetHT = ss.getSheetByName("Hutang");
      
      // Bersihkan data lama agar tidak duplikat (header baris 1 tetap ada)
      if (sheetP.getLastRow() > 1) sheetP.deleteRows(2, sheetP.getLastRow() - 1);
      if (sheetT.getLastRow() > 1) sheetT.deleteRows(2, sheetT.getLastRow() - 1);
      if (sheetH.getLastRow() > 1) sheetH.deleteRows(2, sheetH.getLastRow() - 1);
      if (sheetBK && sheetBK.getLastRow() > 1) sheetBK.deleteRows(2, sheetBK.getLastRow() - 1);
      if (sheetHT && sheetHT.getLastRow() > 1) sheetHT.deleteRows(2, sheetHT.getLastRow() - 1);

      // Tulis Pelanggan
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

      // Tulis Transaksi
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

      // Tulis Penukaran Hadiah
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

      // Tulis Buku Kas Umum
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

      // Tulis Hutang Pelanggan
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
        message: "Sinkronisasi penuh ke Spreadsheet berhasil!"
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
            if (data.settledTransactionCode) {
              sheetSettleDebt.getRange(dRow, 12).setValue(data.settledTransactionCode);
            }
            break;
          }
        }
      }
      if (data.customerId !== undefined && data.newBalance !== undefined) {
        updateCustomerBalance(ss, data.customerId, data.newBalance);
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

