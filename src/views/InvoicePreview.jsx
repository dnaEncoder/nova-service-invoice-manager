import { motion } from "framer-motion";
import { Download, Loader2, Pencil, AlertCircle } from "lucide-react";
import { BlobProvider } from "@react-pdf/renderer";
import { getProjectSummary } from "../lib/calculations";
import { InvoiceDocument } from "./InvoicePDF";
import InvoicePaper from "./InvoicePaper";

export default function InvoicePreview({ data, invoice, client, project, onBack, onEdit }) {
  const projectSummary = getProjectSummary(project, data.invoices, data.payments);
  const fileName = `${invoice.invoiceNo || "invoice"}.pdf`;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <div className="no-print mb-4 flex flex-col gap-3 rounded-[2rem] bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-950">Invoice Preview</h2>
          <p className="text-sm text-slate-500">
            Review the invoice before downloading. The PDF matches exactly what you see below.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={onBack}
            className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
          >
            Back
          </button>
          <button
            onClick={onEdit}
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
          >
            <Pencil size={16} /> Edit
          </button>

          <BlobProvider
            document={
              <InvoiceDocument
                invoice={invoice}
                client={client}
                project={project}
                projectSummary={projectSummary}
                allPayments={data.payments}
              />
            }
          >
            {({ blob, url, loading, error }) => {
              function handleDownload() {
                if (!url) return;
                const a = document.createElement("a");
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              }
              return (
                <button
                  onClick={handleDownload}
                  disabled={loading || !!error}
                  className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold text-white transition ${
                    loading
                      ? "cursor-wait bg-slate-400"
                      : error
                      ? "cursor-not-allowed bg-red-400"
                      : "bg-slate-950 hover:bg-slate-800"
                  }`}
                  title={error ? `PDF error: ${error.message}` : undefined}
                >
                  {loading ? (
                    <><Loader2 size={16} className="animate-spin" /> Preparing PDF…</>
                  ) : error ? (
                    <><AlertCircle size={16} /> PDF Error</>
                  ) : (
                    <><Download size={16} /> Download PDF</>
                  )}
                </button>
              );
            }}
          </BlobProvider>
        </div>
      </div>

      <InvoicePaper
        invoice={invoice}
        client={client}
        project={project}
        projectSummary={projectSummary}
        allPayments={data.payments}
      />
    </motion.div>
  );
}
