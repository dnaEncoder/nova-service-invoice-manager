export default function TotalRow({ label, value, large = false }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-4">
      <span className={`${large ? "text-base" : "text-sm"} text-white/70`}>{label}</span>
      <span className={`${large ? "text-xl font-black" : "text-sm font-bold"}`}>{value}</span>
    </div>
  );
}
