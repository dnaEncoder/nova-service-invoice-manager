import { motion } from "framer-motion";
import { Building2 } from "lucide-react";
import Input from "../components/ui/Input";
import Section from "../components/ui/Section";

const FIELDS = [
  ["name", "Business Name"],
  ["email", "Email"],
  ["phone", "Phone"],
  ["address", "Address"],
  ["gstin", "GSTIN"],
  ["bankName", "Bank Name"],
  ["accountName", "Account Name"],
  ["accountNumber", "Account Number"],
  ["ifsc", "IFSC"],
  ["upi", "UPI ID"],
];

export default function BusinessSettings({ business, updateBusiness }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-950">Business Details</h1>
        <p className="text-sm text-slate-500">
          These details appear on new invoices. Existing invoices retain the snapshot from when they were created.
        </p>
      </div>
      <Section title="Business &amp; Payment Details" icon={Building2}>
        <div className="grid gap-4 md:grid-cols-2">
          {FIELDS.map(([key, label]) => (
            <Input
              key={key}
              label={label}
              value={business?.[key] || ""}
              onChange={(v) => updateBusiness(key, v)}
            />
          ))}
        </div>
      </Section>
    </motion.div>
  );
}
