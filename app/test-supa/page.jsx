"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function TestSupa() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("incidents")
        .select("*")
        .order("date", { ascending: false })
        .limit(20);
      if (error) setError(error.message);
      else setRows(data || []);
    })();
  }, []);

  return (
    <main style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1>Supabase Test</h1>
      {error && <p style={{ color: "crimson" }}>Error: {error}</p>}
      <p>{rows.length} incidents</p>
      <ul>
        {rows.map((r) => (
          <li key={r.id}>
            <b>{r.date}</b> — {r.category || "(uncategorized)"} — {r.title || "(no title)"}
          </li>
        ))}
      </ul>
      <p style={{ opacity: 0.7, marginTop: 16 }}>Route: /test-supa</p>
    </main>
  );
}
