import { motion } from "framer-motion";
import { Trash2, WalletCards } from "lucide-react";
import { calculateInvoice, computeInvoiceStatus } from "../lib/calculations";
import { formatCurrency, getClientName, getProjectName, todayISO } from "../lib/utils";

const PAYMENT_MODES = ["Bank Transfer", "UPI", "Cash", "Cheque", "Online", "Other"];

function modeColor(mode) {
  const map = {
    "Bank Transfer": "bg-blue-50 text-blue-700",
    "UPI": "bg-violet-50 text-violet-700",
    "Cash": "bg-emerald-50 text-emerald-700",
    "Cheque": "bg-amber-50 text-amber-700",
    "Online": "bg-cyan-50 text-cyan-700",
  };
  return map[mode] || "bg-slate-100 text-slate-600";
}

export default function PaymentsView({ data, deletePayment }) {
  const payments = [...(data.payments || [])].sort(
    (a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt)
  );

  const invoiceMap = Object.fromEntries(data.invoices.map((inv) => [inv.id, inv]));

  const today = todayISO();
  const thisMonth = today.slice(0, 7); // "YYYY-MM"

  const totalCollected = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const thisMonthTotal = payments
    .filter((p) => (p.date || "").startsWith(thisMonth))
    .reduce((s, p) => s + Number(p.amount || 0), 0);
  const avgPayment = payments.length ? totalCollected / payments.length : 0;

  // Outstanding across all invoices
  const totalOutstanding = data.invoices.reduce((s, inv) => {
    const status = computeInvoiceStatus(inv, data.payments);
    if (status === "Paid" || status === "Voided" || status === "Draft") return s;
    return s + calculateInvoice(inv, data.payments).due;
  }, 0);

  // Mode breakdown
  const modeBreakdown = PAYMENT_MODES.map((mode) => ({
    mode,
    amount: payments.filter((p) => p.mode === mode).reduce((s, p) => s + Number(p.amount || 0), 0),
    count: payments.filter((p) => p.mode === mode).length,
  })).filter((m) => m.count > 0);

  const maxModeAmount = Math.max(...modeBreakdown.map((m) => m.amount), 1);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Payments</h1>
          <p className="text-sm text-slate-500">All recorded payment entries across invoices.</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total Collected", value: formatCurrency(totalCollected), sub: `${payments.length} entries` },
          { label: "This Month", value: formatCurrency(thisMonthTotal), sub: today.slice(0, 7).replace("-", " / ") },
          { label: "Still Outstanding", value: formatCurrency(totalOutstanding), sub: "across active invoices" },
          { label: "Avg. Payment", value: formatCurrency(avgPayment), sub: "per entry" },
        ].map((c) => (
          <div key={c.label} className="rounded-[1.75rem] bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">{c.label}</p>
            <h3 className="mt-1 text-xl font-black text-slate-950">{c.value}</h3>
            <p className="mt-1 text-xs text-slate-400">{c.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_280px]">
        {/* Main payments table */}
        <div className="rounded-[2rem] bg-white p-5 shadow-sm">
          {!payments.length ? (
            <div className="flex flex-col items-center gap-3 py-16">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <WalletCards size={24} />
              </div>
              <p className="font-semibold text-slate-500">No payments recorded yet.</p>
              <p className="text-sm text-slate-400">
                Payments will appear here once you mark invoices as paid or record partial payments.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-[1.5rem] border border-slate-100">
              <table className="w-full min-w-[700px] border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Invoice</th>
                    <th className="px-4 py-3">Client</th>
                    <th className="px-4 py-3">Project</th>
                    <th className="px-4 py-3">Mode</th>
                    <th className="px-4 py-3">Reference</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((payment) => {
                    const invoice = invoiceMap[payment.invoiceId];
                    return (
                      <tr key={payment.id} className="hover:bg-slate-50">
                        <td className="px-4 py-4 text-slate-500">{payment.date || "—"}</td>
                        <td className="px-4 py-4 font-semibold text-blue-600">
                          {invoice?.invoiceNo || "—"}
                        </td>
                        <td className="px-4 py-4 text-slate-700">
                          {invoice ? getClientName(data.clients, invoice.clientId) : "—"}
                        </td>
                        <td className="px-4 py-4 max-w-[140px] truncate text-slate-500">
                          {invoice ? getProjectName(data.projects, invoice.projectId) : "—"}
                        </td>
                        <td className="px-4 py-4">
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${modeColor(payment.mode)}`}>
                            {payment.mode || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-slate-400">{payment.reference || "—"}</td>
                        <td className="px-4 py-4 text-right font-bold text-slate-950">
                          {formatCurrency(payment.amount)}
                        </td>
                        <td className="px-4 py-4 text-right">
                          {deletePayment && (
                            <button
                              onClick={() => {
                                if (window.confirm("Delete this payment entry?")) deletePayment(payment.id);
                              }}
                              className="rounded-xl bg-rose-50 p-2 text-rose-600 hover:bg-rose-100"
                              title="Delete payment"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          {/* Payment methods breakdown */}
          <div className="rounded-[2rem] bg-slate-950 p-5 text-white shadow-sm">
            <h3 className="mb-4 font-bold">By Payment Mode</h3>
            {modeBreakdown.length ? (
              <div className="space-y-3">
                {modeBreakdown
                  .sort((a, b) => b.amount - a.amount)
                  .map((m) => (
                    <div key={m.mode}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="text-white/70">{m.mode}</span>
                        <span className="font-bold">{formatCurrency(m.amount)}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-blue-400 transition-all"
                          style={{ width: `${(m.amount / maxModeAmount) * 100}%` }}
                        />
                      </div>
                      <p className="mt-0.5 text-right text-[10px] text-white/40">{m.count} entries</p>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-sm text-white/40">No payments recorded.</p>
            )}
          </div>

          {/* Collection health */}
          <div className="rounded-[2rem] bg-white p-5 shadow-sm">
            <h3 className="mb-4 font-bold text-slate-950">Collection Health</h3>
            <div className="space-y-3">
              {[
                {
                  label: "Collected",
                  amount: totalCollected,
                  total: totalCollected + totalOutstanding,
                  color: "bg-emerald-500",
                },
                {
                  label: "Outstanding",
                  amount: totalOutstanding,
                  total: totalCollected + totalOutstanding,
                  color: "bg-rose-400",
                },
              ].map((item) => {
                const pct = item.total > 0 ? Math.round((item.amount / item.total) * 100) : 0;
                return (
                  <div key={item.label}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-slate-600">{item.label}</span>
                      <span className="font-bold text-slate-950">{pct}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${item.color}`} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-0.5 text-right text-xs text-slate-400">{formatCurrency(item.amount)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
