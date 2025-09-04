"use client";

import { useEffect, useState } from "react";
import { getBrowserClient } from "../lib/supabaseClient";

export default function Home() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const client = getBrowserClient();
    if (!client) {
      setError("Missing NEXT_PUBLIC_SUPABASE_* env vars");
      setLoading(false);
      return;
    }
    (async () => {
      const { data, error } = await client
        .from("incidents")
        .select("*")
        .order("date", { ascending: false })
        .limit(50);
      if (error) setError(error.message);
      else setRows(data || []);
      setLoading(false);
    })();
  }, []);

  return (
    <main style={{ maxWidth: 780, margin: "40px auto", padding: "0 20px", fontFamily: "system-ui, sans-serif" }}>
      <h1>BD Incident Tracker</h1>
      <p style={{ opacity: 0.75, marginTop: 4 }}>Phase B: basic list</p>

      {loading && <p>Loading…</p>}
      {error && <p style={{ color: "crimson" }}>Error: {error}</p>}

      <ul style={{ listStyle: "none", padding: 0, marginTop: 16 }}>
        {rows.map((r) => (
          <li key={r.id} style={{ padding: "12px 0", borderBottom: "1px solid #e5e7eb" }}>
            <div style={{ fontSize: 14, opacity: 0.7 }}>
              {r.date} • {r.location || "Unknown"} • {r.category || "uncategorized"}
            </div>
            <div style={{ fontWeight: 600 }}>{r.title || "(no title)"}</div>
            {r.source_url && (
              <a href={r.source_url} target="_blank" rel="noreferrer" style={{ fontSize: 14 }}>
                Source ↗
              </a>
            )}
          </li>
        ))}
      </ul>

      {!loading && rows.length === 0 && (
        <p style={{ marginTop: 16, opacity: 0.8 }}>
          No incidents yet. Add one in Supabase → Table Editor → <b>incidents</b> → Insert row, then refresh.
        </p>
      )}
    </main>
  );
}
