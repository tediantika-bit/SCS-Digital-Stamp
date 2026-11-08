import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { Gift, X, CheckCircle2, AlertTriangle, ArrowRight, Sparkles, Phone } from 'lucide-react';
import { Customer, Reward, StoreSettings, Redemption } from '../types';
import { sound } from '../utils/audio';
import { WhatsAppIcon } from './WhatsAppButton';
import { createRedemptionWAMessage, sendWhatsAppMessage } from '../utils/whatsapp';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
  currentBalance: number;
  rewards: Reward[];
  settings: StoreSettings;
  onConfirmRedeem: (data: {
    customerId: string;
    customerName: string;
    rewardId: string;
    rewardName: string;
    stampsUsed: number;
    notes?: string;
  }) => Redemption | void;
}

export const RedemptionModal: React.FC<Props> = ({
  isOpen,
  onClose,
  customer,
  currentBalance,
  rewards,
  settings,
  onConfirmRedeem,
}) => {
  const [selectedRewardId, setSelectedRewardId] = useState(rewards[0]?.id || '');
  const [notes, setNotes] = useState('');
  const [sendWA, setSendWA] = useState(!!customer.phone);

  if (!isOpen) return null;

  const selectedReward = rewards.find(r => r.id === selectedRewardId) || rewards[0] || {
    id: 'reward-1',
    name: settings.defaultRewardName || 'Minyak goreng 500 ml',
    requiredStamps: settings.rewardRequiredStamps || 25,
    description: 'Hadiah utama per 25 stempel',
    status: 'active' as const,
  };
  const requiredStamps = selectedReward ? selectedReward.requiredStamps : (settings.rewardRequiredStamps || 25);
  const canRedeem = currentBalance >= requiredStamps;
  const balanceAfter = Math.max(0, currentBalance - requiredStamps);

  const handleConfirm = () => {
    if (!canRedeem) return;

    // Trigger confetti explosion
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#ea580c', '#f59e0b', '#10b981', '#3b82f6'],
      });
    } catch {
      // Ignore
    }

    sound.playSuccessFanfare();

    const createdRedemption = onConfirmRedeem({
      customerId: customer.id,
      customerName: customer.name,
      rewardId: selectedReward.id,
      rewardName: selectedReward.name,
      stampsUsed: requiredStamps,
      notes: notes.trim() || undefined,
    });

    if (sendWA) {
      const rdmToUse: Redemption = createdRedemption || {
        id: `rdm-${Date.now()}`,
        redemptionCode: `RDM-${Date.now().toString(36).toUpperCase()}`,
        customerId: customer.id,
        customerName: customer.name,
        rewardId: selectedReward.id,
        rewardName: selectedReward.name,
        stampsUsed: requiredStamps,
        status: 'completed',
        redeemedBy: 'Admin SCS',
        redeemedAt: new Date().toISOString(),
        notes: notes.trim() || undefined,
      };

      const msg = createRedemptionWAMessage(customer, rdmToUse, balanceAfter, settings);
      sendWhatsAppMessage(customer.phone, msg);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-md max-h-[92vh] flex flex-col rounded-3xl bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header - Always Fixed at Top */}
        <div className="shrink-0 bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/20 backdrop-blur-xs">
              <Gift className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Konfirmasi Penukaran Hadiah</h3>
              <p className="text-xs text-emerald-100">{customer.name} ({customer.customerCode})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-emerald-100 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {/* Reward Picker */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Pilih Hadiah yang Diberikan
            </label>
            <div className="space-y-2">
              {rewards.map(reward => {
                const isSelected = reward.id === selectedRewardId;
                const isEligible = currentBalance >= reward.requiredStamps;

                return (
                  <button
                    key={reward.id}
                    type="button"
                    onClick={() => setSelectedRewardId(reward.id)}
                    className={`w-full p-3 rounded-2xl border text-left transition flex items-center justify-between ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/70 shadow-xs'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        <Gift className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-bold text-xs text-slate-900">{reward.name}</p>
                        <p className="text-[11px] text-slate-500">
                          {reward.description}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 ml-2">
                      <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                        {reward.requiredStamps} Stempel
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stamp Balance Deduction Calculation */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <p className="text-xs font-bold text-slate-700 mb-2">Perhitungan Saldo Stempel:</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white p-2 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Stempel Saat Ini</span>
                <p className="text-base font-black text-slate-800 tabular-nums">{currentBalance}</p>
              </div>
              <div className="bg-rose-50 p-2 rounded-xl border border-rose-200">
                <span className="text-[10px] text-rose-600 uppercase font-semibold">Dipotong</span>
                <p className="text-base font-black text-rose-600 tabular-nums">-{requiredStamps}</p>
              </div>
              <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-200">
                <span className="text-[10px] text-emerald-700 uppercase font-semibold">Sisa Stempel</span>
                <p className="text-base font-black text-emerald-700 tabular-nums">{balanceAfter}</p>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 mt-2.5 leading-relaxed">
              Sisa <strong>{balanceAfter} stempel</strong> akan otomatis tetap disimpan dan dibawa ke lembar kartu periode berikutnya.
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Catatan Penukaran (Opsional)
            </label>
            <input
              type="text"
              placeholder="Contoh: Diterima langsung oleh pelanggan"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          {/* WhatsApp Receipt Checkbox */}
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-between">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={sendWA}
                onChange={e => setSendWA(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
              />
              <div className="flex items-center gap-1.5 text-xs text-emerald-950 font-semibold">
                <WhatsAppIcon className="w-4 h-4 text-emerald-600" />
                <span>Kirim Bukti Penukaran via WhatsApp</span>
              </div>
            </label>
            <span className="text-[10px] text-emerald-700 font-mono">
              {customer.phone || 'Nomor HP'}
            </span>
          </div>

          {!canRedeem && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>Saldo pelanggan ({currentBalance}) belum mencukupi {requiredStamps} stempel untuk hadiah ini.</span>
            </div>
          )}

        </div>

        {/* Sticky Actions Footer - Always 100% visible */}
        <div className="shrink-0 px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={!canRedeem}
            onClick={handleConfirm}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:pointer-events-none text-white text-xs font-extrabold shadow-md shadow-emerald-600/25 active:scale-95 transition"
          >
            <Sparkles className="w-4 h-4 text-emerald-100" />
            <span>Konfirmasi Hadiah Diberikan</span>
          </button>
        </div>
      </div>
    </div>
  );
};
