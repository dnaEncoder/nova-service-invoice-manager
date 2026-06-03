import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Plus,
  ReceiptText,
  Zap,
} from "lucide-react";
import {
  calculateInvoice,
  computeInvoiceStatus,
  evaluateStageStatus,
  getProjectSummary,
} from "../lib/calculations";
import {
  formatCurrency,
  getClientName,
  safeNumber,
  addDaysISO,
  todayISO,
  getBillingModelLabel,
} from "../lib/utils";
import { STATUS_STYLES } from "../lib/constants";
import StatusBadge from "../components/ui/StatusBadge";

// ── Week bar chart ────────────────────────────────────────────────────────────

function WeekBarChart({ payments }) {
  const today = new Date();
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    const collected = payments
      .filter((p) => p.date === dateStr)
      .reduce((sum, p) => sum + safeNumber(p.amount), 0);
    return { label, dateStr, collected };
  });

  const maxVal = Math.max(...days.map((d) => d.collected), 1);
  const weekTotal = days.reduce((s, d) => s + d.collected, 0);
  const todayStr = todayISO();

  return (
    <div>
      <div className="flex items-end gap-2 h-28">
        {days.map((day) => {
          const pct = Math.max((day.collected / maxVal) * 100, day.collected > 0 ? 8 : 3);
          const isToday = day.dateStr === todayStr;
          return (
            <div key={day.label} className="flex flex-1 flex-col items-center gap-1.5">
              {day.collected > 0 && (
                <span className="text-[10px] font-bold text-slate-600">
                  {formatCurrency(day.collected).replace("₹", "₹")}
                </span>
              )}
              <div className="w-full rounded-t-lg" style={{ height: `${pct}%`, backgroundColor: isToday ? "#2563eb" : "#cbd5e1", minHeight: "4px" }} />
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-2">
        {days.map((day) => (
          <div key={day.label} className="flex-1 text-center text-[10px] text-slate-400">{day.label}</div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
        <span className="text-sm text-slate-500">Week Total</span>
        <span className="text-lg font-black text-slate-950">{formatCurrency(weekTotal)}</span>
      </div>
    </div>
  );
}

// ── Stage progress dots ───────────────────────────────────────────────────────

function StageProgress({ stages, allInvoices, allPayments, allProjects, allStages }) {
  if (!stages.length) return <span className="text-xs text-slate-400">No stages</span>;
  return (
    <div className="flex items-center gap-1">
      {stages.slice(0, 6).map((stage) => {
        const eff = evaluateStageStatus(stage, allStages, allInvoices, allPayments, allProjects);
        const color =
          eff === "Paid" ? "bg-emerald-500"
          : eff === "Generated" ? "bg-blue-500"
          : eff === "Ready" ? "bg-amber-400"
          : "bg-rose-300";
        return <div key={stage.id} title={`${stage.name}: ${eff}`} className={`h-2.5 w-2.5 rounded-full ${color}`} />;
      })}
      {stages.length > 6 && <span className="text-xs text-slate-400">+{stages.length - 6}</span>}
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function Dashboard({ data, onOpenProject, onNavigate }) {
  const today = todayISO();
  const in7 = addDaysISO(7);
  const in3 = addDaysISO(3);

  const { upcomingInvoices, upcomingTotal, pendingInvoices, pendingTotal, readyStages, overdueInvoices, overdueTotal } = useMemo(() => {
    const upcoming = data.invoices
      .filter((inv) => {
        const s = computeInvoiceStatus(inv, data.payments);
        return inv.dueDate && inv.dueDate >= today && inv.dueDate <= in7 && s !== "Paid" && s !== "Voided";
      })
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    const pending = data.invoices.filter((inv) => {
      const s = computeInvoiceStatus(inv, data.payments);
      return s === "Sent" || s === "Partially Paid" || s === "Overdue";
    });

    const ready = data.invoiceStages.filter((stage) => {
      const eff = evaluateStageStatus(stage, data.invoiceStages, data.invoices, data.payments, data.projects);
      return eff === "Ready";
    });

    const overdue = data.invoices.filter((inv) => computeInvoiceStatus(inv, data.payments) === "Overdue");

    return {
      upcomingInvoices: upcoming,
      upcomingTotal: upcoming.reduce((s, inv) => s + calculateInvoice(inv, data.payments).due, 0),
      pendingInvoices: pending,
      pendingTotal: pending.reduce((s, inv) => s + calculateInvoice(inv, data.payments).due, 0),
      readyStages: ready,
      overdueInvoices: overdue,
      overdueTotal: overdue.reduce((s, inv) => s + calculateInvoice(inv, data.payments).due, 0),
    };
  }, [data, today, in7]);

  // Priority actions derived from live data
  const priorityActions = useMemo(() => {
    const actions = [];
    overdueInvoices.slice(0, 2).forEach((inv) => {
      const client = data.clients.find((c) => c.id === inv.clientId)?.name || "Client";
      actions.push({ icon: AlertCircle, color: "rose", text: `Follow up on overdue ${inv.invoiceNo} from ${client}` });
    });
    readyStages.slice(0, 2).forEach((stage) => {
      const project = data.projects.find((p) => p.id === stage.projectId)?.name || "Project";
      actions.push({ icon: Zap, color: "emerald", text: `${stage.name} ready to invoice for ${project}` });
    });
    upcomingInvoices.filter((inv) => inv.dueDate <= in3).slice(0, 2).forEach((inv) => {
      const client = data.clients.find((c) => c.id === inv.clientId)?.name || "Client";
      actions.push({ icon: Clock, color: "amber", text: `${inv.invoiceNo} due soon — ${client}` });
    });
    if (!actions.length) actions.push({ icon: CheckCircle2, color: "emerald", text: "All invoices are up to date. Great work!" });
    return actions;
  }, [overdueInvoices, readyStages, upcomingInvoices, data.clients, data.projects, in3]);

  // Project billing pipeline
  const pipeline = useMemo(() => {
    return data.projects
      .map((project) => {
        const billingModel = data.billingModels.find((bm) => bm.projectId === project.id);
        const stages = data.invoiceStages.filter((s) => s.projectId === project.id).sort((a, b) => a.order - b.order);
        const nextReady = stages.find((s) => {
          const eff = evaluateStageStatus(s, data.invoiceStages, data.invoices, data.payments, data.projects);
          return eff === "Ready";
        });
        const summary = getProjectSummary(project, data.invoices, data.payments);
        return { project, billingModel, stages, nextReady, summary };
      })
      .filter((p) => p.project.status !== "Cancelled")
      .sort((a, b) => b.summary.pending - a.summary.pending);
  }, [data]);

  // Recent activity
  const recentActivity = useMemo(() => {
    const items = [];
    [...data.payments]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 4)
      .forEach((p) => {
        const inv = data.invoices.find((i) => i.id === p.invoiceId);
        const client = data.clients.find((c) => c.id === inv?.clientId)?.name || "Client";
        items.push({ icon: "payment", text: `Payment of ${formatCurrency(p.amount)} received from ${client}`, time: p.date, color: "emerald" });
      });
    [...data.invoices]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 3)
      .forEach((inv) => {
        const client = data.clients.find((c) => c.id === inv.clientId)?.name || "Client";
        items.push({ icon: "invoice", text: `Invoice ${inv.invoiceNo} created for ${client}`, time: inv.createdAt?.slice(0, 10), color: "blue" });
      });
    return items.sort((a, b) => b.time?.localeCompare(a.time || "")).slice(0, 5);
  }, [data]);

  // Invoices requiring attention (overdue + sent > 14 days)
  const attentionInvoices = useMemo(() => {
    const cutoff = addDaysISO(-14);
    return data.invoices
      .filter((inv) => {
        const s = computeInvoiceStatus(inv, data.payments);
        return s === "Overdue" || (s === "Sent" && inv.sentDate && inv.sentDate <= cutoff);
      })
      .slice(0, 5);
  }, [data]);

  const iconColorMap = { rose: "text-rose-500 bg-rose-50", emerald: "text-emerald-600 bg-emerald-50", amber: "text-amber-600 bg-amber-50", blue: "text-blue-600 bg-blue-50" };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Dashboard</h1>
          <p className="text-sm text-slate-500">Track incoming invoices, collections, and project billing activity in one place.</p>
        </div>
        <button
          onClick={() => onNavigate("invoices")}
          className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Plus size={16} /> New Invoice
        </button>
      </div>

      {/* ── Row 1: KPI cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Upcoming invoices */}
        <div className="rounded-[1.75rem] bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-500">Upcoming Invoices (7 Days)</p>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Calendar size={17} />
            </div>
          </div>
          <h2 className="text-2xl font-black text-slate-950">{formatCurrency(upcomingTotal)}</h2>
          <p className="mt-1 text-xs text-slate-400">
            {upcomingInvoices.length} invoice{upcomingInvoices.length !== 1 ? "s" : ""} due this week
          </p>
        </div>

        {/* Pending collections */}
        <div className="rounded-[1.75rem] bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-500">Pending Collections</p>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <ReceiptText size={17} />
            </div>
          </div>
          <h2 className="text-2xl font-black text-slate-950">{formatCurrency(pendingTotal)}</h2>
          <p className="mt-1 text-xs text-slate-400">
            {pendingInvoices.length} invoice{pendingInvoices.length !== 1 ? "s" : ""} need follow-up
          </p>
        </div>

        {/* Milestones ready */}
        <div className="rounded-[1.75rem] bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-500">Milestones Ready to Bill</p>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Zap size={17} />
            </div>
          </div>
          <h2 className="text-2xl font-black text-slate-950">{readyStages.length}</h2>
          <p className="mt-1 text-xs text-slate-400">
            Across {new Set(readyStages.map((s) => s.projectId)).size} project(s)
          </p>
        </div>

        {/* Overdue */}
        <div className="rounded-[1.75rem] bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-500">Overdue Invoices</p>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <AlertCircle size={17} />
            </div>
          </div>
          <h2 className="text-2xl font-black text-slate-950">{formatCurrency(overdueTotal)}</h2>
          <p className="mt-1 text-xs text-slate-400">
            {overdueInvoices.length} invoice{overdueInvoices.length !== 1 ? "s" : ""} past due date
          </p>
        </div>
      </div>

      {/* ── Row 2: Upcoming invoices + Priority actions ── */}
      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        {/* Upcoming invoices table */}
        <div className="rounded-[2rem] bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-950">Upcoming Invoices</h2>
            <button onClick={() => onNavigate("invoices")} className="flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700">
              View All <ArrowRight size={14} />
            </button>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-100">
            <table className="w-full min-w-[540px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Due Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Amount Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {upcomingInvoices.slice(0, 6).map((inv) => {
                  const totals = calculateInvoice(inv, data.payments);
                  const computedStatus = computeInvoiceStatus(inv, data.payments);
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3.5 font-semibold text-blue-600">{inv.invoiceNo}</td>
                      <td className="px-4 py-3.5 text-slate-700">{getClientName(data.clients, inv.clientId)}</td>
                      <td className="px-4 py-3.5 text-slate-500">{inv.dueDate}</td>
                      <td className="px-4 py-3.5"><StatusBadge status={computedStatus} /></td>
                      <td className="px-4 py-3.5 text-right font-bold text-slate-950">{formatCurrency(totals.due)}</td>
                    </tr>
                  );
                })}
                {!upcomingInvoices.length && (
                  <tr>
                    <td colSpan="5" className="px-4 py-10 text-center text-slate-400">No invoices due in the next 7 days.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Today's priority actions */}
        <div className="rounded-[2rem] bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-950">Today's Priority Actions</h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{priorityActions.length}</span>
          </div>
          <div className="space-y-3">
            {priorityActions.map((action, i) => {
              const Icon = action.icon;
              const colorClass = iconColorMap[action.color] || "text-slate-500 bg-slate-50";
              return (
                <div key={i} className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3.5">
                  <div className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-xl ${colorClass}`}>
                    <Icon size={14} />
                  </div>
                  <p className="text-sm text-slate-700 leading-snug">{action.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Row 3: Bar chart + Project pipeline ── */}
      <div className="grid gap-5 xl:grid-cols-[400px_1fr]">
        {/* Collection timeline */}
        <div className="rounded-[2rem] bg-white p-5 shadow-sm">
          <h2 className="mb-1 text-lg font-bold text-slate-950">This Week's Collection</h2>
          <p className="mb-5 text-sm text-slate-500">Payments received each day this week.</p>
          <WeekBarChart payments={data.payments} />
        </div>

        {/* Project billing pipeline */}
        <div className="rounded-[2rem] bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-950">Project Billing Pipeline</h2>
            <button onClick={() => onNavigate("projects")} className="flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700">
              View All <ArrowRight size={14} />
            </button>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-100">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Model</th>
                  <th className="px-4 py-3">Stages</th>
                  <th className="px-4 py-3">Next Stage</th>
                  <th className="px-4 py-3 text-right">Outstanding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pipeline.slice(0, 5).map(({ project, billingModel, stages, nextReady, summary }) => (
                  <tr
                    key={project.id}
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => onOpenProject(project)}
                  >
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-slate-950">{project.name}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLES[project.status] || "bg-slate-100 text-slate-500"}`}>{project.status}</span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-500">{getClientName(data.clients, project.clientId)}</td>
                    <td className="px-4 py-3.5 text-slate-500 text-xs">{billingModel ? getBillingModelLabel(billingModel.type) : "—"}</td>
                    <td className="px-4 py-3.5">
                      {stages.length > 0 ? (
                        <StageProgress
                          stages={stages}
                          allStages={data.invoiceStages}
                          allInvoices={data.invoices}
                          allPayments={data.payments}
                          allProjects={data.projects}
                        />
                      ) : <span className="text-xs text-slate-400">No stages</span>}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-600">{nextReady ? nextReady.name : <span className="text-slate-400">—</span>}</td>
                    <td className="px-4 py-3.5 text-right font-bold text-slate-950">{formatCurrency(summary.pending)}</td>
                  </tr>
                ))}
                {!pipeline.length && (
                  <tr>
                    <td colSpan="6" className="px-4 py-10 text-center text-slate-400">No active projects.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Row 4: Recent activity + Invoices requiring attention ── */}
      <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
        {/* Recent activity */}
        <div className="rounded-[2rem] bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-slate-950">Recent Activity</h2>
          {recentActivity.length ? (
            <div className="space-y-3">
              {recentActivity.map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-xl ${item.color === "emerald" ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"}`}>
                    {item.icon === "payment" ? <CheckCircle2 size={13} /> : <ReceiptText size={13} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-700 leading-snug">{item.text}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-slate-400 py-6">No recent activity.</p>
          )}
          {data.activityLogs?.length > 0 && (
            <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
              {data.activityLogs.slice(0, 3).map((log) => (
                <div key={log.id} className="flex items-start gap-2">
                  <div className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-slate-300 mt-2" />
                  <p className="text-xs text-slate-500">{log.action}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Invoices requiring attention */}
        <div className="rounded-[2rem] bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-950">Invoices Requiring Attention</h2>
            {attentionInvoices.length > 0 && (
              <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-700">{attentionInvoices.length} urgent</span>
            )}
          </div>
          {attentionInvoices.length ? (
            <div className="overflow-hidden rounded-2xl border border-slate-100">
              <table className="w-full min-w-[400px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Invoice</th>
                    <th className="px-4 py-3">Client</th>
                    <th className="px-4 py-3">Due Date</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {attentionInvoices.map((inv) => {
                    const totals = calculateInvoice(inv, data.payments);
                    const computedStatus = computeInvoiceStatus(inv, data.payments);
                    return (
                      <tr key={inv.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3.5 font-semibold text-rose-600">{inv.invoiceNo}</td>
                        <td className="px-4 py-3.5 text-slate-700">{getClientName(data.clients, inv.clientId)}</td>
                        <td className="px-4 py-3.5 text-slate-500">{inv.dueDate || "—"}</td>
                        <td className="px-4 py-3.5"><StatusBadge status={computedStatus} /></td>
                        <td className="px-4 py-3.5 text-right font-bold text-rose-700">{formatCurrency(totals.due)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-2xl bg-emerald-50 py-10 text-center">
              <CheckCircle2 className="mx-auto mb-2 text-emerald-500" size={28} />
              <p className="font-semibold text-emerald-700">All invoices are on track!</p>
              <p className="mt-1 text-sm text-emerald-600">No overdue or stale invoices.</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
