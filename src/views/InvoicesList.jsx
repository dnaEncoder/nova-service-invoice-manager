import { motion } from "framer-motion";
import { CheckCheck, Download, Eye, Plus, Search } from "lucide-react";
import { calculateInvoice, computeInvoiceStatus } from "../lib/calculations";
import { formatCurrency, getClientName, getProjectName } from "../lib/utils";
import { INVOICE_STATUSES } from "../lib/constants";
import StatusBadge from "../components/ui/StatusBadge";
import DarkMetric from "../components/ui/DarkMetric";

export default function InvoicesList({
  data,
  invoices,
  invoiceQuery,
  setInvoiceQuery,
  statusFilter,
  setStatusFilter,
  onView,
  onAddInvoice,
  addPayment,
}) {
  function handleMarkPaid(invoice) {
    const { due } = calculateInvoice(invoice, data.payments);
    if (due <= 0) return;
    addPayment(invoice.id, {
      amount: due,
      date: new Date().toISOString().slice(0, 10),
      mode: "Bank Transfer",
      reference: "",
      notes: "",
    });
  }
  const allInvoices = data.invoices;
  const totalInvoiced = allInvoices.reduce((s, inv) => s + calculateInvoice(inv, data.payments).total, 0);
  const totalCollected = allInvoices.reduce((s, inv) => s + calculateInvoice(inv, data.payments).paid, 0);
  const totalOutstanding = allInvoices.reduce((s, inv) => s + calculateInvoice(inv, data.payments).due, 0);
  const collectionRate = totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0;

  const statusCounts = INVOICE_STATUSES.reduce((acc, s) => {
    acc[s] = allInvoices.filter((inv) => computeInvoiceStatus(inv, data.payments) === s).length;
    return acc;
  }, {});

  // Stage name lookup for an invoice
  function getStageName(invoice) {
    if (!invoice.stageId) return null;
    return data.invoiceStages?.find((s) => s.id === invoice.stageId)?.name || null;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Invoices</h1>
          <p className="text-sm text-slate-500">Manage sent invoices, payment status, and follow-ups.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onAddInvoice}
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Plus size={16} /> New Invoice
          </button>
        </div>
      </div>

      {/* Top stat cards */}
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total Invoices", value: allInvoices.length, sub: `${statusCounts["Draft"] || 0} drafts` },
          { label: "Total Invoiced", value: formatCurrency(totalInvoiced), sub: `${allInvoices.length} invoices` },
          { label: "Collected", value: formatCurrency(totalCollected), sub: `${collectionRate}% collection rate` },
          { label: "Outstanding", value: formatCurrency(totalOutstanding), sub: `${(statusCounts["Overdue"] || 0)} overdue` },
        ].map((card) => (
          <div key={card.label} className="rounded-[1.75rem] bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">{card.label}</p>
            <h3 className="mt-1 text-xl font-black text-slate-950">{card.value}</h3>
            <p className="mt-1 text-xs text-slate-400">{card.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_280px]">
        {/* Main table */}
        <div className="rounded-[2rem] bg-white p-5 shadow-sm">
          {/* Search + filter tabs */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                value={invoiceQuery}
                onChange={(e) => setInvoiceQuery(e.target.value)}
                placeholder="Search invoice, client, project..."
                className="h-11 w-full rounded-2xl bg-slate-100 pl-10 pr-4 text-sm outline-none ring-blue-100 transition focus:ring-4"
              />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {["All", ...INVOICE_STATUSES.filter((s) => s !== "Voided")].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-2xl px-3 py-2 text-xs font-bold transition ${
                    statusFilter === s
                      ? "bg-slate-950 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {s}
                  {s !== "All" && statusCounts[s] > 0 && (
                    <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] ${statusFilter === s ? "bg-white/20" : "bg-slate-200"}`}>
                      {statusCounts[s]}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-[1.5rem] border border-slate-100">
            <table className="w-full min-w-[900px] border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Stage</th>
                  <th className="px-4 py-3">Due Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-right">Paid</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((invoice) => {
                  const totals = calculateInvoice(invoice, data.payments);
                  const computedStatus = computeInvoiceStatus(invoice, data.payments);
                  const stageName = getStageName(invoice);
                  return (
                    <tr key={invoice.id} className="transition hover:bg-slate-50">
                      <td className="px-4 py-4 font-semibold text-blue-600">{invoice.invoiceNo}</td>
                      <td className="px-4 py-4 text-slate-700">{getClientName(data.clients, invoice.clientId)}</td>
                      <td className="px-4 py-4 text-slate-500 max-w-[140px] truncate">{getProjectName(data.projects, invoice.projectId)}</td>
                      <td className="px-4 py-4 text-slate-500">{invoice.type}</td>
                      <td className="px-4 py-4">
                        {stageName
                          ? <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">{stageName}</span>
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-4 text-slate-500">{invoice.dueDate || "—"}</td>
                      <td className="px-4 py-4"><StatusBadge status={computedStatus} /></td>
                      <td className="px-4 py-4 text-right font-bold text-slate-950">{formatCurrency(totals.total)}</td>
                      <td className="px-4 py-4 text-right text-slate-500">{formatCurrency(totals.paid)}</td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-1.5">
                          <button title="View" onClick={() => onView(invoice)} className="rounded-xl bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"><Eye size={14} /></button>
                          {computedStatus !== "Paid" && computedStatus !== "Voided" && (
                            <button
                              title="Mark as Paid"
                              onClick={() => handleMarkPaid(invoice)}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                            >
                              <CheckCheck size={13} /> Paid
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!invoices.length && (
                  <tr>
                    <td colSpan="10" className="px-4 py-12 text-center text-slate-400">No invoices match this filter.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          {/* Payment summary */}
          <div className="rounded-[2rem] bg-slate-950 p-5 text-white shadow-sm">
            <h3 className="mb-4 font-bold">Payment Summary</h3>
            <div className="space-y-3">
              <DarkMetric label="Total Invoiced" value={formatCurrency(totalInvoiced)} />
              <DarkMetric label="Collected" value={formatCurrency(totalCollected)} />
              <DarkMetric label="Outstanding" value={formatCurrency(totalOutstanding)} />
              <DarkMetric label="Collection Rate" value={`${collectionRate}%`} />
            </div>
          </div>

          {/* Status breakdown */}
          <div className="rounded-[2rem] bg-white p-5 shadow-sm">
            <h3 className="mb-4 font-bold text-slate-950">Status Breakdown</h3>
            <div className="space-y-2">
              {INVOICE_STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(statusFilter === s ? "All" : s)}
                  className={`flex w-full items-center justify-between rounded-2xl px-4 py-2.5 transition ${statusFilter === s ? "bg-slate-950 text-white" : "bg-slate-50 hover:bg-slate-100"}`}
                >
                  <StatusBadge status={s} />
                  <span className={`font-black ${statusFilter === s ? "text-white" : "text-slate-950"}`}>{statusCounts[s] || 0}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="rounded-[2rem] bg-white p-5 shadow-sm">
            <h3 className="mb-4 font-bold text-slate-950">Quick Actions</h3>
            <div className="space-y-2">
              <button
                onClick={onAddInvoice}
                className="flex w-full items-center gap-3 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-100"
              >
                <Plus size={16} /> New Invoice
              </button>
              <button
                onClick={() => setStatusFilter("Overdue")}
                className="flex w-full items-center gap-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 hover:bg-rose-100"
              >
                <Download size={16} /> View Overdue
              </button>
              <button
                onClick={() => setStatusFilter("Sent")}
                className="flex w-full items-center gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700 hover:bg-amber-100"
              >
                <Eye size={16} /> View Sent
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
