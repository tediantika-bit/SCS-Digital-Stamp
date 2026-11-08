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

      return ContentService.createTextOutput(JSON.stringify({ 
        success: true, 
        message: "Sinkronisasi penuh ke Spreadsheet berhasil!"
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
