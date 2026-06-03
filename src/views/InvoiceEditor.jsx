import { useState } from "react";
import { motion } from "framer-motion";
import {
  Ban,
  CheckCircle2,
  FileText,
  GitBranch,
  IndianRupee,
  Lock,
  Plus,
  Save,
  Trash2,
  WalletCards,
  X,
} from "lucide-react";
import { calculateInvoice, computeInvoiceStatus, getProjectSummary } from "../lib/calculations";
import { formatCurrency } from "../lib/utils";
import { todayISO } from "../lib/utils";
import { INVOICE_TYPES, PAYMENT_MODES } from "../lib/constants";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import Textarea from "../components/ui/Textarea";
import Section from "../components/ui/Section";
import SmallMetric from "../components/ui/SmallMetric";
import TotalRow from "../components/ui/TotalRow";
import StatusBadge from "../components/ui/StatusBadge";
import Modal from "../components/ui/Modal";

// ── Sub-components ────────────────────────────────────────────────────────────

function MiniTotals({ totals }) {
  return (
    <div className="rounded-[2rem] bg-slate-950 p-5 text-white shadow-sm">
      <h3 className="mb-4 text-lg font-bold">Live Calculation</h3>
      <TotalRow label="Subtotal" value={formatCurrency(totals.subtotal)} />
      <TotalRow label="GST" value={formatCurrency(totals.taxTotal)} />
      <TotalRow label="Discount" value={`- ${formatCurrency(totals.discount)}`} />
      <div className="my-4 border-t border-white/15" />
      <TotalRow label="Total" value={formatCurrency(totals.total)} large />
      <TotalRow label="Paid" value={formatCurrency(totals.paid)} />
      <TotalRow label="Due" value={formatCurrency(totals.due)} />
    </div>
  );
}

function ProjectTrackerCard({ client, project, summary }) {
  return (
    <div className="rounded-[2rem] bg-white p-5 shadow-sm">
      <h3 className="text-lg font-bold text-slate-950">Linked Project</h3>
      <p className="mt-1 text-sm text-slate-500">
        {client?.name || "Client"} • {project?.name || "Project"}
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <SmallMetric label="Project Value" value={formatCurrency(summary.projectValue)} />
        <SmallMetric label="Invoiced" value={formatCurrency(summary.invoiced)} />
        <SmallMetric label="Already Paid" value={formatCurrency(summary.paid)} />
        <SmallMetric
          label="Balance to Invoice"
          value={formatCurrency(summary.remainingToInvoice)}
          highlight
        />
      </div>
    </div>
  );
}

// ── Linked Stage Summary ──────────────────────────────────────────────────────

const UNLOCK_LABELS = {
  immediate: "Immediate — no condition",
  "previous-paid": "Previous stage must be paid",
  "project-delivered": "Project must be delivered",
  "milestone-approved": "Milestone approval required",
  "period-start": "Billing period start date",
};

const STAGE_STATUS_COLORS = {
  Generated: "bg-blue-500/20 text-blue-300",
  Paid: "bg-emerald-500/20 text-emerald-300",
  Ready: "bg-amber-500/20 text-amber-300",
  Locked: "bg-rose-500/20 text-rose-300",
};

function LinkedStageSummary({ stage }) {
  return (
    <div className="rounded-[2rem] bg-slate-900 p-5 text-white shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <GitBranch size={14} className="text-blue-400" />
        <span className="text-xs font-bold uppercase tracking-widest text-blue-400">Linked Stage</span>
      </div>
      <p className="text-lg font-black leading-snug">{stage.name}</p>
      <p className="mt-0.5 text-2xl font-black text-blue-300">{formatCurrency(stage.amount)}</p>
      <div className="mt-4 space-y-2.5 border-t border-white/10 pt-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-white/50">Status</span>
          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STAGE_STATUS_COLORS[stage.stageStatus] || "bg-white/10 text-white"}`}>
            {stage.stageStatus}
          </span>
        </div>
        {stage.type && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/50">Billing Type</span>
            <span className="text-sm font-semibold">{stage.type}</span>
          </div>
        )}
        {stage.unlockRule && (
          <div className="flex items-start justify-between gap-3">
            <span className="flex-shrink-0 text-sm text-white/50">Trigger</span>
            <span className="text-right text-xs leading-snug text-white/70">
              {UNLOCK_LABELS[stage.unlockRule] || stage.unlockRule}
            </span>
          </div>
        )}
        {stage.dueDate && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/50">Stage Due</span>
            <span className="text-sm font-semibold">{stage.dueDate}</span>
          </div>
        )}
        {stage.stageStatus === "Locked" && (
          <div className="mt-2 flex items-center gap-2 rounded-2xl bg-rose-500/10 px-3 py-2">
            <Lock size={12} className="text-rose-400" />
            <span className="text-xs text-rose-300">Stage is currently locked</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Record Payment Modal ──────────────────────────────────────────────────────

function RecordPaymentModal({ invoiceId, maxAmount, onSave, onClose }) {
  const [form, setForm] = useState({
    amount: maxAmount > 0 ? maxAmount : "",
    date: todayISO(),
    mode: "Bank Transfer",
    reference: "",
    notes: "",
  });

  function set(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) return;
    onSave(invoiceId, {
      amount,
      date: form.date || todayISO(),
      mode: form.mode,
      reference: form.reference,
      notes: form.notes,
    });
    onClose();
  }

  return (
    <Modal title="Record Payment" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Amount Received (₹)"
          type="number"
          value={form.amount}
          onChange={(v) => set("amount", v)}
          required
        />
        <Input
          label="Payment Date"
          type="date"
          value={form.date}
          onChange={(v) => set("date", v)}
        />
        <Select
          label="Payment Mode"
          value={form.mode}
          onChange={(v) => set("mode", v)}
          options={PAYMENT_MODES}
        />
        <Input
          label="Reference / UTR (optional)"
          value={form.reference}
          onChange={(v) => set("reference", v)}
          placeholder="e.g. NEFT-2026-001"
        />
        <Input
          label="Notes (optional)"
          value={form.notes}
          onChange={(v) => set("notes", v)}
        />
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-2xl bg-slate-100 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 rounded-2xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Save Payment
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Payment History ───────────────────────────────────────────────────────────

function PaymentHistory({ invoicePayments, onDelete }) {
  if (!invoicePayments.length) {
    return (
      <p className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
        No payments recorded yet.
      </p>
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-3 py-2.5">Date</th>
            <th className="px-3 py-2.5">Mode</th>
            <th className="px-3 py-2.5">Reference</th>
            <th className="px-3 py-2.5 text-right">Amount</th>
            <th className="px-3 py-2.5" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {invoicePayments.map((p) => (
            <tr key={p.id} className="hover:bg-slate-50">
              <td className="px-3 py-3 text-slate-600">{p.date}</td>
              <td className="px-3 py-3 text-slate-600">{p.mode}</td>
              <td className="px-3 py-3 text-slate-400">{p.reference || "—"}</td>
              <td className="px-3 py-3 text-right font-bold text-slate-950">
                {formatCurrency(p.amount)}
              </td>
              <td className="px-3 py-3 text-right">
                <button
                  onClick={() => onDelete(p.id)}
                  className="rounded-xl bg-rose-50 p-1.5 text-rose-600 hover:bg-rose-100"
                >
                  <Trash2 size={13} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main Editor ───────────────────────────────────────────────────────────────

export default function InvoiceEditor({
  data,
  invoice,
  client,
  project,
  updateInvoice,
  updateServiceItem,
  addServiceItem,
  removeServiceItem,
  addPayment,
  deletePayment,
  voidInvoice,
  onPreview,
  onClose,
}) {
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const totals = calculateInvoice(invoice, data.payments);
  const computedStatus = computeInvoiceStatus(invoice, data.payments);
  const invoicePayments = (data.payments || []).filter((p) => p.invoiceId === invoice.id);
  const clientProjects = data.projects.filter((p) => p.clientId === invoice.clientId);
  const projectSummary = getProjectSummary(project, data.invoices, data.payments);
  const isVoided = !!invoice.voidedAt;
  const linkedStage = invoice.stageId
    ? (data.invoiceStages || []).find((s) => s.id === invoice.stageId) || null
    : null;

  function handleClientChange(clientId) {
    const first = data.projects.find((p) => p.clientId === clientId);
    updateInvoice(invoice.id, { clientId, projectId: first?.id || "" });
  }

  function markAsSent() {
    updateInvoice(invoice.id, { sentDate: todayISO() });
  }

  function handleVoid() {
    if (!window.confirm("Void this invoice? It will be marked as void and excluded from financial totals.")) return;
    voidInvoice(invoice.id);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]"
    >
      {/* ── Left column ── */}
      <div className="space-y-5">
        {/* Stage origin banner */}
        {linkedStage && (
          <div className="flex items-center gap-3 rounded-2xl bg-blue-50 px-4 py-3">
            <GitBranch size={16} className="flex-shrink-0 text-blue-600" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-blue-800">Stage-generated invoice</p>
              <p className="truncate text-xs text-blue-600">Linked to billing stage: {linkedStage.name}</p>
            </div>
          </div>
        )}

        {/* Invoice setup */}
        <Section title="Invoice Setup" icon={FileText}>
          {/* Computed status row */}
          <div className="mb-4 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
            <span className="text-sm font-medium text-slate-500">Current Status</span>
            <StatusBadge status={computedStatus} />
          </div>

          {isVoided && (
            <div className="mb-4 flex items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              <Ban size={16} />
              This invoice has been voided and is excluded from all financials.
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            <Input
              label="Invoice No"
              value={invoice.invoiceNo}
              onChange={(v) => updateInvoice(invoice.id, { invoiceNo: v })}
            />
            <Input
              label="Issue Date"
              type="date"
              value={invoice.issueDate}
              onChange={(v) => updateInvoice(invoice.id, { issueDate: v })}
            />
            <Input
              label="Due Date"
              type="date"
              value={invoice.dueDate}
              onChange={(v) => updateInvoice(invoice.id, { dueDate: v })}
            />
            <Select
              label="Client"
              value={invoice.clientId}
              onChange={handleClientChange}
              options={data.clients.map((c) => ({ label: c.name, value: c.id }))}
            />
            <Select
              label="Project"
              value={invoice.projectId}
              onChange={(v) => updateInvoice(invoice.id, { projectId: v })}
              options={clientProjects.map((p) => ({ label: p.name, value: p.id }))}
            />
            <Select
              label="Invoice Type"
              value={invoice.type}
              onChange={(v) => updateInvoice(invoice.id, { type: v })}
              options={INVOICE_TYPES}
            />
            <Input
              label="Sent Date"
              type="date"
              value={invoice.sentDate}
              onChange={(v) => updateInvoice(invoice.id, { sentDate: v })}
            />
          </div>
          {!isVoided && (
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={markAsSent}
                className="rounded-2xl bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
              >
                Mark as Sent Today
              </button>
            </div>
          )}
        </Section>

        {/* Service items */}
        <Section title="Service Invoice Items" icon={IndianRupee}>
          <p className="mb-4 text-sm text-slate-500">
            Add each deliverable or payment stage. Amount is the taxable base; GST is applied on top.
          </p>
          <div className="space-y-3">
            {invoice.serviceItems.map((item, index) => (
              <div
                key={item.id}
                className="grid gap-3 rounded-2xl bg-slate-50 p-3 md:grid-cols-[1.5fr_0.55fr_0.35fr_auto]"
              >
                <Input
                  label={`Service ${index + 1}`}
                  value={item.description}
                  onChange={(v) => updateServiceItem(invoice.id, item.id, "description", v)}
                  placeholder="e.g. Social media management advance"
                />
                <Input
                  label="Amount (Base)"
                  type="number"
                  value={item.amount}
                  onChange={(v) => updateServiceItem(invoice.id, item.id, "amount", v)}
                />
                <Input
                  label="GST %"
                  type="number"
                  value={item.tax}
                  onChange={(v) => updateServiceItem(invoice.id, item.id, "tax", v)}
                />
                <button
                  onClick={() => removeServiceItem(invoice.id, item.id)}
                  className="mt-6 h-11 rounded-2xl bg-white px-3 text-rose-600 shadow-sm hover:bg-rose-50"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button
              onClick={() => addServiceItem(invoice.id)}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              <Plus size={16} /> Add Service
            </button>
          </div>
        </Section>

        {/* Discount & Notes */}
        <Section title="Discount &amp; Notes" icon={WalletCards}>
          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="Discount Type"
              value={invoice.discountType}
              onChange={(v) => updateInvoice(invoice.id, { discountType: v })}
              options={["flat", "percent"]}
            />
            <Input
              label={invoice.discountType === "percent" ? "Discount %" : "Discount Amount"}
              type="number"
              value={invoice.discountValue}
              onChange={(v) => updateInvoice(invoice.id, { discountValue: v })}
            />
            <Textarea
              label="Notes"
              value={invoice.notes}
              onChange={(v) => updateInvoice(invoice.id, { notes: v })}
            />
            <Textarea
              label="Terms"
              value={invoice.terms}
              onChange={(v) => updateInvoice(invoice.id, { terms: v })}
            />
          </div>
        </Section>

        {/* Payment history */}
        <Section title="Payment History" icon={CheckCircle2}>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              {invoicePayments.length
                ? `${invoicePayments.length} payment(s) — ${formatCurrency(totals.paid)} received`
                : "No payments recorded yet."}
            </p>
            {!isVoided && totals.due > 0 && (
              <button
                onClick={() => setShowPaymentModal(true)}
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                <Plus size={15} /> Record Payment
              </button>
            )}
          </div>
          <PaymentHistory
            invoicePayments={invoicePayments}
            onDelete={(paymentId) => {
              if (window.confirm("Remove this payment entry?")) deletePayment(paymentId);
            }}
          />

          {/* Void invoice danger zone */}
          {!isVoided && (
            <div className="mt-6 border-t border-slate-100 pt-4">
              <button
                onClick={handleVoid}
                className="inline-flex items-center gap-2 rounded-2xl bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100"
              >
                <Ban size={15} /> Void Invoice
              </button>
              <p className="mt-1.5 text-xs text-slate-400">
                Voided invoices are excluded from all financial totals and cannot be edited.
              </p>
            </div>
          )}
        </Section>
      </div>

      {/* ── Right sticky panel ── */}
      <div className="xl:sticky xl:top-6 xl:self-start">
        <div className="no-print mb-4 flex gap-3 rounded-[2rem] bg-white p-3 shadow-sm">
          <button
            onClick={onClose}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200"
          >
            <X size={16} /> Close
          </button>
          <button
            onClick={onPreview}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Save size={16} /> Preview
          </button>
        </div>
        <div className="space-y-4">
          <MiniTotals totals={totals} />
          {linkedStage && <LinkedStageSummary stage={linkedStage} />}
          <ProjectTrackerCard client={client} project={project} summary={projectSummary} />
        </div>
      </div>

      {/* Payment modal */}
      {showPaymentModal && (
        <RecordPaymentModal
          invoiceId={invoice.id}
          maxAmount={totals.due}
          onSave={addPayment}
          onClose={() => setShowPaymentModal(false)}
        />
      )}
    </motion.div>
  );
}
