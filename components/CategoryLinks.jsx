// components/CategoryLinks.jsx
export default function CategoryLinks({ title, items }) {
  return (
    <div className="rounded-xl border bg-white p-3">
      <h4 className="text-sm font-semibold mb-2">{title}</h4>
      {(!items || items.length === 0) ? (
        <p className="text-sm text-gray-500">No links yet.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {items.map((it) => (
            <li key={it.id} className="leading-snug">
              <a
                href={it.link || "#"}
                target="_blank"
                rel="noreferrer"
                className="underline hover:no-underline"
                title={it.title || ""}
              >
                {it.title || it.link}
              </a>
              <div className="text-[11px] text-gray-500">
                {it.event_date || ""}{it.district ? ` • ${it.district}` : ""}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
