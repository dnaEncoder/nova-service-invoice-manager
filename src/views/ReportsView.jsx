import { motion } from "framer-motion";
import { calculateInvoice, computeInvoiceStatus } from "../lib/calculations";
import { formatCurrency, todayISO } from "../lib/utils";
import { INVOICE_STATUSES } from "../lib/constants";
import StatusBadge from "../components/ui/StatusBadge";

function getMonthLabel(offset) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - offset);
  return {
    key: d.toISOString().slice(0, 7), // "YYYY-MM"
    label: d.toLocaleString("default", { month: "short", year: "2-digit" }),
  };
}

export default function ReportsView({ data }) {
  const today = todayISO();

  // ── Summary ──────────────────────────────────────────────────────────────────

  const allTotals = data.invoices.map((inv) => calculateInvoice(inv, data.payments));
  const totalInvoiced = allTotals.reduce((s, t) => s + t.total, 0);
  const totalCollected = allTotals.reduce((s, t) => s + t.paid, 0);
  const totalOutstanding = allTotals.reduce((s, t) => s + t.due, 0);
  const collectionRate = totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0;

  // ── Status breakdown ─────────────────────────────────────────────────────────

  const statusCounts = {};
  const statusAmounts = {};
  INVOICE_STATUSES.forEach((s) => { statusCounts[s] = 0; statusAmounts[s] = 0; });
  data.invoices.forEach((inv) => {
    const status = computeInvoiceStatus(inv, data.payments);
    statusCounts[status] = (statusCounts[status] || 0) + 1;
    statusAmounts[status] = (statusAmounts[status] || 0) + calculateInvoice(inv, data.payments).total;
  });

  // ── Monthly collections (last 6 months) ──────────────────────────────────────

  const months = Array.from({ length: 6 }, (_, i) => getMonthLabel(5 - i));
  const monthlyAmounts = months.map(({ key }) =>
    data.payments
      .filter((p) => (p.date || "").startsWith(key))
      .reduce((s, p) => s + Number(p.amount || 0), 0)
  );
  const maxMonthly = Math.max(...monthlyAmounts, 1);

  // ── Overdue aging ─────────────────────────────────────────────────────────────

  const overdueInvoices = data.invoices.filter(
    (inv) => computeInvoiceStatus(inv, data.payments) === "Overdue"
  );
  const aging = [
    { label: "1–30 days", min: 1, max: 30 },
    { label: "31–60 days", min: 31, max: 60 },
    { label: "61–90 days", min: 61, max: 90 },
    { label: "90+ days", min: 91, max: Infinity },
  ].map((bucket) => {
    const matched = overdueInvoices.filter((inv) => {
      const days = Math.floor((new Date(today) - new Date(inv.dueDate)) / 86400000);
      return days >= bucket.min && days <= bucket.max;
    });
    return {
      ...bucket,
      count: matched.length,
      amount: matched.reduce((s, inv) => s + calculateInvoice(inv, data.payments).due, 0),
    };
  });

  // ── Top clients by outstanding ───────────────────────────────────────────────

  const clientOutstanding = data.clients.map((client) => {
    const projects = data.projects.filter((p) => p.clientId === client.id);
    const invoices = data.invoices.filter((inv) => projects.some((p) => p.id === inv.projectId));
    const outstanding = invoices.reduce((s, inv) => {
      const status = computeInvoiceStatus(inv, data.payments);
      if (status === "Paid" || status === "Voided") return s;
      return s + calculateInvoice(inv, data.payments).due;
    }, 0);
    const collected = invoices.reduce((s, inv) => s + calculateInvoice(inv, data.payments).paid, 0);
    return { client, outstanding, collected };
  })
    .filter((c) => c.outstanding > 0 || c.collected > 0)
    .sort((a, b) => b.outstanding - a.outstanding)
    .slice(0, 6);

  const maxClientOutstanding = Math.max(...clientOutstanding.map((c) => c.outstanding + c.collected), 1);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-950">Reports</h1>
        <p className="text-sm text-slate-500">Billing health, collection trends, and pipeline analytics.</p>
      </div>

      {/* KPI row */}
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total Invoiced", value: formatCurrency(totalInvoiced), sub: `${data.invoices.length} invoices` },
          { label: "Collected", value: formatCurrency(totalCollected), sub: `${collectionRate}% rate` },
          { label: "Outstanding", value: formatCurrency(totalOutstanding), sub: `${statusCounts["Overdue"] || 0} overdue` },
          { label: "Collection Rate", value: `${collectionRate}%`, sub: "of total invoiced" },
        ].map((c) => (
          <div key={c.label} className="rounded-[1.75rem] bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">{c.label}</p>
            <h3 className="mt-1 text-xl font-black text-slate-950">{c.value}</h3>
            <p className="mt-1 text-xs text-slate-400">{c.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">

        {/* Monthly collection chart */}
        <div className="rounded-[2rem] bg-white p-5 shadow-sm">
          <h2 className="mb-5 font-bold text-slate-950">Monthly Collections</h2>
          <div className="flex items-end gap-2 h-40">
            {months.map(({ key, label }, i) => {
              const amt = monthlyAmounts[i];
              const heightPct = Math.max((amt / maxMonthly) * 100, 2);
              const isThisMonth = key === today.slice(0, 7);
              return (
                <div key={key} className="flex flex-1 flex-col items-center gap-1">
                  <p className="text-[10px] text-slate-500">{amt > 0 ? formatCurrency(amt).replace("₹", "₹") : ""}</p>
                  <div className="w-full flex items-end" style={{ height: "100px" }}>
                    <div
                      className={`w-full rounded-t-xl transition-all ${isThisMonth ? "bg-blue-500" : "bg-slate-200"}`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <p className={`text-[11px] font-semibold ${isThisMonth ? "text-blue-600" : "text-slate-400"}`}>{label}</p>
                </div>
              );
            })}
          </div>
          {monthlyAmounts.every((a) => a === 0) && (
            <p className="mt-4 text-center text-sm text-slate-400">No payment data in the last 6 months.</p>
          )}
        </div>

        {/* Invoice status breakdown */}
        <div className="rounded-[2rem] bg-white p-5 shadow-sm">
          <h2 className="mb-5 font-bold text-slate-950">Invoice Status Breakdown</h2>
          <div className="space-y-3">
            {INVOICE_STATUSES.filter((s) => statusCounts[s] > 0).map((s) => {
              const pct = data.invoices.length > 0 ? Math.round((statusCounts[s] / data.invoices.length) * 100) : 0;
              return (
                <div key={s} className="flex items-center gap-3">
                  <div className="w-24 flex-shrink-0">
                    <StatusBadge status={s} />
                  </div>
                  <div className="flex-1">
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-slate-400 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <span className="w-6 text-right text-sm font-bold text-slate-950">{statusCounts[s]}</span>
                  <span className="w-20 text-right text-xs text-slate-400">{formatCurrency(statusAmounts[s])}</span>
                </div>
              );
            })}
            {!data.invoices.length && <p className="text-sm text-slate-400">No invoices yet.</p>}
          </div>
        </div>

        {/* Overdue aging */}
        <div className="rounded-[2rem] bg-white p-5 shadow-sm">
          <h2 className="mb-1 font-bold text-slate-950">Overdue Aging</h2>
          <p className="mb-5 text-sm text-slate-400">{overdueInvoices.length} overdue invoice{overdueInvoices.length !== 1 ? "s" : ""}</p>
          {overdueInvoices.length === 0 ? (
            <div className="py-8 text-center">
              <p className="font-semibold text-emerald-600">All clear — no overdue invoices.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {aging.map((bucket) => (
                <div key={bucket.label} className={`flex items-center justify-between rounded-2xl px-4 py-3 ${
                  bucket.min > 60 ? "bg-rose-50" : bucket.min > 30 ? "bg-amber-50" : "bg-slate-50"
                }`}>
                  <div>
                    <p className="font-semibold text-slate-950">{bucket.label}</p>
                    <p className="text-xs text-slate-400">{bucket.count} invoice{bucket.count !== 1 ? "s" : ""}</p>
                  </div>
                  <p className={`font-black ${bucket.min > 60 ? "text-rose-600" : bucket.min > 30 ? "text-amber-600" : "text-slate-950"}`}>
                    {formatCurrency(bucket.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top clients */}
        <div className="rounded-[2rem] bg-white p-5 shadow-sm">
          <h2 className="mb-5 font-bold text-slate-950">Clients — Collection vs. Outstanding</h2>
          {clientOutstanding.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-8">No client billing data.</p>
          ) : (
            <div className="space-y-4">
              {clientOutstanding.map(({ client, outstanding, collected }) => {
                const total = outstanding + collected;
                const collectedPct = total > 0 ? (collected / total) * 100 : 0;
                const outstandingPct = total > 0 ? (outstanding / total) * 100 : 0;
                return (
                  <div key={client.id}>
                    <div className="mb-1 flex items-center justify-between">
                      <p className="text-sm font-bold text-slate-950 truncate max-w-[160px]">{client.name}</p>
                      {outstanding > 0 && (
                        <span className="text-xs font-bold text-rose-600">{formatCurrency(outstanding)} due</span>
                      )}
                    </div>
                    <div className="flex h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full bg-emerald-400 transition-all" style={{ width: `${collectedPct}%` }} />
                      <div className="h-full bg-rose-300 transition-all" style={{ width: `${outstandingPct}%` }} />
                    </div>
                    <div className="mt-0.5 flex justify-between text-[10px] text-slate-400">
                      <span>Collected {formatCurrency(collected)}</span>
                      <span>Total {formatCurrency(total)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </motion.div>
  );
}
