export const INVOICE_STATUSES = ["Draft", "Sent", "Partially Paid", "Paid", "Overdue", "Voided"];
export const PROJECT_STATUSES = ["Active", "Delivered", "Completed", "On Hold", "Cancelled"];
export const CLIENT_STATUSES = ["Active", "Inactive", "New"];
export const INVOICE_TYPES = ["Advance", "Milestone", "Monthly Retainer", "Final Payment", "One-Time Service", "Add-on"];
export const PAYMENT_MODES = ["Bank Transfer", "UPI", "Cash", "Cheque", "Other"];
export const STAGE_STATUSES = ["Locked", "Ready", "Generated", "Paid"];

export const BILLING_MODEL_TYPES = [
  { id: "advance-final", label: "Advance + Final" },
  { id: "milestone", label: "Milestone Based" },
  { id: "full-amount", label: "Full Amount" },
  { id: "monthly-retainer", label: "Monthly Retainer" },
  { id: "addon", label: "Add-on / Additional Scope" },
];

export const STATUS_STYLES = {
  Draft: "bg-slate-100 text-slate-700",
  Sent: "bg-blue-100 text-blue-700",
  "Partially Paid": "bg-amber-100 text-amber-800",
  Paid: "bg-emerald-100 text-emerald-700",
  Overdue: "bg-rose-100 text-rose-700",
  Voided: "bg-slate-200 text-slate-500",
  Active: "bg-blue-100 text-blue-700",
  Delivered: "bg-purple-100 text-purple-700",
  Completed: "bg-emerald-100 text-emerald-700",
  "On Hold": "bg-amber-100 text-amber-800",
  Cancelled: "bg-rose-100 text-rose-700",
  New: "bg-sky-100 text-sky-700",
  Inactive: "bg-slate-100 text-slate-500",
  Ready: "bg-emerald-100 text-emerald-700",
  Locked: "bg-rose-100 text-rose-700",
  Generated: "bg-blue-100 text-blue-700",
  Pending: "bg-amber-100 text-amber-800",
};

export const EXPENSE_CATEGORIES = [
  "Rent",
  "Salaries",
  "Subscriptions",
  "Utilities",
  "Software & Tools",
  "Marketing",
  "Travel",
  "Office Supplies",
  "Professional Fees",
  "Other",
];

export const EXPENSE_STATUSES = ["Pending", "Paid"];
