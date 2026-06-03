import { safeNumber, todayISO } from "./utils";

// Evaluates a stage's effective status from its unlock rule and current data.
// Only overrides if the stage is still in a mutable state (not Generated/Paid).
export function evaluateStageStatus(stage, allStages, allInvoices, allPayments, allProjects) {
  if (stage.stageStatus === "Generated" || stage.stageStatus === "Paid") return stage.stageStatus;

  switch (stage.unlockRule) {
    case "immediate":
      return "Ready";

    case "project-delivered": {
      const project = allProjects.find((p) => p.id === stage.projectId);
      const done = project?.status === "Delivered" || project?.status === "Completed";
      return done ? "Ready" : "Locked";
    }

    case "previous-paid": {
      const siblings = allStages
        .filter((s) => s.projectId === stage.projectId && s.billingModelId === stage.billingModelId)
        .sort((a, b) => a.order - b.order);
      const myIdx = siblings.findIndex((s) => s.id === stage.id);
      if (myIdx <= 0) return "Ready";
      const prev = siblings[myIdx - 1];
      if (!prev.invoiceId) return "Locked";
      const prevInv = allInvoices.find((inv) => inv.id === prev.invoiceId);
      if (!prevInv) return "Locked";
      return computeInvoiceStatus(prevInv, allPayments) === "Paid" ? "Ready" : "Locked";
    }

    case "milestone-approved":
      return stage.stageStatus === "Ready" ? "Ready" : "Locked";

    case "period-start": {
      const today = todayISO();
      const project = allProjects.find((p) => p.id === stage.projectId);
      const start = project?.billingStartDate || stage.dueDate;
      return !start || start <= today ? "Ready" : "Locked";
    }

    default:
      return stage.stageStatus;
  }
}

export function calculateInvoice(invoice, allPayments = []) {
  const serviceItems = Array.isArray(invoice?.serviceItems) ? invoice.serviceItems : [];

  const subtotal = serviceItems.reduce((sum, item) => sum + safeNumber(item.amount), 0);
  const taxTotal = serviceItems.reduce((sum, item) => {
    return sum + (safeNumber(item.amount) * safeNumber(item.tax)) / 100;
  }, 0);

  const gross = subtotal + taxTotal;
  const discount =
    invoice?.discountType === "percent"
      ? (gross * safeNumber(invoice.discountValue)) / 100
      : safeNumber(invoice?.discountValue);

  const total = Math.max(gross - discount, 0);

  // Use payment entries when available; fall back to legacy paidAmount field
  const invoicePayments = allPayments.filter((p) => p.invoiceId === invoice?.id);
  const rawPaid =
    invoicePayments.length > 0
      ? invoicePayments.reduce((sum, p) => sum + safeNumber(p.amount), 0)
      : safeNumber(invoice?.paidAmount);

  const paid = Math.min(rawPaid, total);
  const due = Math.max(total - paid, 0);

  return { subtotal, taxTotal, gross, discount, total, paid, due };
}

// Derives invoice status from payment data and dates — not from the stored status field.
// Voided is the only status that requires a stored flag.
export function computeInvoiceStatus(invoice, allPayments = []) {
  if (invoice.voidedAt) return "Voided";

  const invoicePayments = allPayments.filter((p) => p.invoiceId === invoice.id);
  const rawPaid =
    invoicePayments.length > 0
      ? invoicePayments.reduce((sum, p) => sum + safeNumber(p.amount), 0)
      : safeNumber(invoice.paidAmount);

  const totals = calculateInvoice(invoice, allPayments);

  if (totals.total > 0 && rawPaid >= totals.total) return "Paid";
  if (rawPaid > 0) return "Partially Paid";
  if (invoice.sentDate) {
    const today = todayISO();
    if (invoice.dueDate && invoice.dueDate < today) return "Overdue";
    return "Sent";
  }
  return "Draft";
}

export function getProjectSummary(project, invoices, allPayments = []) {
  if (!project) {
    return {
      projectValue: 0,
      invoiceCount: 0,
      invoiced: 0,
      invoicedSubtotal: 0,
      paid: 0,
      pending: 0,
      remainingToInvoice: 0,
      advanceInvoiced: 0,
      advancePaid: 0,
    };
  }

  const projectInvoices = invoices.filter(
    (inv) => inv.projectId === project.id && !inv.voidedAt
  );

  const totals = projectInvoices.reduce(
    (acc, inv) => {
      const t = calculateInvoice(inv, allPayments);
      acc.invoiced += t.total;
      acc.invoicedSubtotal += t.subtotal; // excl. GST — used for "Balance to Invoice" per PRD §5
      acc.paid += t.paid;
      if (inv.type === "Advance") {
        acc.advanceInvoiced += t.total;
        acc.advancePaid += t.paid;
      }
      return acc;
    },
    { invoiced: 0, invoicedSubtotal: 0, paid: 0, advanceInvoiced: 0, advancePaid: 0 }
  );

  const projectValue = safeNumber(project.totalValue);

  return {
    projectValue,
    invoiceCount: projectInvoices.length,
    invoiced: totals.invoiced,
    invoicedSubtotal: totals.invoicedSubtotal,
    paid: totals.paid,
    pending: Math.max(totals.invoiced - totals.paid, 0),
    // PRD §5: balance uses subtotal (excl. GST), not invoice total
    remainingToInvoice: Math.max(projectValue - totals.invoicedSubtotal, 0),
    advanceInvoiced: totals.advanceInvoiced,
    advancePaid: totals.advancePaid,
  };
}
