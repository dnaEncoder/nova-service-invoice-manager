export default function SmallMetric({ label, value, highlight = false }) {
  return (
    <div className={`rounded-2xl p-3 shadow-sm ring-1 ${highlight ? "bg-blue-50 ring-blue-100" : "bg-white ring-slate-100"}`}>
      <p className="text-xs font-semibold text-slate-400">{label}</p>
      <p className={`mt-1 text-sm font-black ${highlight ? "text-blue-700" : "text-slate-950"}`}>{value}</p>
    </div>
  );
}
