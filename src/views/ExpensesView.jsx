import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Plus, AlertTriangle, Trash2, Pencil, Ban, RotateCcw } from "lucide-react";
import { formatCurrency, todayISO } from "../lib/utils";
import { EXPENSE_CATEGORIES } from "../lib/constants";
import { currentMonth, isCarriedOver, summarizeExpenses, summarizeExpensesByMonth } from "../lib/expenseCalculations";
import StatusBadge from "../components/ui/StatusBadge";
import Modal from "../components/ui/Modal";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import Textarea from "../components/ui/Textarea";
import EmptyState from "../components/ui/EmptyState";

function ExpenseFormModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState({
    name: initial?.name || "New Expense",
    category: initial?.category || "Other",
    amount: initial?.amount ?? 0,
    month: initial?.month || currentMonth(),
    notes: initial?.notes || "",
  });
  const [alreadyPaid, setAlreadyPaid] = useState(initial?.status === "Paid");
  const [paidDate, setPaidDate] = useState(initial?.paidDate || todayISO());

  function set(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!form.name.trim() || !amount || amount <= 0) return;
    onSave({
      ...form,
      amount,
      status: alreadyPaid ? "Paid" : "Pending",
      paidDate: alreadyPaid ? paidDate || todayISO() : "",
      paidAmount: alreadyPaid ? amount : 0,
    });
    onClose();
  }

  return (
    <Modal title={initial ? "Edit Expense" : "Add Variable Expense"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Name" value={form.name} onChange={(v) => set("name", v)} />
        <Select label="Category" value={form.category} onChange={(v) => set("category", v)} options={EXPENSE_CATEGORIES} />
        <Input label="Amount (₹)" type="number" value={form.amount} onChange={(v) => set("amount", v)} />
        <Input label="Month" type="month" value={form.month} onChange={(v) => set("month", v)} />

        <div>
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">Payment Status</span>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setAlreadyPaid(false)}
              className={`flex-1 rounded-2xl px-3 py-2.5 text-sm font-semibold transition ${
                !alreadyPaid ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              Pending
            </button>
            <button
              type="button"
              onClick={() => setAlreadyPaid(true)}
              className={`flex-1 rounded-2xl px-3 py-2.5 text-sm font-semibold transition ${
                alreadyPaid ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              Already Paid
            </button>
          </div>
        </div>

        {alreadyPaid && (
          <Input label="Paid Date" type="date" value={paidDate} onChange={setPaidDate} />
        )}

        <Textarea label="Notes (optional)" value={form.notes} onChange={(v) => set("notes", v)} />
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
            className="flex-1 rounded-2xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
}

function TemplateFormModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState({
    name: initial?.name || "New Fixed Expense",
    category: initial?.category || "Other",
    amount: initial?.amount ?? 0,
    startMonth: initial?.startMonth || currentMonth(),
    notes: initial?.notes || "",
  });

  function set(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!form.name.trim() || !amount || amount <= 0) return;
    onSave({ ...form, amount });
    onClose();
  }

  return (
    <Modal title={initial ? "Edit Fixed Expense" : "Add Fixed Expense"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Name" value={form.name} onChange={(v) => set("name", v)} />
        <Select label="Category" value={form.category} onChange={(v) => set("category", v)} options={EXPENSE_CATEGORIES} />
        <Input label="Monthly Amount (₹)" type="number" value={form.amount} onChange={(v) => set("amount", v)} />
        <Input label="Starts From (Month)" type="month" value={form.startMonth} onChange={(v) => set("startMonth", v)} />
        <Textarea label="Notes (optional)" value={form.notes} onChange={(v) => set("notes", v)} />
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
            className="flex-1 rounded-2xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function ExpensesView({
  data,
  addExpenseTemplate,
  updateExpenseTemplate,
  deleteExpenseTemplate,
  addExpense,
  updateExpense,
  deleteExpense,
  markExpensePaid,
  markExpenseUnpaid,
}) {
  const expenses = data.expenses || [];
  const templates = data.expenseTemplates || [];

  const [monthFilter, setMonthFilter] = useState(currentMonth());
  const [typeFilter, setTypeFilter] = useState("All");
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [editingTemplate, setEditingTemplate] = useState(null);

  const summary = useMemo(() => summarizeExpenses(data), [data.expenses]);
  const monthlyBreakdown = useMemo(() => summarizeExpensesByMonth(expenses), [expenses]);

  const months = useMemo(() => {
    const set = new Set(expenses.map((e) => e.month));
    set.add(currentMonth());
    return Array.from(set).sort().reverse();
  }, [expenses]);

  const visibleExpenses = useMemo(() => {
    return expenses
      .filter((e) => typeFilter === "All" || (typeFilter === "Fixed" ? !!e.templateId : !e.templateId))
      .filter((e) => e.month === monthFilter || isCarriedOver(e))
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === "Pending" ? -1 : 1;
        if (a.month !== b.month) return a.month < b.month ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  }, [expenses, typeFilter, monthFilter]);

  function handleSaveExpense(form) {
    if (editingExpense) updateExpense(editingExpense.id, form);
    else addExpense(form.month, form);
  }

  function handleSaveTemplate(form) {
    if (editingTemplate) updateExpenseTemplate(editingTemplate.id, form);
    else addExpenseTemplate(form);
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Expenses</h1>
          <p className="text-sm text-slate-500">Track fixed and variable outgoing costs, and what's still owed.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => { setEditingTemplate(null); setShowTemplateModal(true); }}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
          >
            <Plus size={16} /> Fixed Expense
          </button>
          <button
            onClick={() => { setEditingExpense(null); setShowExpenseModal(true); }}
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Plus size={16} /> Variable Expense
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[1.75rem] bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total Expenses</p>
          <h3 className="mt-1 text-xl font-black text-slate-950">{formatCurrency(summary.totalExpenses)}</h3>
          <p className="mt-1 text-xs text-slate-400">paid + pending, all-time</p>
        </div>
        <div className="rounded-[1.75rem] bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total Paid</p>
          <h3 className="mt-1 text-xl font-black text-slate-950">{formatCurrency(summary.totalPaid)}</h3>
          <p className="mt-1 text-xs text-slate-400">total outgoing, all-time</p>
        </div>
        <div className="rounded-[1.75rem] bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total Pending</p>
          <h3 className="mt-1 text-xl font-black text-slate-950">{formatCurrency(summary.totalPending)}</h3>
          <p className="mt-1 text-xs text-slate-400">owed across all months</p>
        </div>
        <div className="rounded-[1.75rem] bg-amber-50 p-5 shadow-sm ring-1 ring-amber-100">
          <p className="text-sm text-amber-700">Carried Over</p>
          <h3 className="mt-1 text-xl font-black text-amber-900">{formatCurrency(summary.carriedOverTotal)}</h3>
          <p className="mt-1 text-xs text-amber-600">{summary.carriedOverCount} unpaid from earlier months</p>
        </div>
      </div>

      {/* Carried-over banner */}
      {summary.carriedOverCount > 0 && (
        <div className="mb-5 flex items-center gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 ring-1 ring-amber-100">
          <AlertTriangle size={16} />
          {summary.carriedOverCount} unpaid expense{summary.carriedOverCount > 1 ? "s" : ""} carried over from previous
          months — {formatCurrency(summary.carriedOverTotal)} total.
        </div>
      )}

      {/* Monthly breakdown */}
      <div className="mb-5 rounded-[2rem] bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-bold text-slate-950">Monthly Breakdown</h3>
        {!monthlyBreakdown.length ? (
          <EmptyState text="No expenses recorded yet." />
        ) : (
          <div className="overflow-hidden rounded-[1.5rem] border border-slate-100">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Month</th>
                  <th className="px-4 py-3 text-right">Total Expenses</th>
                  <th className="px-4 py-3 text-right">Paid</th>
                  <th className="px-4 py-3 text-right">Pending</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthlyBreakdown.map((row) => (
                  <tr key={row.month} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {row.month}
                      {row.month === currentMonth() && (
                        <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                          This month
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-950">{formatCurrency(row.total)}</td>
                    <td className="px-4 py-3 text-right text-emerald-700">{formatCurrency(row.paid)}</td>
                    <td className="px-4 py-3 text-right text-amber-700">{formatCurrency(row.pending)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Ledger */}
      <div className="rounded-[2rem] bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-1.5">
            {["All", "Fixed", "Variable"].map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`rounded-2xl px-3 py-2 text-xs font-bold transition ${
                  typeFilter === t ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="h-10 rounded-2xl bg-slate-100 px-4 text-sm font-medium text-slate-800 outline-none ring-blue-100 transition focus:ring-4"
          >
            {months.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {!visibleExpenses.length ? (
          <EmptyState text="No expenses for this view yet." />
        ) : (
          <div className="overflow-hidden rounded-[1.5rem] border border-slate-100">
            <table className="w-full min-w-[800px] border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Month</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Paid Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleExpenses.map((expense) => {
                  const carried = isCarriedOver(expense);
                  return (
                    <tr key={expense.id} className="hover:bg-slate-50">
                      <td className={`px-4 py-4 ${carried ? "border-l-4 border-amber-400" : ""}`}>
                        <button
                          onClick={() =>
                            expense.status === "Paid" ? markExpenseUnpaid(expense.id) : markExpensePaid(expense.id)
                          }
                          title={expense.status === "Paid" ? "Mark as Pending" : "Mark as Paid"}
                          className="transition hover:opacity-70"
                        >
                          <StatusBadge status={expense.status} />
                        </button>
                      </td>
                      <td className="px-4 py-4 font-semibold text-slate-800">{expense.name}</td>
                      <td className="px-4 py-4 text-slate-500">{expense.category}</td>
                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                            expense.templateId ? "bg-blue-50 text-blue-700" : "bg-violet-50 text-violet-700"
                          }`}
                        >
                          {expense.templateId ? "Fixed" : "Variable"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {expense.month}
                        {carried && (
                          <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                            Carried over
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right font-bold text-slate-950">{formatCurrency(expense.amount)}</td>
                      <td className="px-4 py-4 text-slate-500">{expense.paidDate || "—"}</td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-1.5">
                          <button
                            title="Edit"
                            onClick={() => { setEditingExpense(expense); setShowExpenseModal(true); }}
                            className="rounded-xl bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            title="Delete"
                            onClick={() => deleteExpense(expense.id)}
                            className="rounded-xl bg-rose-50 p-2 text-rose-600 hover:bg-rose-100"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Fixed expense templates */}
      <div className="mt-5 rounded-[2rem] bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-bold text-slate-950">Fixed Expense Templates</h3>
        {!templates.length ? (
          <EmptyState text="No fixed expenses set up yet. Add one to auto-generate it every month." />
        ) : (
          <div className="space-y-2">
            {templates.map((t) => (
              <div
                key={t.id}
                className={`flex items-center justify-between rounded-2xl px-4 py-3 ${
                  t.active ? "bg-slate-50" : "bg-slate-50/50 opacity-60"
                }`}
              >
                <div>
                  <p className="font-semibold text-slate-800">{t.name}</p>
                  <p className="text-xs text-slate-400">
                    {t.category} · {formatCurrency(t.amount)}/month · from {t.startMonth}
                    {!t.active && " · Inactive"}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <button
                    title="Edit"
                    onClick={() => { setEditingTemplate(t); setShowTemplateModal(true); }}
                    className="rounded-xl bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"
                  >
                    <Pencil size={13} />
                  </button>
                  {t.active ? (
                    <button
                      title="Deactivate"
                      onClick={() => deleteExpenseTemplate(t.id)}
                      className="rounded-xl bg-rose-50 p-2 text-rose-600 hover:bg-rose-100"
                    >
                      <Ban size={13} />
                    </button>
                  ) : (
                    <button
                      title="Reactivate"
                      onClick={() => updateExpenseTemplate(t.id, { active: true })}
                      className="rounded-xl bg-emerald-50 p-2 text-emerald-600 hover:bg-emerald-100"
                    >
                      <RotateCcw size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showExpenseModal && (
        <ExpenseFormModal
          initial={editingExpense}
          onSave={handleSaveExpense}
          onClose={() => { setShowExpenseModal(false); setEditingExpense(null); }}
        />
      )}
      {showTemplateModal && (
        <TemplateFormModal
          initial={editingTemplate}
          onSave={handleSaveTemplate}
          onClose={() => { setShowTemplateModal(false); setEditingTemplate(null); }}
        />
      )}
    </motion.div>
  );
}
