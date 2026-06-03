import { motion } from "framer-motion";
import { ArrowLeft, Eye, GitBranch, Lock, Plus, Trash2 } from "lucide-react";
import { getProjectSummary, calculateInvoice, computeInvoiceStatus, evaluateStageStatus } from "../lib/calculations";
import { formatCurrency } from "../lib/utils";
import { STATUS_STYLES } from "../lib/constants";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import Textarea from "../components/ui/Textarea";
import StatusBadge from "../components/ui/StatusBadge";

export default function ProjectDetailView({
  data,
  project,
  client,
  updateProject,
  deleteProject,
  addInvoice,
  openPreview,
  onBillingSetup,
  onBack,
}) {
  if (!project) {
    return (
      <div className="rounded-[2rem] bg-white p-12 text-center text-slate-400 shadow-sm">
        No project selected.
      </div>
    );
  }

  const summary = getProjectSummary(project, data.invoices, data.payments);
  const projectInvoices = data.invoices.filter((inv) => inv.projectId === project.id);
  const projectStages = data.invoiceStages
    .filter((s) => s.projectId === project.id)
    .sort((a, b) => a.order - b.order);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      {/* Breadcrumb / back */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <ArrowLeft size={15} />
          {client?.name || "Clients"}
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => onBillingSetup(project)}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            <GitBranch size={15} /> Billing Setup
          </button>
          <button
            onClick={() => addInvoice(project.clientId, project.id)}
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Plus size={15} /> Create Invoice
          </button>
        </div>
      </div>

      {/* Project header */}
      <div className="rounded-[2rem] bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-black text-slate-950">{project.name}</h1>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_STYLES[project.status] || "bg-slate-100 text-slate-500"}`}>
                {project.status}
              </span>
              {project.category && (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                  {project.category}
                </span>
              )}
            </div>
            {project.description && (
              <p className="mt-1.5 text-sm text-slate-500 max-w-xl">{project.description}</p>
            )}
          </div>
          <button
            onClick={() => deleteProject(project.id)}
            className="inline-flex items-center gap-2 rounded-2xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
          >
            <Trash2 size={13} /> Delete Project
          </button>
        </div>

        {/* 4 metric cards */}
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Project Value", value: formatCurrency(summary.projectValue) },
            { label: "Total Invoiced", value: formatCurrency(summary.invoiced) },
            { label: "Collected", value: formatCurrency(summary.paid) },
            { label: "Left to Invoice", value: formatCurrency(summary.remainingToInvoice) },
          ].map((m) => (
            <div key={m.label} className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs text-slate-500">{m.label}</p>
              <p className="mt-0.5 text-lg font-black text-slate-950">{m.value}</p>
            </div>
          ))}
        </div>

        {/* Edit form */}
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-semibold text-blue-600 hover:text-blue-700">
            Edit Project Details
          </summary>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Input label="Project Name" value={project.name} onChange={(v) => updateProject(project.id, { name: v })} />
            <Input label="Project Value (₹)" type="number" value={project.totalValue} onChange={(v) => updateProject(project.id, { totalValue: v })} />
            <Input label="Category" value={project.category} onChange={(v) => updateProject(project.id, { category: v })} />
            <Input label="Billing Owner" value={project.billingOwner} onChange={(v) => updateProject(project.id, { billingOwner: v })} />
            <Input label="Start Date" type="date" value={project.startDate} onChange={(v) => updateProject(project.id, { startDate: v })} />
            <Input label="End Date" type="date" value={project.endDate} onChange={(v) => updateProject(project.id, { endDate: v })} />
            <Input label="Delivery Date" type="date" value={project.deliveryDate} onChange={(v) => updateProject(project.id, { deliveryDate: v })} />
            <Select
              label="Project Status"
              value={project.status}
              onChange={(v) => updateProject(project.id, { status: v })}
              options={["Active", "Delivered", "Completed", "On Hold", "Cancelled"]}
            />
            <Textarea className="md:col-span-2" label="Description" value={project.description} onChange={(v) => updateProject(project.id, { description: v })} />
          </div>
        </details>
      </div>

      {/* Billing Stage Pipeline */}
      {projectStages.length > 0 && (
        <div className="rounded-[2rem] bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-950">Billing Stage Pipeline</h2>
            <button
              onClick={() => onBillingSetup(project)}
              className="rounded-2xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200"
            >
              Edit Stages
            </button>
          </div>
          <div className="space-y-2">
            {projectStages.map((stage, idx) => {
              const eff = evaluateStageStatus(stage, data.invoiceStages, data.invoices, data.payments, data.projects);
              const isLocked = eff === "Locked";
              return (
                <div
                  key={stage.id}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${isLocked ? "bg-rose-50/50" : "bg-slate-50"}`}
                >
                  <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-xl text-xs font-black ${isLocked ? "bg-rose-100 text-rose-700" : "bg-blue-100 text-blue-700"}`}>
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-950">{stage.name}</p>
                    {isLocked && stage.unlockCondition && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-rose-600">
                        <Lock size={11} /> {stage.unlockCondition}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-slate-950">{formatCurrency(stage.amount)}</span>
                    <StatusBadge status={eff} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Invoice Chain */}
      <div className="rounded-[2rem] bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-950">Invoice Chain</h2>
          <button
            onClick={() => addInvoice(project.clientId, project.id)}
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
          >
            <Plus size={13} /> New Invoice
          </button>
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-100">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Sent</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Paid</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projectInvoices.map((invoice) => {
                const totals = calculateInvoice(invoice, data.payments);
                const computedStatus = computeInvoiceStatus(invoice, data.payments);
                return (
                  <tr key={invoice.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3.5 font-bold text-blue-600">{invoice.invoiceNo}</td>
                    <td className="px-4 py-3.5 text-slate-500">{invoice.type}</td>
                    <td className="px-4 py-3.5 text-slate-500">{invoice.sentDate || "—"}</td>
                    <td className="px-4 py-3.5 text-slate-500">{invoice.dueDate || "—"}</td>
                    <td className="px-4 py-3.5"><StatusBadge status={computedStatus} /></td>
                    <td className="px-4 py-3.5 text-right font-bold">{formatCurrency(totals.total)}</td>
                    <td className="px-4 py-3.5 text-right text-slate-500">{formatCurrency(totals.paid)}</td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => openPreview(invoice)}
                        className="rounded-xl bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"
                      >
                        <Eye size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!projectInvoices.length && (
                <tr>
                  <td colSpan="8" className="px-4 py-10 text-center text-slate-400">
                    No invoices yet. Create one to start billing this project.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
