import { motion } from "framer-motion";
import { Settings } from "lucide-react";

export default function SettingsView({ onReset }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-950">Settings</h1>
        <p className="text-sm text-slate-500">App-level preferences and data management.</p>
      </div>

      <div className="rounded-[2rem] bg-white p-6 shadow-sm">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 mb-4">
          <Settings size={18} />
        </div>
        <h2 className="text-lg font-bold text-slate-950 mb-1">Data Management</h2>
        <p className="text-sm text-slate-500 mb-5">
          All data is stored locally in your browser. Use the option below to reset to sample data for testing.
        </p>
        <button
          onClick={onReset}
          className="rounded-2xl bg-rose-50 px-5 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-100"
        >
          Reset to Sample Data
        </button>
      </div>
    </motion.div>
  );
}
