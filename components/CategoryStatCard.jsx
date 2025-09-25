// components/CategoryStatCard.jsx
export default function CategoryStatCard({
  title,
  incidents = 0,
  dead = 0,
  injured = 0,
  selected = false,
  onClick
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "w-full text-left rounded-xl border p-3 transition",
        "bg-sky-50 border-sky-200 text-sky-900",
        selected ? "ring-2 ring-sky-400" : "hover:bg-sky-100"
      ].join(" ")}
    >
      <h3 className="text-sm font-semibold mb-1">{title}</h3>
      <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
        <div className="rounded-md bg-white/60 border border-sky-200 py-1">
          <div className="font-semibold text-sm">{incidents}</div>
          <div className="opacity-80">Incidents</div>
        </div>
        <div className="rounded-md bg-white/60 border border-sky-200 py-1">
          <div className="font-semibold text-sm">{dead}</div>
          <div className="opacity-80">Deaths</div>
        </div>
        <div className="rounded-md bg-white/60 border border-sky-200 py-1">
          <div className="font-semibold text-sm">{injured}</div>
          <div className="opacity-80">Injured</div>
        </div>
      </div>
    </button>
  );
}
