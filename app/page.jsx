// app/page.jsx (App Router)

import { Suspense } from "react";
import { supabase } from "./lib/supabaseClient";                 // app/lib/supabaseClient.js
import IncidentCard from "../components/incident-card";          // components/incident-card.jsx
import DownloadCsvButton from "../components/DownloadCsvButton"; // components/DownloadCsvButton.jsx
import CategoryStatCard from "../components/CategoryStatCard";   // components/CategoryStatCard.jsx

export const dynamic = "force-dynamic";

// Map internal category keys to display labels
const CATEGORY_LABELS = {
  road_accident: "Road Accident",
  fire: "Fire",
  crime: "Crime",
  flood: "Flood",
  other: "Other"
};

// Pull recent incidents for list (unchanged, just neat)
async function getIncidents() {
  const { data, error } = await supabase
    .from("incidents")
    .select("id, event_date, category, location, title, reported_dead, reported_injured")
    .order("event_date", { ascending: false })
    .limit(24);

  return { error: error ? error.message : null, rows: data || [] };
}

// Pull a slice to aggregate stats; keep it simple and fast.
// If your table is big later, we’ll switch this to SQL aggregation.
async function getCategoryStats() {
  const { data, error } = await supabase
    .from("incidents")
    .select("id, category, reported_dead, reported_injured")
    .limit(1000);

  if (error) return { error: error.message, stats: {} };

  const stats = {};
  for (const r of data) {
    const key = r.category || "other";
    if (!stats[key]) stats[key] = { incidents: 0, dead: 0, injured: 0 };
    stats[key].incidents += 1;
    stats[key].dead += Number(r.reported_dead || 0);
    stats[key].injured += Number(r.reported_injured || 0);
  }
  return { error: null, stats };
}

export default async function HomePage() {
  const [{ error, rows }, { stats }] = await Promise.all([
    getIncidents(),
    getCategoryStats()
  ]);

  // Build a nice, predictable order for summary cards
  const orderedKeys = ["road_accident", "fire", "crime", "flood", "other"].filter(k => stats?.[k]);

  return (
    <main className="p-6 space-y-5">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">BD Incident Tracker</h1>
          <p className="text-sm text-gray-600">Live feed + quick stats</p>
          {error && <p className="text-red-600 mt-2">Error: {error}</p>}
        </div>
        <Suspense fallback={<span className="text-sm text-gray-500">Preparing CSV…</span>}>
          <DownloadCsvButton />
        </Suspense>
      </header>

      {/* Sky blue category blocks */}
      {orderedKeys.length > 0 && (
        <section className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {orderedKeys.map(k => {
            const s = stats[k];
            return (
              <CategoryStatCard
                key={k}
                title={CATEGORY_LABELS[k] || k}
                incidents={s.incidents}
                dead={s.dead}
                injured={s.injured}
              />
            );
          })}
        </section>
      )}

      {/* Incident cards grid: mobile=3, desktop wider */}
      <section className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
        {rows.map(i => <IncidentCard key={i.id} i={i} />)}
        {rows.length === 0 && !error && (
          <div className="col-span-full text-sm text-gray-600">
            No incidents yet. Add one in Supabase → Table Editor → <b>incidents</b> → Insert row, then refresh.
          </div>
        )}
      </section>
    </main>
  );
}
