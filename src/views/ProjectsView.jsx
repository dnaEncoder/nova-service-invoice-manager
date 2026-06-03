import { motion } from "framer-motion";
import { BriefcaseBusiness, Plus } from "lucide-react";
import { getProjectSummary } from "../lib/calculations";
import { formatCurrency, getClientName, getBillingModelLabel } from "../lib/utils";
import { STATUS_STYLES } from "../lib/constants";
import SmallMetric from "../components/ui/SmallMetric";
import EmptyState from "../components/ui/EmptyState";

export default function ProjectsView({ data, onOpenProject, onCreateInvoice, onAddClient }) {
  const projectCards = data.projects.map((project) => {
    const summary = getProjectSummary(project, data.invoices, data.payments);
    const billingModel = data.billingModels.find((bm) => bm.projectId === project.id);
    const stageCount = data.invoiceStages.filter((s) => s.projectId === project.id).length;
    return { project, summary, billingModel, stageCount };
  });

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Projects</h1>
          <p className="text-sm text-slate-500">All projects across clients with their billing status and progress.</p>
        </div>
        <button
          onClick={onAddClient}
          className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          <Plus size={16} /> New Client &amp; Project
        </button>
      </div>

      {!projectCards.length ? (
        <div className="rounded-[2rem] bg-white p-12 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <BriefcaseBusiness size={24} />
          </div>
          <p className="font-semibold text-slate-500">No projects yet.</p>
          <p className="mt-1 text-sm text-slate-400">Create a client to start adding projects.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projectCards.map(({ project, summary, billingModel, stageCount }) => {
            const paidPercent = summary.projectValue
              ? Math.min((summary.paid / summary.projectValue) * 100, 100)
              : 0;

            return (
              <div key={project.id} className="rounded-[2rem] bg-white p-5 shadow-sm">
                {/* Header */}
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-slate-400">
                      {getClientName(data.clients, project.clientId)}
                    </p>
                    <h3 className="mt-0.5 truncate text-base font-bold text-slate-950">{project.name}</h3>
                    {project.category && (
                      <p className="mt-0.5 text-xs text-slate-400">{project.category}</p>
                    )}
                  </div>
                  <span className={`flex-shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${STATUS_STYLES[project.status]}`}>
                    {project.status}
                  </span>
                </div>

                {/* Billing model badge */}
                <div className="mb-4 flex items-center gap-2">
                  {billingModel ? (
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      {getBillingModelLabel(billingModel.type)}
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                      No billing model
                    </span>
                  )}
                  {stageCount > 0 && (
                    <span className="text-xs text-slate-400">{stageCount} stage{stageCount !== 1 ? "s" : ""}</span>
                  )}
                </div>

                {/* Progress bar */}
                <div className="mb-4">
                  <div className="mb-1.5 flex items-center justify-between text-xs text-slate-400">
                    <span>Payment collected</span>
                    <span>{Math.round(paidPercent)}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${paidPercent}%` }} />
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-2">
                  <SmallMetric label="Project Value" value={formatCurrency(summary.projectValue)} />
                  <SmallMetric label="Invoiced" value={formatCurrency(summary.invoiced)} />
                  <SmallMetric label="Paid" value={formatCurrency(summary.paid)} />
                  <SmallMetric label="Balance to Invoice" value={formatCurrency(summary.remainingToInvoice)} highlight />
                </div>

                {/* Actions */}
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => onOpenProject(project)}
                    className="flex-1 rounded-2xl bg-slate-100 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200"
                  >
                    Open
                  </button>
                  <button
                    onClick={() => onCreateInvoice(project)}
                    className="flex-1 rounded-2xl bg-blue-600 py-2 text-xs font-bold text-white hover:bg-blue-700"
                  >
                    Invoice
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
