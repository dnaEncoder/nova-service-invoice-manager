export default function Textarea({ label, value, onChange, rows = 4, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">{label}</span>
      <textarea
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full resize-none rounded-2xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-800 outline-none ring-blue-100 transition focus:ring-4"
      />
    </label>
  );
}
