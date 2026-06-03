import { FileText } from "lucide-react";
import { calculateInvoice, computeInvoiceStatus } from "../lib/calculations";
import { formatCurrency, safeNumber } from "../lib/utils";
import StatusBadge from "../components/ui/StatusBadge";
import InfoBlock from "../components/ui/InfoBlock";
import TotalRow from "../components/ui/TotalRow";

export default function InvoicePaper({ invoice, client, project, projectSummary, allPayments = [] }) {
  const totals = calculateInvoice(invoice, allPayments);
  const computedStatus = computeInvoiceStatus(invoice, allPayments);

  return (
    <div id="printable-invoice" className="mx-auto max-w-4xl rounded-[2rem] bg-white p-8 shadow-sm md:p-10">
      {/* Header */}
      <div className="flex flex-col gap-6 border-b border-slate-200 pb-6 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <FileText size={22} />
          </div>
          <h2 className="text-2xl font-black text-slate-950">{invoice.business?.name || "Your Business"}</h2>
          <div className="mt-2 space-y-1 text-sm text-slate-500">
            <p>{invoice.business?.address}</p>
            <p>
              {invoice.business?.email}
              {invoice.business?.phone ? ` • ${invoice.business.phone}` : ""}
            </p>
            {invoice.business?.gstin && <p>GSTIN: {invoice.business.gstin}</p>}
          </div>
        </div>
        <div className="text-left md:text-right">
          <h1 className="text-4xl font-black tracking-tight text-slate-950">SERVICE INVOICE</h1>
          <p className="mt-2 text-lg font-bold text-blue-700">{invoice.invoiceNo}</p>
          <div className="mt-3 space-y-1 text-sm text-slate-500">
            <p>Invoice Type: {invoice.type}</p>
            <p>Issue Date: {invoice.issueDate}</p>
            <p>Due Date: {invoice.dueDate}</p>
            {invoice.sentDate && <p>Sent Date: {invoice.sentDate}</p>}
            <StatusBadge status={computedStatus} />
          </div>
        </div>
      </div>

      {/* Bill To + Project */}
      <div className="grid gap-6 py-6 md:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-5">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Bill To</p>
          <h3 className="text-lg font-bold text-slate-950">{client?.name || "Client Name"}</h3>
          {client?.contactPerson && (
            <p className="mt-1 text-sm font-medium text-slate-700">{client.contactPerson}</p>
          )}
          <div className="mt-2 space-y-1 text-sm text-slate-500">
            {client?.address && <p>{client.address}</p>}
            {client?.email && <p>{client.email}</p>}
            {client?.phone && <p>{client.phone}</p>}
            {client?.gstin && <p>GSTIN: {client.gstin}</p>}
          </div>
        </div>
        <div className="rounded-2xl bg-blue-50 p-5">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-blue-400">Project</p>
          <h3 className="text-lg font-bold text-slate-950">{project?.name || "Project / Service Name"}</h3>
          {project?.category && <p className="mt-1 text-xs text-slate-500">{project.category}</p>}
          <div className="mt-2 space-y-1 text-sm text-slate-600">
            <p>Project Value: {formatCurrency(projectSummary?.projectValue || 0)}</p>
            <p>Already Paid: {formatCurrency(projectSummary?.paid || 0)}</p>
            <p>Pending Against Sent Invoices: {formatCurrency(projectSummary?.pending || 0)}</p>
          </div>
        </div>
      </div>

      {/* Line items */}
      <div className="overflow-hidden rounded-2xl border border-slate-200">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-slate-950 text-white">
            <tr>
              <th className="px-4 py-3">Service Description</th>
              <th className="px-4 py-3 text-right">Base Amount</th>
              <th className="px-4 py-3 text-right">GST</th>
              <th className="px-4 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invoice.serviceItems.map((item) => {
              const amount = safeNumber(item.amount);
              const taxAmount = (amount * safeNumber(item.tax)) / 100;
              return (
                <tr key={item.id}>
                  <td className="px-4 py-4 font-medium text-slate-800">{item.description || "Service item"}</td>
                  <td className="px-4 py-4 text-right text-slate-500">{formatCurrency(amount)}</td>
                  <td className="px-4 py-4 text-right text-slate-500">{item.tax}% ({formatCurrency(taxAmount)})</td>
                  <td className="px-4 py-4 text-right font-bold text-slate-950">{formatCurrency(amount + taxAmount)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer: notes + totals */}
      <div className="mt-6 grid gap-6 md:grid-cols-[1fr_320px]">
        <div className="space-y-4 text-sm text-slate-500">
          {invoice.notes && <InfoBlock title="Notes" value={invoice.notes} />}
          {invoice.terms && <InfoBlock title="Terms" value={invoice.terms} />}
          {(invoice.business?.bankName || invoice.business?.upi) && (
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="mb-2 font-bold text-slate-950">Payment Details</p>
              {invoice.business?.bankName && <p>Bank: {invoice.business.bankName}</p>}
              {invoice.business?.accountName && <p>Account Name: {invoice.business.accountName}</p>}
              {invoice.business?.accountNumber && <p>Account No: {invoice.business.accountNumber}</p>}
              {invoice.business?.ifsc && <p>IFSC: {invoice.business.ifsc}</p>}
              {invoice.business?.upi && <p>UPI: {invoice.business.upi}</p>}
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-slate-950 p-5 text-white">
          <TotalRow label="Subtotal" value={formatCurrency(totals.subtotal)} />
          <TotalRow label="GST" value={formatCurrency(totals.taxTotal)} />
          <TotalRow label="Discount" value={`- ${formatCurrency(totals.discount)}`} />
          <div className="my-4 border-t border-white/15" />
          <TotalRow label="Invoice Total" value={formatCurrency(totals.total)} large />
          <TotalRow label="Paid" value={formatCurrency(totals.paid)} />
          <TotalRow label="Amount Due" value={formatCurrency(totals.due)} large />
        </div>
      </div>
    </div>
  );
}
