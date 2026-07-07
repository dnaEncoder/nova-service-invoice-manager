import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { computeInvoiceStatus } from "./lib/calculations";
import { todayISO } from "./lib/utils";
import { ensureMonthlyExpenseInstances, currentMonth } from "./lib/expenseCalculations";
import {
  STORAGE_KEY,
  loadState,
  createSampleData,
  createBlankClient,
  createBlankProject,
  createBlankBillingModel,
  createBlankInvoiceStage,
  createBlankInvoice,
  createBlankPayment,
  createBlankExpenseTemplate,
  createBlankExpense,
  emptyServiceItem,
} from "./lib/schema";

import Sidebar from "./components/layout/Sidebar";
import Dashboard from "./views/Dashboard";
import ClientsView from "./views/ClientsView";
import ProjectDetailView from "./views/ProjectDetailView";
import InvoicesList from "./views/InvoicesList";
import InvoiceEditor from "./views/InvoiceEditor";
const InvoicePreview = lazy(() => import("./views/InvoicePreview"));
import BusinessSettings from "./views/BusinessSettings";
import PaymentsView from "./views/PaymentsView";
import ExpensesView from "./views/ExpensesView";
import ConfirmDialog from "./components/ui/ConfirmDialog";
import ReportsView from "./views/ReportsView";
import SettingsView from "./views/SettingsView";
import BillingSetupView from "./views/BillingSetupView";

export default function App() {
  const [data, setData] = useState(loadState);
  const [view, setView] = useState("dashboard");
  const [prevView, setPrevView] = useState("invoices");
  const [selectedClientId, setSelectedClientId] = useState(() => loadState().clients[0]?.id || null);
  const [selectedProjectId, setSelectedProjectId] = useState(() => loadState().projects[0]?.id || null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(() => loadState().invoices[0]?.id || null);
  const [invoiceQuery, setInvoiceQuery] = useState("");
  const [clientQuery, setClientQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [confirmState, setConfirmState] = useState(null); // { message, action } | null

  // Tauri's webview doesn't reliably support native window.confirm() (especially
  // WebView2 on Windows), so destructive actions route through this in-app dialog.
  function confirmThen(message, action) {
    setConfirmState({ message, action });
  }

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    if (view !== "expenses") return;
    setData((prev) => {
      const nextExpenses = ensureMonthlyExpenseInstances(prev.expenseTemplates, prev.expenses, currentMonth());
      return nextExpenses === prev.expenses ? prev : { ...prev, expenses: nextExpenses };
    });
  }, [view]);

  const selectedClient = data.clients.find((c) => c.id === selectedClientId) || null;
  const selectedProject = data.projects.find((p) => p.id === selectedProjectId) || null;
  const selectedInvoice = data.invoices.find((inv) => inv.id === selectedInvoiceId) || null;

  const filteredClients = useMemo(() => {
    const q = clientQuery.toLowerCase();
    return data.clients.filter((c) =>
      `${c.name} ${c.contactPerson} ${c.email} ${c.phone}`.toLowerCase().includes(q)
    );
  }, [data.clients, clientQuery]);

  const filteredInvoices = useMemo(() => {
    return data.invoices
      .filter((inv) => {
        const clientName = data.clients.find((c) => c.id === inv.clientId)?.name || "";
        const projectName = data.projects.find((p) => p.id === inv.projectId)?.name || "";
        const text = `${inv.invoiceNo} ${clientName} ${projectName} ${inv.type}`.toLowerCase();
        const matchesSearch = text.includes(invoiceQuery.toLowerCase());
        const computedStatus = computeInvoiceStatus(inv, data.payments);
        const matchesStatus = statusFilter === "All" || computedStatus === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }, [data.clients, data.projects, data.invoices, data.payments, invoiceQuery, statusFilter]);


  // ── Business ─────────────────────────────────────────────────────────────────

  function updateBusiness(key, value) {
    setData((prev) => ({
      ...prev,
      business: { ...prev.business, [key]: value },
    }));
  }

  // ── Clients ──────────────────────────────────────────────────────────────────

  function addClient() {
    const client = createBlankClient();
    const project = createBlankProject(client.id);
    setData((prev) => ({
      ...prev,
      clients: [client, ...prev.clients],
      projects: [project, ...prev.projects],
    }));
    setSelectedClientId(client.id);
    setSelectedProjectId(project.id);
    setView("clients");
  }

  function updateClient(id, patch) {
    setData((prev) => ({
      ...prev,
      clients: prev.clients.map((c) =>
        c.id === id ? { ...c, ...patch, updatedAt: new Date().toISOString() } : c
      ),
    }));
  }

  function deleteClient(id) {
    confirmThen("Delete this client, its projects, and all related invoices?", () => {
      setData((prev) => {
        const projectIds = prev.projects.filter((p) => p.clientId === id).map((p) => p.id);
        const clients = prev.clients.filter((c) => c.id !== id);
        const projects = prev.projects.filter((p) => p.clientId !== id);
        const invoices = prev.invoices.filter((inv) => !projectIds.includes(inv.projectId));
        const payments = prev.payments.filter((pay) => {
          const inv = invoices.find((i) => i.id === pay.invoiceId);
          return !!inv;
        });
        const billingModels = prev.billingModels.filter((bm) => !projectIds.includes(bm.projectId));
        const invoiceStages = prev.invoiceStages.filter((s) => !projectIds.includes(s.projectId));
        const nextClientId = clients[0]?.id || null;
        const nextProjectId = projects.find((p) => p.clientId === nextClientId)?.id || null;
        setSelectedClientId(nextClientId);
        setSelectedProjectId(nextProjectId);
        setSelectedInvoiceId(invoices[0]?.id || null);
        return { ...prev, clients, projects, invoices, payments, billingModels, invoiceStages };
      });
    });
  }

  // ── Projects ─────────────────────────────────────────────────────────────────

  function addProject(clientId = selectedClientId) {
    if (!clientId) return addClient();
    const project = createBlankProject(clientId);
    setData((prev) => ({ ...prev, projects: [project, ...prev.projects] }));
    setSelectedClientId(clientId);
    setSelectedProjectId(project.id);
    setView("projectDetail");
  }

  function updateProject(id, patch) {
    setData((prev) => ({
      ...prev,
      projects: prev.projects.map((p) =>
        p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p
      ),
    }));
  }

  function deleteProject(id) {
    confirmThen("Delete this project and all invoices under it?", () => {
      setData((prev) => {
        const projects = prev.projects.filter((p) => p.id !== id);
        const deletedInvoiceIds = prev.invoices
          .filter((inv) => inv.projectId === id)
          .map((inv) => inv.id);
        const invoices = prev.invoices.filter((inv) => inv.projectId !== id);
        const payments = prev.payments.filter((pay) => !deletedInvoiceIds.includes(pay.invoiceId));
        const billingModels = prev.billingModels.filter((bm) => bm.projectId !== id);
        const invoiceStages = prev.invoiceStages.filter((s) => s.projectId !== id);
        const nextProjectId =
          projects.find((p) => p.clientId === selectedClientId)?.id || projects[0]?.id || null;
        setSelectedProjectId(nextProjectId);
        setSelectedInvoiceId(invoices[0]?.id || null);
        return { ...prev, projects, invoices, payments, billingModels, invoiceStages };
      });
    });
  }

  // ── Invoices ─────────────────────────────────────────────────────────────────

  function addInvoice(clientId = selectedClientId, projectId = selectedProjectId, stageId = "", returnTo = "invoices") {
    let cid = clientId || data.clients[0]?.id;
    let pid = projectId || data.projects.find((p) => p.clientId === cid)?.id;

    if (!cid || !pid) {
      const client = createBlankClient();
      const project = createBlankProject(client.id);
      const invoice = createBlankInvoice({ ...data, invoices: [] }, client.id, project.id);
      setData((prev) => ({
        ...prev,
        clients: [client, ...prev.clients],
        projects: [project, ...prev.projects],
        invoices: [invoice, ...prev.invoices],
      }));
      setSelectedClientId(client.id);
      setSelectedProjectId(project.id);
      setSelectedInvoiceId(invoice.id);
      setPrevView("invoices");
      setView("editor");
      return;
    }

    const invoice = createBlankInvoice(data, cid, pid, stageId);
    setData((prev) => ({ ...prev, invoices: [invoice, ...prev.invoices] }));
    setSelectedClientId(cid);
    setSelectedProjectId(pid);
    setSelectedInvoiceId(invoice.id);
    setPrevView(returnTo);
    setView("editor");
  }

  function updateInvoice(id, patch) {
    setData((prev) => ({
      ...prev,
      invoices: prev.invoices.map((inv) =>
        inv.id === id ? { ...inv, ...patch, updatedAt: new Date().toISOString() } : inv
      ),
    }));
  }

  function voidInvoice(id) {
    confirmThen("Void this invoice? It will be marked as void and excluded from financial totals.", () => {
      setData((prev) => ({
        ...prev,
        invoices: prev.invoices.map((inv) =>
          inv.id === id ? { ...inv, voidedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : inv
        ),
      }));
    });
  }

  // ── Service items ─────────────────────────────────────────────────────────────

  function updateServiceItem(invoiceId, itemId, key, value) {
    setData((prev) => ({
      ...prev,
      invoices: prev.invoices.map((inv) => {
        if (inv.id !== invoiceId) return inv;
        return {
          ...inv,
          serviceItems: inv.serviceItems.map((item) =>
            item.id === itemId ? { ...item, [key]: value } : item
          ),
          updatedAt: new Date().toISOString(),
        };
      }),
    }));
  }

  function addServiceItem(invoiceId) {
    setData((prev) => ({
      ...prev,
      invoices: prev.invoices.map((inv) =>
        inv.id === invoiceId
          ? {
              ...inv,
              serviceItems: [...inv.serviceItems, emptyServiceItem()],
              updatedAt: new Date().toISOString(),
            }
          : inv
      ),
    }));
  }

  function removeServiceItem(invoiceId, itemId) {
    setData((prev) => ({
      ...prev,
      invoices: prev.invoices.map((inv) => {
        if (inv.id !== invoiceId) return inv;
        const next = inv.serviceItems.filter((item) => item.id !== itemId);
        return {
          ...inv,
          serviceItems: next.length ? next : [emptyServiceItem()],
          updatedAt: new Date().toISOString(),
        };
      }),
    }));
  }

  // ── Payments ──────────────────────────────────────────────────────────────────

  function addPayment(invoiceId, paymentData) {
    const payment = {
      ...createBlankPayment(invoiceId),
      ...paymentData,
    };
    setData((prev) => ({ ...prev, payments: [...prev.payments, payment] }));
  }

  function deletePayment(paymentId) {
    confirmThen("Delete this payment entry?", () => {
      setData((prev) => ({
        ...prev,
        payments: prev.payments.filter((p) => p.id !== paymentId),
      }));
    });
  }

  // ── Billing models ────────────────────────────────────────────────────────────

  function addBillingModel(projectId, type = "advance-final") {
    const bm = createBlankBillingModel(projectId);
    const updated = { ...bm, type };
    setData((prev) => ({ ...prev, billingModels: [...prev.billingModels, updated] }));
    return updated.id;
  }

  function updateBillingModel(id, patch) {
    setData((prev) => ({
      ...prev,
      billingModels: prev.billingModels.map((bm) =>
        bm.id === id ? { ...bm, ...patch, updatedAt: new Date().toISOString() } : bm
      ),
    }));
  }

  function deleteBillingModel(id) {
    setData((prev) => ({
      ...prev,
      billingModels: prev.billingModels.filter((bm) => bm.id !== id),
      invoiceStages: prev.invoiceStages.filter((s) => s.billingModelId !== id),
    }));
  }

  // ── Invoice stages ────────────────────────────────────────────────────────────

  function addInvoiceStage(billingModelId, projectId, clientId) {
    const existingCount = data.invoiceStages.filter(
      (s) => s.billingModelId === billingModelId
    ).length;
    const stage = {
      ...createBlankInvoiceStage(billingModelId, projectId, clientId),
      order: existingCount,
    };
    setData((prev) => ({ ...prev, invoiceStages: [...prev.invoiceStages, stage] }));
  }

  function updateInvoiceStage(id, patch) {
    setData((prev) => ({
      ...prev,
      invoiceStages: prev.invoiceStages.map((s) =>
        s.id === id ? { ...s, ...patch, updatedAt: new Date().toISOString() } : s
      ),
    }));
  }

  function deleteInvoiceStage(id) {
    setData((prev) => ({
      ...prev,
      invoiceStages: prev.invoiceStages.filter((s) => s.id !== id),
    }));
  }

  function generateInvoiceFromStage(stage) {
    const inv = createBlankInvoice(data, stage.clientId, stage.projectId, stage.id);
    // Pre-fill with stage amount and description
    const serviceItem = {
      ...emptyServiceItem(),
      description: stage.name,
      amount: stage.amount,
      linkedStageId: stage.id,
    };
    const filledInvoice = { ...inv, type: stage.type, serviceItems: [serviceItem] };

    setData((prev) => ({
      ...prev,
      invoices: [filledInvoice, ...prev.invoices],
      invoiceStages: prev.invoiceStages.map((s) =>
        s.id === stage.id
          ? { ...s, stageStatus: "Generated", invoiceId: filledInvoice.id, updatedAt: new Date().toISOString() }
          : s
      ),
    }));
    setSelectedClientId(stage.clientId);
    setSelectedProjectId(stage.projectId);
    setSelectedInvoiceId(filledInvoice.id);
    setPrevView("projectDetail");
    setView("editor");
  }

  // ── Expense templates (fixed/recurring) ─────────────────────────────────────

  function addExpenseTemplate(templateData = {}) {
    const template = { ...createBlankExpenseTemplate(), ...templateData };
    setData((prev) => {
      const expenseTemplates = [template, ...prev.expenseTemplates];
      const expenses = ensureMonthlyExpenseInstances(expenseTemplates, prev.expenses, currentMonth());
      return { ...prev, expenseTemplates, expenses };
    });
  }

  function updateExpenseTemplate(id, patch) {
    setData((prev) => ({
      ...prev,
      expenseTemplates: prev.expenseTemplates.map((t) =>
        t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t
      ),
    }));
  }

  function deleteExpenseTemplate(id) {
    confirmThen(
      "Deactivate this fixed expense? Past entries are kept, but no new monthly entries will be created.",
      () => {
        setData((prev) => ({
          ...prev,
          expenseTemplates: prev.expenseTemplates.map((t) =>
            t.id === id ? { ...t, active: false, updatedAt: new Date().toISOString() } : t
          ),
        }));
      }
    );
  }

  // ── Expenses (ledger rows: variable one-offs + generated fixed instances) ───

  function addExpense(month, expenseData = {}) {
    const expense = { ...createBlankExpense(month, null), ...expenseData };
    setData((prev) => ({ ...prev, expenses: [expense, ...prev.expenses] }));
  }

  function updateExpense(id, patch) {
    setData((prev) => ({
      ...prev,
      expenses: prev.expenses.map((e) =>
        e.id === id ? { ...e, ...patch, updatedAt: new Date().toISOString() } : e
      ),
    }));
  }

  function deleteExpense(id) {
    confirmThen("Delete this expense entry?", () => {
      setData((prev) => ({ ...prev, expenses: prev.expenses.filter((e) => e.id !== id) }));
    });
  }

  function markExpensePaid(id, paidDate = todayISO()) {
    setData((prev) => ({
      ...prev,
      expenses: prev.expenses.map((e) =>
        e.id === id
          ? { ...e, status: "Paid", paidDate, paidAmount: e.amount, updatedAt: new Date().toISOString() }
          : e
      ),
    }));
  }

  function markExpenseUnpaid(id) {
    setData((prev) => ({
      ...prev,
      expenses: prev.expenses.map((e) =>
        e.id === id
          ? { ...e, status: "Pending", paidDate: "", paidAmount: 0, updatedAt: new Date().toISOString() }
          : e
      ),
    }));
  }

  // ── Navigation helpers ────────────────────────────────────────────────────────

  function openPreview(invoice) {
    setSelectedClientId(invoice.clientId);
    setSelectedProjectId(invoice.projectId);
    setSelectedInvoiceId(invoice.id);
    setView("preview");
  }

  function resetDemoData() {
    confirmThen("Reset all local data and reload sample data?", () => {
      const sample = createSampleData();
      setData(sample);
      setSelectedClientId(sample.clients[0]?.id || null);
      setSelectedProjectId(sample.projects[0]?.id || null);
      setSelectedInvoiceId(sample.invoices[0]?.id || null);
      setView("dashboard");
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  const clientForInvoice = selectedInvoice
    ? data.clients.find((c) => c.id === selectedInvoice.clientId)
    : null;
  const projectForInvoice = selectedInvoice
    ? data.projects.find((p) => p.id === selectedInvoice.projectId)
    : null;

  return (
    <div className="flex min-h-screen bg-[#f5f7fb] text-slate-900">
      <Sidebar view={view} onNavigate={setView} business={data.business} />

      <main className="flex-1 min-w-0 overflow-auto">
        <div className="mx-auto max-w-7xl px-5 py-6 lg:px-8">
          {view === "dashboard" && (
            <Dashboard
              data={data}
              onOpenProject={(project) => {
                setSelectedClientId(project.clientId);
                setSelectedProjectId(project.id);
                setView("projectDetail");
              }}
              onNavigate={setView}
            />
          )}

          {view === "clients" && (
            <ClientsView
              data={data}
              filteredClients={filteredClients}
              clientQuery={clientQuery}
              setClientQuery={setClientQuery}
              selectedClient={selectedClient}
              selectedClientId={selectedClientId}
              setSelectedClientId={setSelectedClientId}
              updateClient={updateClient}
              deleteClient={deleteClient}
              addProject={addProject}
              openPreview={openPreview}
              onAddClient={addClient}
              onOpenProject={(project) => {
                setSelectedClientId(project.clientId);
                setSelectedProjectId(project.id);
                setView("projectDetail");
              }}
              onNavigate={setView}
            />
          )}

          {view === "projectDetail" && selectedProject && (
            <ProjectDetailView
              data={data}
              project={selectedProject}
              client={selectedClient}
              updateProject={updateProject}
              deleteProject={(id) => { deleteProject(id); setView("clients"); }}
              addInvoice={(cid, pid, stageId) => addInvoice(cid, pid, stageId, "projectDetail")}
              openPreview={openPreview}
              onBillingSetup={(project) => {
                setSelectedClientId(project.clientId);
                setSelectedProjectId(project.id);
                setView("billingSetup");
              }}
              onBack={() => setView("clients")}
            />
          )}

          {view === "invoices" && (
            <InvoicesList
              data={data}
              invoices={filteredInvoices}
              invoiceQuery={invoiceQuery}
              setInvoiceQuery={setInvoiceQuery}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              onView={openPreview}
              onAddInvoice={() => addInvoice()}
              addPayment={addPayment}
            />
          )}

          {view === "payments" && <PaymentsView data={data} deletePayment={deletePayment} />}

          {view === "expenses" && (
            <ExpensesView
              data={data}
              addExpenseTemplate={addExpenseTemplate}
              updateExpenseTemplate={updateExpenseTemplate}
              deleteExpenseTemplate={deleteExpenseTemplate}
              addExpense={addExpense}
              updateExpense={updateExpense}
              deleteExpense={deleteExpense}
              markExpensePaid={markExpensePaid}
              markExpenseUnpaid={markExpenseUnpaid}
            />
          )}

          {view === "business" && (
            <BusinessSettings business={data.business} updateBusiness={updateBusiness} />
          )}

          {view === "reports" && <ReportsView data={data} />}

          {view === "settings" && <SettingsView onReset={resetDemoData} />}

          {view === "editor" && selectedInvoice && (
            <InvoiceEditor
              data={data}
              invoice={selectedInvoice}
              client={clientForInvoice}
              project={projectForInvoice}
              updateInvoice={updateInvoice}
              updateServiceItem={updateServiceItem}
              addServiceItem={addServiceItem}
              removeServiceItem={removeServiceItem}
              addPayment={addPayment}
              deletePayment={deletePayment}
              voidInvoice={voidInvoice}
              onPreview={() => setView("preview")}
              onClose={() => setView(prevView)}
            />
          )}

          {view === "preview" && selectedInvoice && (
            <Suspense fallback={
              <div className="flex items-center justify-center py-24 text-slate-400 text-sm">
                Loading preview…
              </div>
            }>
              <InvoicePreview
                data={data}
                invoice={selectedInvoice}
                client={clientForInvoice}
                project={projectForInvoice}
                onBack={() => setView(prevView)}
                onEdit={() => setView("editor")}
              />
            </Suspense>
          )}

          {view === "billingSetup" && selectedProject && (
            <BillingSetupView
              data={data}
              project={selectedProject}
              client={selectedClient}
              addBillingModel={addBillingModel}
              updateBillingModel={updateBillingModel}
              deleteBillingModel={deleteBillingModel}
              addInvoiceStage={addInvoiceStage}
              updateInvoiceStage={updateInvoiceStage}
              deleteInvoiceStage={deleteInvoiceStage}
              generateInvoiceFromStage={generateInvoiceFromStage}
              updateProject={updateProject}
              onBack={() => setView("projectDetail")}
            />
          )}
        </div>
      </main>

      {confirmState && (
        <ConfirmDialog
          message={confirmState.message}
          onCancel={() => setConfirmState(null)}
          onConfirm={() => {
            confirmState.action();
            setConfirmState(null);
          }}
        />
      )}
    </div>
  );
}
