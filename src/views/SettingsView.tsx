import React, { useState, useEffect } from 'react';
import {
  Settings,
  Store,
  Plus,
  Check,
  Trash2,
  RefreshCw,
  Shield,
  AlertTriangle,
  Save,
  FileSpreadsheet,
  Code,
  ExternalLink,
  Copy,
  CheckCircle2,
  X,
  Sparkles,
} from 'lucide-react';
import { StoreSettings, TransactionCategory, Reward, Customer, Transaction, Redemption, StampLedger } from '../types';
import { formatRupiah, formatDate } from '../utils/storage';
import {
  GOOGLE_APPS_SCRIPT_TEMPLATE,
  testGoogleSheetsConnection,
  syncAllToGoogleSheets,
} from '../utils/googleSheets';

interface Props {
  settings: StoreSettings;
  categories?: TransactionCategory[];
  rewards: Reward[];
  customers?: Customer[];
  transactions?: Transaction[];
  redemptions?: Redemption[];
  ledgers?: StampLedger[];
  onSaveSettings: (settings: StoreSettings) => void;
  onSaveCategories?: (categories: TransactionCategory[]) => void;
  onResetData: () => void;
  onPullData?: () => Promise<any> | void;
  isPulling?: boolean;
}

export const SettingsView: React.FC<Props> = ({
  settings,
  rewards,
  customers = [],
  transactions = [],
  redemptions = [],
  ledgers = [],
  onSaveSettings,
  onResetData,
  onPullData,
  isPulling = false,
}) => {
  const [formData, setFormData] = useState<StoreSettings>({ ...settings });
  const [savedMessage, setSavedMessage] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      ...settings,
    }));
  }, [settings]);

  // Google Sheets state
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ success: boolean; message: string } | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 2500);
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE).then(() => {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    });
  };

  const handleTestConnection = async () => {
    if (!formData.googleSheetsScriptUrl) return;
    setTestingConnection(true);
    setConnectionStatus(null);
    try {
      const res = await testGoogleSheetsConnection(formData.googleSheetsScriptUrl);
      setConnectionStatus(res);
    } catch {
      setConnectionStatus({ success: false, message: 'Tidak dapat menjangkau Google Apps Script.' });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSyncAll = async () => {
    if (!formData.googleSheetsScriptUrl) return;
    setIsSyncing(true);
    setSyncStatus(null);
    try {
      const res = await syncAllToGoogleSheets(
        formData.googleSheetsScriptUrl,
        customers,
        transactions,
        redemptions,
        ledgers,
        formData
      );
      setSyncStatus(res);
      if (res.success) {
        const nowIso = new Date().toISOString();
        const updated = { ...formData, googleSheetsLastSync: nowIso };
        setFormData(updated);
        onSaveSettings(updated);
      }
    } catch (err: any) {
      setSyncStatus({ success: false, message: 'Terjadi kesalahan sinkronisasi.' });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-orange-600" />
          <span>Pengaturan SCS Digital Stamp</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Sesuaikan aturan nominal stempel, jenis hadiah loyalitas, dan database Google Spreadsheet
        </p>
      </div>

      {savedMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>Pengaturan berhasil disimpan!</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Aturan Stempel & Hadiah */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Store className="w-4 h-4 text-orange-600" />
            <span>Aturan Stempel & Hadiah</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Minimal Nominal Transaksi Per 1 Stempel (Rp)
              </label>
              <input
                type="number"
                step="1000"
                min="1000"
                value={formData.stampThreshold}
                onChange={e => setFormData({ ...formData, stampThreshold: parseInt(e.target.value, 10) || 20000 })}
                className="w-full px-3.5 py-2 text-xs font-bold text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 tabular-nums"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                9 layanan PPOB: Min. Rp20.000 = 1 stempel/transaksi. Kategori <strong>Lainnya</strong>: berlaku kelipatan Rp20.000.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Target Stempel Klaim Hadiah
              </label>
              <input
                type="number"
                min="5"
                max="50"
                value={formData.rewardRequiredStamps}
                onChange={e => setFormData({ ...formData, rewardRequiredStamps: parseInt(e.target.value, 10) || 25 })}
                className="w-full px-3.5 py-2 text-xs font-bold text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 tabular-nums"
              />
              <p className="text-[10px] text-slate-500 mt-1">Standar fisik: 25 kotak per lembar.</p>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Nama Hadiah Utama
              </label>
              <input
                type="text"
                value={formData.defaultRewardName}
                onChange={e => setFormData({ ...formData, defaultRewardName: e.target.value })}
                className="w-full px-3.5 py-2 text-xs font-semibold text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
          </div>
        </div>

        {/* Identitas Toko & Akses */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Store className="w-4 h-4 text-orange-600" />
            <span>Identitas Toko & Kontak</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Nama Toko
              </label>
              <input
                type="text"
                value={formData.storeName}
                onChange={e => setFormData({ ...formData, storeName: e.target.value })}
                className="w-full px-3.5 py-2 text-xs font-semibold text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Nomor Telepon / WhatsApp
              </label>
              <input
                type="text"
                value={formData.storePhone}
                onChange={e => setFormData({ ...formData, storePhone: e.target.value })}
                className="w-full px-3.5 py-2 text-xs text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Alamat Toko
              </label>
              <input
                type="text"
                value={formData.storeAddress}
                onChange={e => setFormData({ ...formData, storeAddress: e.target.value })}
                className="w-full px-3.5 py-2 text-xs text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                PIN Admin (Keamanan Akses Kasir)
              </label>
              <input
                type="password"
                maxLength={6}
                value={formData.adminPin}
                onChange={e => setFormData({ ...formData, adminPin: e.target.value })}
                className="w-40 px-3.5 py-2 text-xs font-mono font-bold tracking-widest text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
          </div>
        </div>

        {/* Integrasi Database Google Spreadsheet */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <span>Database Google Spreadsheet</span>
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                    Google Apps Script
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Sinkronkan pelanggan, riwayat transaksi, dan bukti penukaran hadiah ke Google Sheets Anda.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowScriptModal(true)}
              className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl transition border border-emerald-200 shrink-0 flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Code className="w-3.5 h-3.5" />
              <span>Panduan & Kode Script</span>
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              URL Web App Google Apps Script
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                value={formData.googleSheetsScriptUrl || ''}
                onChange={e => setFormData({ ...formData, googleSheetsScriptUrl: e.target.value.trim() })}
                className="flex-1 px-3.5 py-2 text-xs font-mono text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testingConnection || !formData.googleSheetsScriptUrl}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 text-xs font-bold rounded-xl transition shrink-0"
              >
                {testingConnection ? 'Menguji...' : 'Uji Koneksi'}
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Dapatkan URL ini setelah membuat Google Spreadsheet dan men-deploy Google Apps Script sebagai Web App.
            </p>
          </div>

          {connectionStatus && (
            <div className={`p-3 rounded-2xl text-xs flex items-center gap-2 ${
              connectionStatus.success
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}>
              {connectionStatus.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span className="font-medium">{connectionStatus.message}</span>
            </div>
          )}

          {formData.googleSheetsScriptUrl && (
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-[11px] text-slate-500">
                {formData.googleSheetsLastSync ? (
                  <span>Terakhir disinkronkan: <strong>{formatDate(formData.googleSheetsLastSync)}</strong></span>
                ) : (
                  <span>Status: Siap menyinkronkan data toko</span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {onPullData && (
                  <button
                    type="button"
                    onClick={onPullData}
                    disabled={isPulling}
                    className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold transition shadow-xs active:scale-95"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isPulling ? 'animate-spin text-blue-600' : 'text-blue-600'}`} />
                    <span>{isPulling ? 'Menarik data...' : 'Tarik Data dari Spreadsheet'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleSyncAll}
                  disabled={isSyncing}
                  className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition shadow-xs active:scale-95"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Mengirim...' : 'Kirim Semua Data ke Sheets'}</span>
                </button>
              </div>
            </div>
          )}

          {syncStatus && (
            <div className={`p-3 rounded-2xl text-xs flex items-center gap-2 ${
              syncStatus.success
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}>
              {syncStatus.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span className="font-medium">{syncStatus.message}</span>
            </div>
          )}
        </div>

        {/* Submit Save */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Kosongkan / Reset Data Toko</span>
          </button>

          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-md shadow-orange-600/20 active:scale-95 transition"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Semua Perubahan</span>
          </button>
        </div>
      </form>

      {/* Google Apps Script Modal Guide & Copy */}
      {showScriptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="shrink-0 bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-white/20 backdrop-blur-xs">
                  <FileSpreadsheet className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">Panduan Setup Google Spreadsheet</h3>
                  <p className="text-xs text-emerald-100">Hubungkan SCS Digital Stamp ke Google Sheets pribadi Anda</p>
                </div>
              </div>
              <button
                onClick={() => setShowScriptModal(false)}
                className="p-1 rounded-lg text-emerald-100 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-xs text-slate-700 leading-relaxed">
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900">
                <h4 className="font-bold mb-1.5 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>4 Langkah Mudah (Hanya Perlu Dilakukan Sekali):</span>
                </h4>
                <ol className="list-decimal pl-5 space-y-1.5 text-xs font-medium">
                  <li>
                    Buka <strong>Google Drive</strong> (<a href="https://drive.google.com" target="_blank" rel="noreferrer" className="text-orange-600 underline font-bold">drive.google.com</a>) dan buat 1 file <strong>Google Spreadsheet</strong> baru.
                  </li>
                  <li>
                    Di spreadsheet tersebut, klik menu <strong>Extensions (Ekstensi) &gt; Apps Script</strong>.
                  </li>
                  <li>
                    Hapus kode bawaan di editor, lalu klik tombol <strong>"Salin Seluruh Kode Script"</strong> di bawah ini dan <strong>Paste (Tempel)</strong> ke Apps Script.
                  </li>
                  <li>
                    Klik <strong>Deploy &gt; New deployment</strong>, pilih type <strong>Web app</strong>, atur <em>Who has access</em> ke <strong>Anyone</strong>, lalu salin URL yang dihasilkan dan tempelkan ke kolom Pengaturan aplikasi ini.
                  </li>
                </ol>
              </div>

              {/* Code Box */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                    Kode Google Apps Script Siap Pakai:
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyScript}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition active:scale-95 shadow-xs"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? 'Berhasil Disalin!' : 'Salin Seluruh Kode'}</span>
                  </button>
                </div>

                <div className="relative rounded-2xl bg-slate-900 p-4 overflow-x-auto max-h-72 font-mono text-[11px] text-slate-200 border border-slate-800 select-all">
                  <pre>{GOOGLE_APPS_SCRIPT_TEMPLATE}</pre>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="shrink-0 px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              <a
                href="https://drive.google.com"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-emerald-700 hover:underline font-bold flex items-center gap-1"
              >
                <span>Buka Google Drive</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyScript}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Tersalin' : 'Salin Kode'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowScriptModal(false)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition"
                >
                  Tutup Panduan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Reset Modal */}
      {confirmReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl text-center">
            <AlertTriangle className="w-10 h-10 text-rose-600 mx-auto mb-3" />
            <h4 className="font-bold text-base text-slate-900">Kosongkan Semua Data Toko?</h4>
            <p className="text-xs text-slate-500 mt-1 mb-5">
              Tindakan ini akan mengosongkan seluruh data pelanggan, transaksi, dan riwayat stempel agar sistem kembali bersih dan siap untuk transaksi nyata.
            </p>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onResetData();
                  setConfirmReset(false);
                }}
                className="flex-1 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700"
              >
                Ya, Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
