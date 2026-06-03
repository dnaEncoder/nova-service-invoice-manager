export default function Input({ label, value, onChange, type = "text", placeholder = "", className = "", readOnly = false }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">{label}</span>
      <input
        type={type}
        value={value ?? ""}
        placeholder={placeholder}
        readOnly={readOnly}
        onChange={(e) => onChange?.(e.target.value)}
        className={`h-11 w-full rounded-2xl bg-slate-100 px-4 text-sm font-medium text-slate-800 outline-none ring-blue-100 transition placeholder:text-slate-400 focus:ring-4 ${
          readOnly ? "cursor-not-allowed text-slate-500" : ""
        }`}
      />
    </label>
  );
}
