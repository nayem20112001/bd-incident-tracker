// app/api/incidents.csv/route.js
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Minimal CSV encoder with Excel-friendly UTF-8 BOM
function toCsv(rows) {
  const headers = [
    "id","category","event_date","district","title","deaths","injuries","confidence"
  ];
  const esc = (v) => (v === null || v === undefined) ? "" : `"${String(v).replace(/"/g,'""')}"`;
  const lines = [headers.join(",")];
  for (const r of rows || []) lines.push(headers.map(h => esc(r[h])).join(","));
  return "\uFEFF" + lines.join("\n");
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const date_from = searchParams.get("date_from");
  const date_to = searchParams.get("date_to");
  const category = searchParams.get("category");
  // division intentionally not used; your table doesn't have that column

  let q = supabase
    .from("incidents")
    .select("id,category,event_date,district,title,deaths,injuries,confidence")
    .order("event_date", { ascending: false })
    .limit(1000);

  if (date_from) q = q.gte("event_date", date_from);
  if (date_to) q = q.lte("event_date", date_to);
  if (category) q = q.eq("category", category);

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const csv = toCsv(data);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="incidents.csv"'
    }
  });
}
