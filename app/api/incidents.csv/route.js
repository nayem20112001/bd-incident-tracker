// app/api/incidents.csv/route.js
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Excel-friendly CSV with UTF-8 BOM
function toCsv(rows, headers) {
  const esc = (v) => (v === null || v === undefined) ? "" : `"${String(v).replace(/"/g,'""')}"`;
  const lines = [headers.join(",")];
  for (const r of rows || []) lines.push(headers.map(h => esc(r[h])).join(","));
  return "\uFEFF" + lines.join("\n");
}

// Desired column order if present in your table.
// We'll only include the ones that actually exist.
const PREFERRED_ORDER = [
  "id",
  "category",
  "event_date",
  "division",   // optional
  "district",   // optional
  "upazila",    // optional, in case you used this
  "place",      // optional
  "title",
  "deaths",
  "injuries",
  "confidence",
  "source_count" // optional
];

export async function GET(req) {
  // Parse query params
  const { searchParams } = new URL(req.url);
  const date_from = searchParams.get("date_from");
  const date_to   = searchParams.get("date_to");
  const category  = searchParams.get("category");
  const division  = searchParams.get("division");
  const district  = searchParams.get("district");

  // 1) Peek one row to discover actual column names
  const sampleResp = await supabase
    .from("incidents")
    .select("*")
    .limit(1);

  if (sampleResp.error) {
    return NextResponse.json({ error: sampleResp.error.message }, { status: 500 });
  }

  // Columns present in your table
  const cols = sampleResp.data?.[0] ? Object.keys(sampleResp.data[0]) : [];

  // If table is empty, fall back to a safe minimal header set
  const headers = (cols.length ? PREFERRED_ORDER.filter(c => cols.includes(c)) : [
    "id","category","event_date","title","deaths","injuries","confidence"
  ]);

  // 2) Build the real select list from available columns
  let q = supabase.from("incidents").select(headers.join(",")).order("event_date", { ascending: false }).limit(1000);

  // 3) Apply filters only if the column exists
  if (date_from && cols.includes("event_date")) q = q.gte("event_date", date_from);
  if (date_to   && cols.includes("event_date")) q = q.lte("event_date", date_to);
  if (category  && cols.includes("category"))   q = q.eq("category", category);
  if (division  && cols.includes("division"))   q = q.eq("division", division);
  if (district  && cols.includes("district"))   q = q.eq("district", district);

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const csv = toCsv(data, headers);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="incidents.csv"'
    }
  });
}
