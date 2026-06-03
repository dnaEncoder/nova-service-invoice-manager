import { motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  Plus,
  Search,
  Trash2,
  Zap,
} from "lucide-react";
import {
  getProjectSummary,
  calculateInvoice,
  computeInvoiceStatus,
  evaluateStageStatus,
} from "../lib/calculations";
import { formatCurrency, addDaysISO, todayISO } from "../lib/utils";
import { STATUS_STYLES, CLIENT_STATUSES } from "../lib/constants";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import Textarea from "../components/ui/Textarea";
import StatusBadge from "../components/ui/StatusBadge";

// ── Client avatar ─────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "bg-blue-500", "bg-purple-500", "bg-emerald-500",
  "bg-amber-500", "bg-rose-500", "bg-cyan-500",
];

function ClientAvatar({ name, size = "md" }) {
  const initial = (name || "C")[0].toUpperCase();
  const colorIdx = name ? name.charCodeAt(0) % AVATAR_COLORS.length : 0;
  const sz = size === "lg" ? "h-12 w-12 text-xl" : "h-9 w-9 text-sm";
  return (
    <div className={`flex flex-shrink-0 items-center justify-center rounded-full font-black text-white ${sz} ${AVATAR_COLORS[colorIdx]}`}>
      {initial}
    </div>
  );
}

// ── Project card ──────────────────────────────────────────────────────────────

function ProjectCard({ project, summary, selected, onClick }) {
  const paidPct = summary.projectValue > 0
    ? Math.min((summary.paid / summary.projectValue) * 100, 100)
    : 0;
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-2xl border-2 p-4 text-left transition ${
        selected ? "border-blue-500 bg-blue-50" : "border-slate-100 bg-white hover:border-blue-200"
      }`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="font-bold text-slate-950 leading-snug">{project.name}</p>
        <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLES[project.status] || "bg-slate-100 text-slate-500"}`}>
          {project.status}
        </span>
      </div>
      {project.category && (
        <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 mb-2">
          {project.category}
        </span>
      )}
      <p className="text-sm font-bold text-slate-950">{formatCurrency(summary.projectValue)}</p>
      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${paidPct}%` }} />
      </div>
      <div className="mt-2 flex justify-between text-xs text-slate-400">
        <span>Invoiced {formatCurrency(summary.invoiced)}</span>
        <span>Paid {formatCurrency(summary.paid)}</span>
      </div>
    </button>
  );
}

// ── Right panel ───────────────────────────────────────────────────────────────

function RightPanel({ client, data }) {
  const in7 = addDaysISO(7);
  const today = todayISO();

  // Client-level metrics
  const clientProjects = data.projects.filter((p) => p.clientId === client.id);
  const clientInvoices = data.invoices.filter((inv) =>
    clientProjects.some((p) => p.id === inv.projectId)
  );
  const totalValue = clientProjects.reduce((s, p) => s + Number(p.totalValue || 0), 0);
  const totalInvoiced = clientInvoices.reduce((s, inv) => s + calculateInvoice(inv, data.payments).total, 0);
  const totalCollected = clientInvoices.reduce((s, inv) => s + calculateInvoice(inv, data.payments).paid, 0);
  const totalOutstanding = clientInvoices.reduce((s, inv) => s + calculateInvoice(inv, data.payments).due, 0);

  // Upcoming invoices for this client
  const upcomingForClient = clientInvoices
    .filter((inv) => {
      const s = computeInvoiceStatus(inv, data.payments);
      return inv.dueDate && inv.dueDate >= today && inv.dueDate <= in7 && s !== "Paid" && s !== "Voided";
    })
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  // Client action items — check all client projects for ready stages
  const actions = [];
  clientInvoices.forEach((inv) => {
    const s = computeInvoiceStatus(inv, data.payments);
    if (s === "Overdue") actions.push({ icon: AlertCircle, color: "rose", text: `Chase ${inv.invoiceNo} — overdue` });
  });
  upcomingForClient.slice(0, 2).forEach((inv) => {
    actions.push({ icon: Clock, color: "amber", text: `${inv.invoiceNo} due ${inv.dueDate}` });
  });
  const readyStages = data.invoiceStages.filter((s) => {
    if (!clientProjects.some((p) => p.id === s.projectId)) return false;
    const eff = evaluateStageStatus(s, data.invoiceStages, data.invoices, data.payments, data.projects);
    return eff === "Ready";
  });
  readyStages.slice(0, 2).forEach((stage) => {
    actions.push({ icon: Zap, color: "emerald", text: `${stage.name} ready to invoice` });
  });

  return (
    <aside className="space-y-4">
      {/* Client snapshot */}
      <div className="rounded-[2rem] bg-slate-950 p-5 text-white shadow-sm">
        <h3 className="mb-4 font-bold">Client Snapshot</h3>
        <div className="space-y-3">
          {[
            { label: "Project Value", value: formatCurrency(totalValue) },
            { label: "Total Invoiced", value: formatCurrency(totalInvoiced) },
            { label: "Collected", value: formatCurrency(totalCollected) },
            { label: "Outstanding", value: formatCurrency(totalOutstanding) },
          ].map((m) => (
            <div key={m.label} className="flex items-center justify-between">
              <span className="text-sm text-white/60">{m.label}</span>
              <span className="font-bold">{m.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Invoice chain summary by project */}
      <div className="rounded-[2rem] bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-bold text-slate-950">Invoice Chain</h3>
        <div className="space-y-3">
          {clientProjects.map((project) => {
            const summary = getProjectSummary(project, data.invoices, data.payments);
            const pct = summary.projectValue > 0 ? Math.min((summary.paid / summary.projectValue) * 100, 100) : 0;
            return (
              <div key={project.id} className="rounded-2xl bg-slate-50 p-3">
                <p className="text-sm font-bold text-slate-950 truncate">{project.name}</p>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-1 flex justify-between text-xs text-slate-400">
                  <span>{formatCurrency(summary.paid)} paid</span>
                  <span>{formatCurrency(summary.remainingToInvoice)} left</span>
                </div>
              </div>
            );
          })}
          {!clientProjects.length && <p className="text-sm text-slate-400">No projects yet.</p>}
        </div>
      </div>

      {/* Today's client actions */}
      <div className="rounded-[2rem] bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-bold text-slate-950">Client Actions</h3>
        {actions.length ? (
          <div className="space-y-2.5">
            {actions.map((a, i) => {
              const Icon = a.icon;
              const cls = a.color === "rose" ? "bg-rose-50 text-rose-600"
                : a.color === "amber" ? "bg-amber-50 text-amber-600"
                : "bg-emerald-50 text-emerald-600";
              return (
                <div key={i} className="flex items-start gap-2.5 rounded-2xl bg-slate-50 p-3">
                  <div className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg ${cls}`}>
                    <Icon size={12} />
                  </div>
                  <p className="text-xs text-slate-700 leading-snug">{a.text}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-4">
            <CheckCircle2 className="text-emerald-400" size={22} />
            <p className="text-sm text-slate-400">All clear for this client.</p>
          </div>
        )}
      </div>
    </aside>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────

export default function ClientsView({
  data,
  filteredClients,
  clientQuery,
  setClientQuery,
  selectedClient,
  selectedClientId,
  setSelectedClientId,
  updateClient,
  deleteClient,
  addProject,
  openPreview,
  onAddClient,
  onOpenProject,
  onNavigate,
}) {
  const clientProjects = data.projects.filter((p) => p.clientId === selectedClient?.id);

  // Client-level totals for header metrics
  const clientInvoices = selectedClient
    ? data.invoices.filter((inv) => clientProjects.some((p) => p.id === inv.projectId))
    : [];
  const totalValue = clientProjects.reduce((s, p) => s + Number(p.totalValue || 0), 0);
  const totalInvoiced = clientInvoices.reduce((s, inv) => s + calculateInvoice(inv, data.payments).total, 0);
  const totalCollected = clientInvoices.reduce((s, inv) => s + calculateInvoice(inv, data.payments).paid, 0);
  const totalOutstanding = clientInvoices.reduce((s, inv) => s + calculateInvoice(inv, data.payments).due, 0);

  // Top 5 client invoices sorted by due date descending
  const recentClientInvoices = [...clientInvoices]
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 5);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Clients</h1>
          <p className="text-sm text-slate-500">Manage clients and their projects.</p>
        </div>
        <button onClick={onAddClient} className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
          <Plus size={16} /> New Client
        </button>
      </div>

      {/* 3-column layout */}
      <div className="grid gap-5 lg:grid-cols-[260px_1fr] xl:grid-cols-[260px_1fr_280px]">

        {/* ── Column 1: Client directory ── */}
        <aside className="rounded-[2rem] bg-white p-4 shadow-sm lg:h-fit xl:sticky xl:top-6">
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="font-bold text-slate-950">Client Directory</h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500">{filteredClients.length}</span>
          </div>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              value={clientQuery}
              onChange={(e) => setClientQuery(e.target.value)}
              placeholder="Search clients..."
              className="h-10 w-full rounded-2xl bg-slate-100 pl-9 pr-4 text-sm outline-none ring-blue-100 transition focus:ring-4"
            />
          </div>
          <div className="space-y-1.5 max-h-[70vh] overflow-y-auto pr-1">
            {filteredClients.map((client) => {
              const projCount = data.projects.filter((p) => p.clientId === client.id).length;
              const val = data.projects
                .filter((p) => p.clientId === client.id)
                .reduce((s, p) => s + Number(p.totalValue || 0), 0);
              const isActive = selectedClientId === client.id;
              return (
                <button
                  key={client.id}
                  onClick={() => setSelectedClientId(client.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition ${isActive ? "bg-slate-950 text-white" : "hover:bg-slate-50"}`}
                >
                  <ClientAvatar name={client.name} />
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm font-bold ${isActive ? "text-white" : "text-slate-950"}`}>{client.name}</p>
                    <p className={`truncate text-xs ${isActive ? "text-white/50" : "text-slate-400"}`}>
                      {projCount} project{projCount !== 1 ? "s" : ""} · {formatCurrency(val)}
                    </p>
                  </div>
                  {client.status && (
                    <span className={`hidden flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold sm:block ${isActive ? "bg-white/15 text-white" : STATUS_STYLES[client.status] || "bg-slate-100 text-slate-500"}`}>
                      {client.status}
                    </span>
                  )}
                </button>
              );
            })}
            {!filteredClients.length && (
              <p className="py-8 text-center text-sm text-slate-400">No clients found.</p>
            )}
          </div>
        </aside>

        {/* ── Column 2: Main workspace ── */}
        <main className="min-w-0 space-y-5">
          {selectedClient ? (
            <>
              {/* Client header */}
              <div className="rounded-[2rem] bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <ClientAvatar name={selectedClient.name} size="lg" />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-black text-slate-950">{selectedClient.name}</h2>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_STYLES[selectedClient.status] || "bg-slate-100 text-slate-500"}`}>
                          {selectedClient.status}
                        </span>
                      </div>
                      {selectedClient.contactPerson && (
                        <p className="mt-0.5 text-sm text-slate-500">{selectedClient.contactPerson}</p>
                      )}
                      {selectedClient.email && (
                        <p className="text-sm text-slate-400">{selectedClient.email}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteClient(selectedClient.id)}
                    className="inline-flex items-center gap-2 rounded-2xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                </div>

                {/* 4 metric cards */}
                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { label: "Total Project Value", value: formatCurrency(totalValue) },
                    { label: "Total Invoiced", value: formatCurrency(totalInvoiced) },
                    { label: "Collected", value: formatCurrency(totalCollected) },
                    { label: "Outstanding", value: formatCurrency(totalOutstanding) },
                  ].map((m) => (
                    <div key={m.label} className="rounded-2xl bg-slate-50 px-4 py-3">
                      <p className="text-xs text-slate-500">{m.label}</p>
                      <p className="mt-0.5 text-lg font-black text-slate-950">{m.value}</p>
                    </div>
                  ))}
                </div>

                {/* Edit fields */}
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-semibold text-blue-600 hover:text-blue-700">Edit Client Details</summary>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <Input label="Client / Company Name" value={selectedClient.name} onChange={(v) => updateClient(selectedClient.id, { name: v })} />
                    <Input label="Contact Person" value={selectedClient.contactPerson} onChange={(v) => updateClient(selectedClient.id, { contactPerson: v })} />
                    <Input label="Email" value={selectedClient.email} onChange={(v) => updateClient(selectedClient.id, { email: v })} />
                    <Input label="Phone" value={selectedClient.phone} onChange={(v) => updateClient(selectedClient.id, { phone: v })} />
                    <Input label="GSTIN" value={selectedClient.gstin} onChange={(v) => updateClient(selectedClient.id, { gstin: v })} />
                    <Select label="Client Status" value={selectedClient.status} onChange={(v) => updateClient(selectedClient.id, { status: v })} options={CLIENT_STATUSES} />
                    <Input className="md:col-span-2" label="Address" value={selectedClient.address} onChange={(v) => updateClient(selectedClient.id, { address: v })} />
                    <Textarea label="Notes" value={selectedClient.notes} onChange={(v) => updateClient(selectedClient.id, { notes: v })} />
                  </div>
                </details>
              </div>

              {/* Projects — clicking navigates to project detail page */}
              <div className="rounded-[2rem] bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-950">Projects</h3>
                  <button
                    onClick={() => addProject(selectedClient.id)}
                    className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
                  >
                    <Plus size={13} /> Add Project
                  </button>
                </div>
                {clientProjects.length ? (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    {clientProjects.map((project) => {
                      const summary = getProjectSummary(project, data.invoices, data.payments);
                      return (
                        <ProjectCard
                          key={project.id}
                          project={project}
                          summary={summary}
                          selected={false}
                          onClick={() => onOpenProject(project)}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <p className="py-8 text-center text-sm text-slate-400">No projects yet.</p>
                )}
              </div>

              {/* Recent invoices for this client */}
              <div className="rounded-[2rem] bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-950">Recent Invoices</h3>
                  <button
                    onClick={() => onNavigate("invoices")}
                    className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                  >
                    View all →
                  </button>
                </div>
                <div className="overflow-hidden rounded-2xl border border-slate-100">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Invoice</th>
                        <th className="px-4 py-3">Project</th>
                        <th className="px-4 py-3">Due</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recentClientInvoices.map((invoice) => {
                        const totals = calculateInvoice(invoice, data.payments);
                        const computedStatus = computeInvoiceStatus(invoice, data.payments);
                        const proj = data.projects.find((p) => p.id === invoice.projectId);
                        return (
                          <tr key={invoice.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3.5 font-bold text-blue-600">{invoice.invoiceNo}</td>
                            <td className="px-4 py-3.5 max-w-[140px] truncate text-slate-500">{proj?.name || "—"}</td>
                            <td className="px-4 py-3.5 text-slate-500">{invoice.dueDate || "—"}</td>
                            <td className="px-4 py-3.5"><StatusBadge status={computedStatus} /></td>
                            <td className="px-4 py-3.5 text-right font-bold text-slate-950">{formatCurrency(totals.total)}</td>
                            <td className="px-4 py-3.5 text-right">
                              <button onClick={() => openPreview(invoice)} className="rounded-xl bg-slate-100 p-2 text-slate-600 hover:bg-slate-200">
                                <Eye size={13} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {!recentClientInvoices.length && (
                        <tr>
                          <td colSpan="6" className="px-4 py-8 text-center text-slate-400">No invoices for this client yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {clientInvoices.length > 5 && (
                  <p className="mt-3 text-center text-xs text-slate-400">
                    Showing 5 of {clientInvoices.length} invoices.{" "}
                    <button onClick={() => onNavigate("invoices")} className="font-semibold text-blue-600 hover:text-blue-700">View all</button>
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="rounded-[2rem] bg-white p-12 text-center text-slate-400 shadow-sm">
              Select a client from the directory to get started.
            </div>
          )}
        </main>

        {/* ── Column 3: Right panel (xl only) ── */}
        {selectedClient && (
          <div className="hidden xl:block">
            <RightPanel client={selectedClient} data={data} />
          </div>
        )}
      </div>
    </motion.div>
  );
}
