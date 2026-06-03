export default function Section({ title, icon: Icon, children }) {
  return (
    <div className="rounded-[2rem] bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
          <Icon size={18} />
        </div>
        <h2 className="text-lg font-bold text-slate-950">{title}</h2>
      </div>
      {children}
    </div>
  );
}
