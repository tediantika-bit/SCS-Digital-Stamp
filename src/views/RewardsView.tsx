import React from 'react';
import { Gift, Sparkles, CheckCircle2, Clock, Award, Users, AlertCircle } from 'lucide-react';
import { Customer, Reward, Redemption, StampLedger, StoreSettings } from '../types';
import { getCustomerStampBalance, formatDate } from '../utils/storage';
import { WhatsAppButton } from '../components/WhatsAppButton';
import { createRedemptionWAMessage, sendWhatsAppMessage } from '../utils/whatsapp';

interface Props {
  customers: Customer[];
  rewards: Reward[];
  redemptions: Redemption[];
  ledgers: StampLedger[];
  settings: StoreSettings;
  onRedeemReward: (customer: Customer) => void;
}

export const RewardsView: React.FC<Props> = ({
  customers,
  rewards,
  redemptions,
  ledgers,
  settings,
  onRedeemReward,
}) => {
  const defaultReward = {
    name: settings.defaultRewardName || rewards[0]?.name || 'Minyak goreng 500 ml',
    requiredStamps: settings.rewardRequiredStamps || rewards[0]?.requiredStamps || 25,
    description: `Hadiah utama per ${settings.rewardRequiredStamps || 25} stempel`,
  };

  const eligibleCustomers = customers
    .map(c => ({
      customer: c,
      balance: getCustomerStampBalance(c.id, ledgers),
    }))
    .filter(item => item.customer.status === 'active' && item.balance >= (settings.rewardRequiredStamps || 25));

  const sortedRedemptions = [...redemptions].sort(
    (a, b) => new Date(b.redeemedAt).getTime() - new Date(a.redeemedAt).getTime()
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Gift className="w-6 h-6 text-amber-500" />
          <span>Penukaran & Pengelolaan Hadiah</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Kelola klaim hadiah loyalitas untuk pelanggan yang telah mengumpulkan minimal {defaultReward.requiredStamps} stempel
        </p>
      </div>

      {/* Hero Reward Spotlight Card */}
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-3xl p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center font-bold text-white shrink-0 shadow-xs border border-white/30">
            <Gift className="w-9 h-9" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/20 text-[10px] font-bold text-white uppercase tracking-wider mb-1">
              Hadiah Utama Loyalitas
            </div>
            <h3 className="text-xl sm:text-2xl font-black tracking-tight">
              {defaultReward.name}
            </h3>
            <p className="text-xs text-amber-100 mt-1 max-w-lg">
              Setiap {defaultReward.requiredStamps} stempel dapat ditukarkan dengan {defaultReward.name}. Stempel sisa tetap dibawa ke periode kartu berikutnya.
            </p>
          </div>
        </div>

        <div className="bg-white/15 backdrop-blur-xs rounded-2xl p-4 border border-white/20 shrink-0 text-center sm:text-right">
          <span className="text-[11px] text-amber-100 font-semibold uppercase tracking-wider block">
            Syarat Stempel
          </span>
          <p className="text-3xl font-black tabular-nums tracking-tight">
            {defaultReward.requiredStamps} <span className="text-sm font-semibold text-white/90">Stempel</span>
          </p>
          <span className="text-[11px] text-amber-100 block mt-1">
            Total Ditukarkan: {redemptions.length} kali
          </span>
        </div>
      </div>

      {/* Eligible Customers Section */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-800">Pelanggan yang Berhak Klaim Hadiah</h3>
              <p className="text-[11px] text-slate-500">Saldo stempel telah mencapai atau melampaui 25 stempel</p>
            </div>
          </div>

          <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 tabular-nums">
            {eligibleCustomers.length} Pelanggan
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {eligibleCustomers.length === 0 ? (
            <div className="col-span-full py-10 text-center text-slate-400">
              <Gift className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-bold text-slate-600">Saat ini belum ada pelanggan yang mencapai 25 stempel</p>
              <p className="text-xs text-slate-400 mt-1">Pelanggan akan otomatis muncul di sini saat saldo transaksi mencapai minimal 25 stempel.</p>
            </div>
          ) : (
            eligibleCustomers.map(({ customer, balance }) => {
              const surplus = balance - (settings.rewardRequiredStamps || 25);

              return (
                <div
                  key={customer.id}
                  className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 flex flex-col justify-between gap-3 shadow-xs"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold text-emerald-800 bg-emerald-200/60 px-2 py-0.5 rounded-md">
                        {customer.customerCode}
                      </span>
                      <span className="text-xs font-black text-emerald-700 tabular-nums">
                        {balance} Stempel
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-slate-900 mt-2">
                      {customer.name}
                    </h4>
                    {customer.phone && (
                      <p className="text-xs text-slate-500 mt-0.5">{customer.phone}</p>
                    )}

                    <p className="text-[11px] text-emerald-800 mt-2 font-medium">
                      Siap tukar 1 {defaultReward.name}.
                      {surplus > 0 && ` Sisa +${surplus} stempel dibawa ke kartu berikutnya.`}
                    </p>
                  </div>

                  <button
                    onClick={() => onRedeemReward(customer)}
                    className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <Gift className="w-4 h-4" />
                    <span>Konfirmasi Tukar Hadiah</span>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Redemption History Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-purple-100 text-purple-700">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-800">Riwayat Penukaran Hadiah</h3>
              <p className="text-[11px] text-slate-500">Catatan serah terima hadiah loyalitas kepada pelanggan</p>
            </div>
          </div>

          <span className="text-xs text-slate-500 font-medium">
            Total {sortedRedemptions.length} penukaran
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
              <tr>
                <th className="px-4 py-3">Kode / Waktu</th>
                <th className="px-4 py-3">Nama Pelanggan</th>
                <th className="px-4 py-3">Hadiah yang Diberikan</th>
                <th className="px-4 py-3 text-center">Stempel Dipotong</th>
                <th className="px-4 py-3">Dikonfirmasi Oleh</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedRedemptions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                    <Gift className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">Belum ada riwayat penukaran hadiah</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Penukaran yang dikonfirmasi akan tercatat di sini</p>
                  </td>
                </tr>
              ) : (
                sortedRedemptions.map(rdm => {
                  const cust = customers.find(c => c.id === rdm.customerId) || {
                    id: rdm.customerId,
                    name: rdm.customerName,
                    customerCode: 'MEMBER',
                    qrToken: 'scs_member',
                    status: 'active' as const,
                    createdAt: rdm.redeemedAt,
                  };
                  const curBal = getCustomerStampBalance(cust.id, ledgers);

                  return (
                    <tr key={rdm.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-slate-800 block">
                          {rdm.redemptionCode}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {formatDate(rdm.redeemedAt)}
                        </span>
                      </td>

                      <td className="px-4 py-3 font-bold text-slate-900">
                        {rdm.customerName}
                      </td>

                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-800 block">
                          {rdm.rewardName}
                        </span>
                        {rdm.notes && (
                          <span className="text-[10px] text-slate-400 block truncate max-w-xs">
                            {rdm.notes}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-50 text-rose-700 border border-rose-200 tabular-nums">
                          -{rdm.stampsUsed}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-slate-600">
                        {rdm.redeemedBy || 'Admin SCS'}
                      </td>

                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Diserahkan
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <WhatsAppButton
                          variant="icon"
                          onClick={() => {
                            const msg = createRedemptionWAMessage(cust, rdm, curBal, settings);
                            sendWhatsAppMessage(cust.phone, msg);
                          }}
                          title="Kirim Bukti Penukaran via WhatsApp"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
