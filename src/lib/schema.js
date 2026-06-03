import { uid, todayISO, addDaysISO, safeNumber } from "./utils";

export const STORAGE_KEY = "nova_service_invoice_manager_v2";
export const CURRENT_VERSION = 2;

export const defaultBusiness = {
  name: "Nova Studios Marketing",
  email: "nova.socialmedia27@gmail.com",
  phone: "",
  address: "Hyderabad, Telangana",
  gstin: "",
  bankName: "",
  accountName: "",
  accountNumber: "",
  ifsc: "",
  upi: "",
};

// ── Entity factories ─────────────────────────────────────────────────────────

export function emptyServiceItem() {
  return { id: uid(), description: "", amount: 0, tax: 18, linkedStageId: "" };
}

export function createBlankClient() {
  return {
    id: uid(),
    name: "New Client",
    contactPerson: "",
    email: "",
    phone: "",
    address: "",
    gstin: "",
    status: "Active",
    notes: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function createBlankProject(clientId) {
  return {
    id: uid(),
    clientId,
    name: "New Project",
    category: "",
    totalValue: 0,
    startDate: todayISO(),
    endDate: "",
    deliveryDate: "",
    billingStartDate: todayISO(),
    billingOwner: "",
    status: "Active",
    description: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function createBlankBillingModel(projectId) {
  return {
    id: uid(),
    projectId,
    type: "advance-final",
    status: "draft", // draft | active
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function createBlankInvoiceStage(billingModelId, projectId, clientId) {
  return {
    id: uid(),
    billingModelId,
    projectId,
    clientId,
    name: "New Stage",
    type: "Advance",
    splitPercent: 0,
    amount: 0,
    trigger: "",
    dueDate: addDaysISO(10),
    stageStatus: "Ready", // Locked | Ready | Generated | Paid
    unlockCondition: "",
    unlockRule: "immediate", // immediate | project-delivered | previous-paid | milestone-approved | period-start
    order: 0,
    invoiceId: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function generateInvoiceNo(invoices, clients = [], projects = [], clientId = null, projectId = null) {
  const year = new Date().getFullYear();

  function toCode(name, len = 3) {
    const clean = (name || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    return clean.slice(0, len) || "XXX";
  }

  const client = clients.find((c) => c.id === clientId);
  const project = projects.find((p) => p.id === projectId);
  const cCode = toCode(client?.name);
  const pCode = toCode(project?.name);
  const prefix = `${cCode}-${pCode}-${year}`;

  // Sequence is scoped to same client-project-year prefix
  const existingNums = invoices
    .filter((inv) => inv.invoiceNo?.startsWith(prefix + "-"))
    .map((inv) => parseInt(inv.invoiceNo.split("-").pop(), 10) || 0);

  const next = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;
  return `${prefix}-${String(next).padStart(3, "0")}`;
}

export function createBlankInvoice(data, clientId, projectId, stageId = "") {
  return {
    id: uid(),
    invoiceNo: generateInvoiceNo(data.invoices, data.clients, data.projects, clientId, projectId),
    clientId,
    projectId,
    stageId,
    type: "Advance",
    issueDate: todayISO(),
    dueDate: addDaysISO(10),
    sentDate: "",
    paidDate: "",
    paidAmount: 0, // legacy field; payments[] is the source of truth when populated
    voidedAt: "",
    notes: "Thank you for your business.",
    terms: "Payment due within 10 days.",
    business: data.business || defaultBusiness,
    serviceItems: [emptyServiceItem()],
    discountType: "flat",
    discountValue: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function createBlankPayment(invoiceId) {
  return {
    id: uid(),
    invoiceId,
    amount: 0,
    date: todayISO(),
    mode: "Bank Transfer",
    reference: "",
    notes: "",
    createdAt: new Date().toISOString(),
  };
}

// ── Sample data ───────────────────────────────────────────────────────────────

export function createSampleData() {
  const clientId = uid();
  const projectId = uid();
  const billingModelId = uid();
  const advanceStageId = uid();
  const finalStageId = uid();
  const advanceInvoiceId = uid();
  const paymentId = uid();

  return {
    version: CURRENT_VERSION,
    business: defaultBusiness,
    clients: [
      {
        id: clientId,
        name: "BrightTech Solutions",
        contactPerson: "Priya Sharma",
        email: "priya@brighttech.com",
        phone: "+91 98765 43210",
        address: "Hyderabad, Telangana",
        gstin: "36AABCT1234Z1ZV",
        status: "New",
        notes: "Key client for website and marketing project.",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    projects: [
      {
        id: projectId,
        clientId,
        name: "Corporate Website Development",
        category: "Web + Marketing",
        totalValue: 100000,
        startDate: todayISO(),
        endDate: addDaysISO(60),
        deliveryDate: "",
        billingStartDate: todayISO(),
        billingOwner: "Arjun Mehta",
        status: "Active",
        description: "Full website redesign and digital marketing setup.",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    billingModels: [
      {
        id: billingModelId,
        projectId,
        type: "advance-final",
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    invoiceStages: [
      {
        id: advanceStageId,
        billingModelId,
        projectId,
        clientId,
        name: "Advance Invoice",
        type: "Advance",
        splitPercent: 40,
        amount: 40000,
        trigger: "On project kickoff",
        dueDate: addDaysISO(5),
        stageStatus: "Generated",
        unlockCondition: "",
        unlockRule: "immediate",
        order: 0,
        invoiceId: advanceInvoiceId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: finalStageId,
        billingModelId,
        projectId,
        clientId,
        name: "Final Invoice",
        type: "Final Payment",
        splitPercent: 60,
        amount: 60000,
        trigger: "On project delivery",
        dueDate: addDaysISO(65),
        stageStatus: "Locked",
        unlockCondition: "Project status must be Delivered and Advance Invoice must be Paid.",
        unlockRule: "project-delivered",
        order: 1,
        invoiceId: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    invoices: [
      {
        id: advanceInvoiceId,
        invoiceNo: "INV-2026-001",
        clientId,
        projectId,
        stageId: advanceStageId,
        type: "Advance",
        sentDate: todayISO(),
        paidDate: todayISO(),
        paidAmount: 47200, // legacy — payment entry below is the real record
        voidedAt: "",
        issueDate: todayISO(),
        dueDate: addDaysISO(5),
        notes: "Advance payment for project initiation.",
        terms: "Payment due within 5 days.",
        business: defaultBusiness,
        serviceItems: [
          {
            id: uid(),
            description: "Website Design — Advance Payment (40%)",
            amount: 40000,
            tax: 18,
            linkedStageId: advanceStageId,
          },
        ],
        discountType: "flat",
        discountValue: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    payments: [
      {
        id: paymentId,
        invoiceId: advanceInvoiceId,
        amount: 47200,
        date: todayISO(),
        mode: "Bank Transfer",
        reference: "NEFT-2026-001",
        notes: "Full advance received.",
        createdAt: new Date().toISOString(),
      },
    ],
    activityLogs: [
      {
        id: uid(),
        entityType: "invoice",
        entityId: advanceInvoiceId,
        action: "Invoice INV-2026-001 marked as Paid — ₹47,200 received.",
        timestamp: new Date().toISOString(),
        actor: "Nova Studios",
      },
    ],
  };
}

// ── Migration ─────────────────────────────────────────────────────────────────

function migrateData(raw) {
  if (!raw?.clients || !raw?.projects || !raw?.invoices) return null;

  const version = raw.version || 1;
  if (version === CURRENT_VERSION) return raw;

  // v1 → v2: add new fields to existing records, add missing entity arrays
  const migratedPayments = raw.payments || [];

  // Migrate legacy paidAmount to a payment entry if payments array is empty
  if (migratedPayments.length === 0) {
    raw.invoices.forEach((inv) => {
      if (safeNumber(inv.paidAmount) > 0) {
        migratedPayments.push({
          id: uid(),
          invoiceId: inv.id,
          amount: safeNumber(inv.paidAmount),
          date: inv.paidDate || todayISO(),
          mode: "Bank Transfer",
          reference: "",
          notes: "Migrated from v1",
          createdAt: new Date().toISOString(),
        });
      }
    });
  }

  return {
    ...raw,
    version: CURRENT_VERSION,
    clients: raw.clients.map((c) => ({
      contactPerson: "",
      status: "Active",
      ...c,
    })),
    projects: raw.projects.map((p) => ({
      category: "",
      billingStartDate: p.startDate || todayISO(),
      billingOwner: "",
      deliveryDate: "",
      ...p,
    })),
    invoices: raw.invoices.map((inv) => ({
      stageId: "",
      voidedAt: "",
      ...inv,
      serviceItems: (inv.serviceItems || []).map((item) => ({
        linkedStageId: "",
        ...item,
      })),
    })),
    billingModels: raw.billingModels || [],
    invoiceStages: raw.invoiceStages || [],
    payments: migratedPayments,
    activityLogs: raw.activityLogs || [],
  };
}

// ── Storage ───────────────────────────────────────────────────────────────────

export function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    // Check legacy key from v1
    if (!saved) {
      const legacy = localStorage.getItem("nova_service_invoice_manager_v1");
      if (legacy) {
        const parsed = JSON.parse(legacy);
        const migrated = migrateData(parsed);
        return migrated || createSampleData();
      }
      return createSampleData();
    }

    const parsed = JSON.parse(saved);
    const migrated = migrateData(parsed);
    return migrated || createSampleData();
  } catch {
    return createSampleData();
  }
}
