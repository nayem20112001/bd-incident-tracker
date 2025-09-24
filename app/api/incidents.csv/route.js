// app/api/incidents.csv/route.js
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Excel-friendly CSV with UTF-8 BOM
function toCsv(rows, headers) {
  const esc = (v) =>
    v === null || v === undefined ? "" : `"${String(v).replace(/"/g, '""')}"`;
  const lines = [headers.join(",")];
  for (const r of rows || []) lines.push(headers.map((h) => esc(r[h])).join(","));
  return "\uFEFF" + lines.join("\n");
}

// Desired column order if present; we only include ones that exist
const PREFERRED_ORDER = [
  "id",
  "category",
  "event_date",
  "division",   // optional
  "district",   // optional
  "upazila",    // optional
  "place",      // optional
  "title",
  "deaths",
  "injuries",
  "confidence",
  "source_count" // optional
];

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const date_from = searchParams.get("date_from");
  const date_to   = searchParams.get("date_to");
  const category  = searchParams.get("category");
  const division  = searchParams.get("division");
  const district  = searchParams.get("district");

  // 1) Discover available columns using a cheap peek
  const sampleResp = await supabase.from("incidents").select("*").limit(1);
  if (sampleResp.error) {
    return NextResponse.json({ error: sampleResp.error.message }, { status: 500 });
  }

  const cols = sampleResp.data?.[0] ? Object.keys(sampleResp.data[0]) : [];

  // If table has at least one row, pick headers that *actually* exist
  const headersWhenKnown = PREFERRED_ORDER.filter((c) => cols.includes(c));
  // If table is empty, use a very safe minimal set for CSV headers only
  const fallbackHeaders = ["id", "category", "event_date", "title", "deaths", "injuries", "confidence"];

  const headers = cols.length ? headersWhenKnown : fallbackHeaders;

  // 2) Build query: if we know columns, select those; if table empty, just select "*"
  let q = cols.length
    ? supabase.from("incidents").select(headers.join(","))
    : supabase.from("incidents").select("*");

  q = q.order("event_date", { ascending: false }).limit(1000);

  // 3) Apply filters only if the column exists (skip harmlessly otherwise)
  if (date_from && (cols.length === 0 || cols.includes("event_date"))) q = q.gte("event_date", date_from);
  if (date_to   && (cols.length === 0 || cols.includes("event_date"))) q = q.lte("event_date", date_to);
  if (category  && (cols.length === 0 || cols.includes("category")))   q = q.eq("category", category);
  if (division  && cols.includes("division"))                          q = q.eq("division", division);
  if (district  && cols.includes("district"))                          q = q.eq("district", district);

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If we selected "*", trim to the headers we actually want in the CSV
  const rows = cols.length ? data : (data || []).map((r) => {
    const out = {};
    for (const h of fallbackHeaders) out[h] = r[h];
    return out;
  });

  // 4) Nice filename reflecting filters
  const today = new Date().toISOString().slice(0, 10);
  const clean = (s) =>
    (s || "all").toString().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").slice(0, 40);
  const partDates = [clean(date_from || "start"), "to", clean(date_to || today)].join("_");
  const partCat = clean(category);
  const filename = `incidents_${partDates}_${partCat}.csv`;

  const csv = toCsv(rows, headers);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  });
}
