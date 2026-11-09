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

  // Hapus Sheet1 bawaan jika kosong
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
        t.status || "confirmed"
      ]);
      
      // Update saldo stempel pelanggan
      updateCustomerBalance(ss, t.customerId, data.newBalance);
      
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
      
      // Bersihkan data lama agar tidak duplikat (header baris 1 tetap ada)
      if (sheetP.getLastRow() > 1) sheetP.deleteRows(2, sheetP.getLastRow() - 1);
      if (sheetT.getLastRow() > 1) sheetT.deleteRows(2, sheetT.getLastRow() - 1);
      if (sheetH.getLastRow() > 1) sheetH.deleteRows(2, sheetH.getLastRow() - 1);

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
            t.status
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

