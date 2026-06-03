export function uid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysISO(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function safeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(safeNumber(value));
}

export function getClientName(clients, clientId) {
  return clients.find((c) => c.id === clientId)?.name || "Unnamed Client";
}

export function getProjectName(projects, projectId) {
  return projects.find((p) => p.id === projectId)?.name || "No Project";
}

export function getBillingModelLabel(type) {
  const labels = {
    "advance-final": "Advance + Final",
    milestone: "Milestone Based",
    "full-amount": "Full Amount",
    "monthly-retainer": "Monthly Retainer",
    addon: "Add-on / Additional Scope",
  };
  return labels[type] || type;
}
