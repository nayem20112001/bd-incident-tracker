// pages/api/incidents.csv.js
import { createClient } from "@supabase/supabase-js";

// Uses your existing public envs from Phase C
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Minimal CSV encoder with Excel-friendly UTF-8 BOM
function toCsv(rows) {
  const headers = [
    "id",
    "category",
    "event_date",
    "division",
    "district",
    "title",
    "deaths",
    "injuries",
    "confidence"
  ];

  const esc = (v) => {
    if (v === null || v === undefined) return "";
    return `"${String(v).replace(/"/g, '""')}"`;
  };

  const lines = [headers.join(",")];
  for (const r of rows || []) {
    lines.push(headers.map((h) => esc(r[h])).join(","));
  }

  // Prepend BOM so Excel on Windows reads Bangla correctly
  return "\uFEFF" + lines.join("\n");
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { date_from, date_to, category, division } = req.query;

  let q = supabase
    .from("incidents")
    .select(
      "id,category,event_date,division,district,title,deaths,injuries,confidence"
    )
    .order("event_date", { ascending: false })
    .limit(1000); // safety cap; adjust later if needed

  if (date_from) q = q.gte("event_date", date_from);
  if (date_to) q = q.lte("event_date", date_to);
  if (category) q = q.eq("category", category);
  if (division) q = q.eq("division", division);

  const { data, error } = await q;

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const csv = toCsv(data);

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="incidents.csv"');
  return res.status(200).send(csv);
}
