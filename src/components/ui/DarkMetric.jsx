export default function DarkMetric({ label, value }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3">
      <span className="text-sm text-white/65">{label}</span>
      <span className="font-black text-white">{value}</span>
    </div>
  );
}
