export default function Select({ label, value, onChange, options, className = "" }) {
  const normalized = options.map((o) =>
    typeof o === "string" ? { label: o, value: o } : o
  );

  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">{label}</span>
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-2xl bg-slate-100 px-4 text-sm font-medium text-slate-800 outline-none ring-blue-100 transition focus:ring-4"
      >
        {normalized.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}
