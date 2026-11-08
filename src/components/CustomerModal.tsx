import React, { useState } from 'react';
import { X, UserPlus, UserCheck, Phone, User, FileText } from 'lucide-react';
import { Customer, StoreSettings } from '../types';
import { generateQrToken } from '../utils/storage';
import { WhatsAppIcon } from './WhatsAppButton';
import { sendWhatsAppMessage, getCustomerCardUrl } from '../utils/whatsapp';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  customer?: Customer | null;
  existingCount: number;
  settings?: StoreSettings;
  onSave: (customer: Customer) => void;
}

export const CustomerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  customer,
  existingCount,
  settings,
  onSave,
}) => {
  const isEditing = !!customer;
  const [name, setName] = useState(customer?.name || '');
  const [phone, setPhone] = useState(customer?.phone || '');
  const [notes, setNotes] = useState(customer?.notes || '');
  const [status, setStatus] = useState<'active' | 'inactive'>(customer?.status || 'active');
  const [sendWelcomeWA, setSendWelcomeWA] = useState(!isEditing);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (isEditing && customer) {
      onSave({
        ...customer,
        name: name.trim(),
        phone: phone.trim() || undefined,
        notes: notes.trim() || undefined,
        status,
      });
    } else {
      const codeNum = String(existingCount + 1).padStart(3, '0');
      const newCustomer: Customer = {
        id: `cust-${Date.now()}`,
        customerCode: `SCS-${codeNum}`,
        name: name.trim(),
        phone: phone.trim() || undefined,
        notes: notes.trim() || undefined,
        qrToken: generateQrToken(name),
        status: 'active',
        createdAt: new Date().toISOString(),
      };
      onSave(newCustomer);

      if (sendWelcomeWA && newCustomer.phone && settings) {
        const cardUrl = getCustomerCardUrl(newCustomer.qrToken);
        const welcomeMsg = `⭐ *SELAMAT BERGABUNG DI MEMBER ${settings.storeName.toUpperCase()}!*
----------------------------------------
Halo Kak *${newCustomer.name}*,
Kartu stempel digital Anda telah berhasil diaktifkan!

🔖 *ID Pelanggan:* ${newCustomer.customerCode}
🎁 *Hadiah Utama:* ${settings.defaultRewardName} (per 25 stempel)
✨ *Ketentuan:* Setiap transaksi kelipatan Rp${new Intl.NumberFormat('id-ID').format(settings.stampThreshold)} otomatis mendapatkan 1 stempel.

Lihat kartu stempel digital Anda:
${cardUrl}

Tunjukkan ID atau nomor HP Anda ke kasir ${settings.storeName} saat bertransaksi!
*${settings.storeName}* - ${settings.storeAddress}`;

        sendWhatsAppMessage(newCustomer.phone, welcomeMsg);
      }
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-md max-h-[92vh] flex flex-col rounded-3xl bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="shrink-0 bg-gradient-to-r from-orange-600 to-amber-600 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/20 backdrop-blur-xs">
              {isEditing ? <UserCheck className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                {isEditing ? 'Edit Data Pelanggan' : 'Pendaftaran Pelanggan Baru'}
              </h3>
              <p className="text-xs text-orange-100">
                {isEditing ? customer?.customerCode : 'Otomatis membuat ID & QR Code unik'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-orange-100 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Nama Lengkap Pelanggan <span className="text-orange-600">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                autoFocus
                placeholder="Contoh: Budi Santoso"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-xs font-semibold text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Nomor Handphone (WhatsApp)
              <span className="text-[10px] font-normal text-slate-400 ml-1">(Opsional untuk pencarian)</span>
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="tel"
                placeholder="0812-xxxx-xxxx"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-xs text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Catatan Pelanggan
              <span className="text-[10px] font-normal text-slate-400 ml-1">(Opsional)</span>
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Contoh: Pelanggan token listrik / langganan kantor"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
          </div>

          {isEditing && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Status Pelanggan
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setStatus('active')}
                  className={`py-2 text-xs font-semibold rounded-xl border transition ${
                    status === 'active'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                      : 'border-slate-200 text-slate-500'
                  }`}
                >
                  Aktif
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('inactive')}
                  className={`py-2 text-xs font-semibold rounded-xl border transition ${
                    status === 'inactive'
                      ? 'bg-rose-50 border-rose-500 text-rose-700'
                      : 'border-slate-200 text-slate-500'
                  }`}
                >
                  Nonaktif
                </button>
              </div>
            </div>
          )}

          {!isEditing && (
            <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={sendWelcomeWA}
                  onChange={e => setSendWelcomeWA(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                />
                <div className="flex items-center gap-1.5 text-xs text-emerald-950 font-semibold">
                  <WhatsAppIcon className="w-4 h-4 text-emerald-600" />
                  <span>Kirim Tautan Kartu via WhatsApp</span>
                </div>
              </label>
              <span className="text-[10px] text-emerald-700 font-mono">
                {phone ? phone : 'Nomor WA'}
              </span>
            </div>
          )}
          </div>

          <div className="shrink-0 px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-md shadow-orange-600/20 active:scale-95 transition"
            >
              {isEditing ? 'Simpan Perubahan' : 'Daftarkan Pelanggan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
