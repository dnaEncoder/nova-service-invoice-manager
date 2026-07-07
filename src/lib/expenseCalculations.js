import { uid, safeNumber, todayISO } from "./utils";

export function currentMonth() {
  return todayISO().slice(0, 7);
}

// Derived, never stored — recalculated on every render so it can't go stale.
export function isCarriedOver(expense, refMonth = currentMonth()) {
  return expense.status === "Pending" && expense.month < refMonth;
}

// Idempotent: only adds rows for (template, targetMonth) pairs that don't already
// exist. Never touches or removes existing rows from other months, so an unpaid
// expense from an earlier month always survives as its own separately-payable row.
export function ensureMonthlyExpenseInstances(expenseTemplates, expenses, targetMonth = currentMonth()) {
  const existingKeys = new Set(
    expenses.filter((e) => e.templateId).map((e) => `${e.templateId}::${e.month}`)
  );

  const newRows = expenseTemplates
    .filter((t) => t.active && t.startMonth <= targetMonth)
    .filter((t) => !existingKeys.has(`${t.id}::${targetMonth}`))
    .map((t) => ({
      id: uid(),
      templateId: t.id,
      name: t.name,
      category: t.category,
      amount: t.amount,
      month: targetMonth,
      status: "Pending",
      paidDate: "",
      paidAmount: 0,
      notes: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

  return newRows.length === 0 ? expenses : [...expenses, ...newRows];
}

export function summarizeExpenses(data, refMonth = currentMonth()) {
  const expenses = data.expenses || [];

  const totalPending = expenses
    .filter((e) => e.status === "Pending")
    .reduce((s, e) => s + safeNumber(e.amount), 0);

  const totalPaid = expenses
    .filter((e) => e.status === "Paid")
    .reduce((s, e) => s + safeNumber(e.paidAmount || e.amount), 0);

  const paidThisMonth = expenses
    .filter((e) => e.status === "Paid" && (e.paidDate || "").startsWith(refMonth))
    .reduce((s, e) => s + safeNumber(e.paidAmount || e.amount), 0);

  const pendingThisMonth = expenses
    .filter((e) => e.status === "Pending" && e.month === refMonth)
    .reduce((s, e) => s + safeNumber(e.amount), 0);

  const carriedOver = expenses.filter((e) => isCarriedOver(e, refMonth));
  const carriedOverTotal = carriedOver.reduce((s, e) => s + safeNumber(e.amount), 0);

  return {
    totalExpenses: totalPending + totalPaid,
    totalPending,
    totalPaid,
    paidThisMonth,
    pendingThisMonth,
    carriedOverCount: carriedOver.length,
    carriedOverTotal,
  };
}

// One row per month present in the ledger, newest first. Grouped by the
// obligation's own `month` field (accrual basis) — a March rent still shows
// under March even if it's paid in June, consistent with the carry-over model.
export function summarizeExpensesByMonth(expenses) {
  const byMonth = {};
  for (const e of expenses) {
    if (!byMonth[e.month]) byMonth[e.month] = { month: e.month, total: 0, paid: 0, pending: 0 };
    const row = byMonth[e.month];
    row.total += safeNumber(e.amount);
    if (e.status === "Paid") row.paid += safeNumber(e.paidAmount || e.amount);
    else row.pending += safeNumber(e.amount);
  }
  return Object.values(byMonth).sort((a, b) => (a.month < b.month ? 1 : -1));
}
