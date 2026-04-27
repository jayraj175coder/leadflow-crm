import { useEffect, useState } from "react";
import { createPayout, fetchDashboard, fetchMerchants } from "./api";

function formatPaise(value) {
  const paise = BigInt(value || 0);
  const sign = paise < 0n ? "-" : "";
  const absolutePaise = paise < 0n ? -paise : paise;
  const rupees = absolutePaise / 100n;
  const fraction = (absolutePaise % 100n).toString().padStart(2, "0");
  return `${sign}Rs. ${new Intl.NumberFormat("en-IN").format(rupees)}.${fraction}`;
}

function statusTone(state) {
  if (state === "completed") return "bg-emerald-100 text-emerald-800";
  if (state === "failed") return "bg-rose-100 text-rose-800";
  if (state === "processing") return "bg-amber-100 text-amber-800";
  return "bg-slate-200 text-slate-800";
}

export default function App() {
  const [merchants, setMerchants] = useState([]);
  const [selectedMerchant, setSelectedMerchant] = useState("");
  const [dashboard, setDashboard] = useState(null);
  const [amountPaise, setAmountPaise] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchMerchants()
      .then((items) => {
        setMerchants(items);
        if (items.length > 0) {
          setSelectedMerchant(items[0].external_id);
        }
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!selectedMerchant) return undefined;

    let cancelled = false;

    const loadDashboard = async () => {
      try {
        const data = await fetchDashboard(selectedMerchant);
        if (!cancelled) {
          setDashboard(data);
          setBankAccountId((currentValue) => {
            if (currentValue) {
              return currentValue;
            }
            return data.bank_accounts.length > 0 ? String(data.bank_accounts[0].id) : "";
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
        }
      }
    };

    loadDashboard();
    const intervalId = window.setInterval(loadDashboard, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [selectedMerchant]);

  const cards = dashboard
    ? [
        {
          label: "Available balance",
          value: formatPaise(dashboard.available_balance_paise),
          accent: "from-emerald-500 to-teal-500",
        },
        {
          label: "Held balance",
          value: formatPaise(dashboard.held_balance_paise),
          accent: "from-amber-500 to-orange-500",
        },
        {
          label: "Net ledger balance",
          value: formatPaise(dashboard.ledger_balance_paise),
          accent: "from-sky-500 to-indigo-500",
        },
      ]
    : [];

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await createPayout(
        selectedMerchant,
        {
          amount_paise: Number(amountPaise),
          bank_account_id: Number(bankAccountId),
        },
        crypto.randomUUID()
      );
      setAmountPaise("");
      const refreshed = await fetchDashboard(selectedMerchant);
      setDashboard(refreshed);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_35%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] text-ink">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-card backdrop-blur sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-700">Playto Payout Engine</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Merchant treasury with real holds, retries, and idempotent payouts.</h1>
              <p className="mt-3 max-w-3xl text-sm text-slate-600 sm:text-base">
                Balances come from the append-only ledger, held funds move instantly on request creation, and payout states refresh every five seconds.
              </p>
            </div>
            <div className="w-full max-w-sm">
              <label className="mb-2 block text-sm font-medium text-slate-700">Merchant</label>
              <select
                value={selectedMerchant}
                onChange={(event) => {
                  setSelectedMerchant(event.target.value);
                  setBankAccountId("");
                }}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-emerald-400"
              >
                {merchants.map((merchant) => (
                  <option key={merchant.external_id} value={merchant.external_id}>
                    {merchant.legal_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error ? (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
          ) : null}

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {cards.map((card) => (
              <div key={card.label} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className={`h-2 bg-gradient-to-r ${card.accent}`} />
                <div className="p-5">
                  <p className="text-sm text-slate-500">{card.label}</p>
                  <p className="mt-2 text-3xl font-semibold">{card.value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Recent payouts</h2>
                <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Live polling</span>
              </div>
              <div className="mt-5 space-y-4">
                {dashboard?.recent_payouts?.length ? (
                  dashboard.recent_payouts.map((payout) => (
                    <div key={payout.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-base font-semibold">{formatPaise(payout.amount_paise)}</p>
                          <p className="text-xs text-slate-500">
                            {payout.bank_account.bank_name} | {payout.bank_account.masked_account_number}
                          </p>
                        </div>
                        <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${statusTone(payout.state)}`}>
                          {payout.state}
                        </span>
                      </div>
                      <p className="mt-3 break-all text-xs text-slate-400">{payout.id}</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
                    No payouts yet for this merchant.
                  </div>
                )}
              </div>
            </section>

            <section className="space-y-6">
              <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold">Create payout</h2>
                <div className="mt-5 space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Amount (paise)</label>
                    <input
                      type="number"
                      min="1"
                      value={amountPaise}
                      onChange={(event) => setAmountPaise(event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-emerald-400"
                      placeholder="25000"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Bank account</label>
                    <select
                      value={bankAccountId}
                      onChange={(event) => setBankAccountId(event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-emerald-400"
                      required
                    >
                      {(dashboard?.bank_accounts || []).map((bankAccount) => (
                        <option key={bankAccount.id} value={bankAccount.id}>
                          {bankAccount.bank_name} | {bankAccount.masked_account_number}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={submitting || !selectedMerchant || !bankAccountId}
                    className="w-full rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    {submitting ? "Submitting..." : "Submit payout"}
                  </button>
                </div>
              </form>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold">Ledger history</h2>
                <div className="mt-5 space-y-3">
                  {(dashboard?.recent_transactions || []).map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
                      <div>
                        <p className="text-sm font-medium">{entry.reference}</p>
                        <p className="text-xs text-slate-500">
                          {entry.bucket} | {entry.entry_type}
                        </p>
                      </div>
                      <p className="text-sm font-semibold">{formatPaise(entry.amount_paise)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
