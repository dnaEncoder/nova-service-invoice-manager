import { AlertCircle, CheckCircle2, Clock3, FileText, WalletCards, Ban } from "lucide-react";
import { STATUS_STYLES } from "../../lib/constants";

const STATUS_ICONS = {
  Draft: Clock3,
  Sent: FileText,
  "Partially Paid": WalletCards,
  Paid: CheckCircle2,
  Overdue: AlertCircle,
  Voided: Ban,
  Pending: Clock3,
};

export default function StatusBadge({ status }) {
  const Icon = STATUS_ICONS[status] || FileText;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
        STATUS_STYLES[status] || "bg-slate-100 text-slate-700"
      }`}
    >
      <Icon size={13} /> {status}
    </span>
  );
}
