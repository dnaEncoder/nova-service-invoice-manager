import {
  Banknote,
  BarChart3,
  Building2,
  FileText,
  LayoutDashboard,
  ReceiptText,
  Settings,
  Users,
  WalletCards,
} from "lucide-react";

const NAV_ITEMS = [
  { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { id: "clients", icon: Users, label: "Clients" },
  { id: "invoices", icon: FileText, label: "Invoices" },
  { id: "payments", icon: WalletCards, label: "Payments" },
  { id: "expenses", icon: Banknote, label: "Expenses" },
  { id: "business", icon: Building2, label: "Business Details" },
  { id: "reports", icon: BarChart3, label: "Reports" },
  { id: "settings", icon: Settings, label: "Settings" },
];

// Sub-views map to their parent nav item
const VIEW_TO_NAV = {
  editor: "invoices",
  preview: "invoices",
  billingSetup: "clients",
  projectDetail: "clients",
};

export default function Sidebar({ view, onNavigate, business }) {
  const activeNav = VIEW_TO_NAV[view] || view;
  const initials = (business?.name || "NS")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <aside className="no-print flex h-screen w-56 flex-shrink-0 flex-col bg-slate-950 text-white sticky top-0">
      {/* Brand */}
      <div className="px-4 pt-5 pb-4 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600">
            <ReceiptText size={16} />
          </div>
          <div>
            <p className="text-sm font-bold leading-tight">Invoice Manager</p>
            <p className="text-[10px] text-white/40 leading-tight">Service &amp; Project Tracker</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
        {NAV_ITEMS.map(({ id, icon: Icon, label }) => {
          const isActive = activeNav === id;
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-white/10 text-white"
                  : "text-white/50 hover:bg-white/5 hover:text-white/80"
              }`}
            >
              <Icon size={17} />
              {label}
            </button>
          );
        })}
      </nav>

      {/* User profile */}
      <div className="border-t border-white/10 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{business?.name || "Nova Studios"}</p>
            <p className="truncate text-[11px] text-white/40">{business?.email || ""}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
