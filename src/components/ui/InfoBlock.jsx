export default function InfoBlock({ title, value }) {
  return (
    <div>
      <p className="mb-1 font-bold text-slate-950">{title}</p>
      <p className="text-slate-500">{value}</p>
    </div>
  );
}
