const MAP = {
  pending: { label: 'Pending', cls: 'bg-amber-100 text-amber-700' },
  verified: { label: 'Terverifikasi', cls: 'bg-blue-100 text-blue-700' },
  accepted: { label: 'Diterima', cls: 'bg-emerald-100 text-emerald-700' },
  tarik_berkas: { label: 'Tarik Berkas', cls: 'bg-orange-100 text-orange-700' },
  undur_diri: { label: 'Undur Diri', cls: 'bg-slate-200 text-slate-600' },
};

export default function StatusBadge({ status }) {
  const m = MAP[status] || { label: status || '-', cls: 'bg-slate-100 text-slate-600' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${m.cls}`}>
      {m.label}
    </span>
  );
}