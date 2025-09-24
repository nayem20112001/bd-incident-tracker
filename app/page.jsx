// app/page.jsx (App Router, plain JS)

import { supabase } from "./lib/supabaseClient";               // app/lib/supabaseClient.js
import IncidentCard from "../components/incident-card";        // components/incident-card.jsx
import DownloadCsvButton from "../components/DownloadCsvButton"; // components/DownloadCsvButton.jsx

async function getIncidents() {
  const { data, error } = await supabase
    .from("incidents")
    .select("id, event_date, category, location, title, reported_dead, reported_injured")
    .order("event_date", { ascending: false })
    .limit(24);

  return { error: error ? error.message : null, rows: data || [] };
}

export default async function HomePage() {
  const { error, rows } = await getIncidents();

  return (
    <main className="p-6 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">BD Incident Tracker</h1>
          <p className="text-sm text-gray-600">Phase C: basic list</p>
          {error && <p className="text-red-600 mt-2">Error: {error}</p>}
        </div>

        {/* Downloads a CSV using current URL filters (if any) */}
        <DownloadCsvButton />
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {rows.map(i => <IncidentCard key={i.id} i={i} />)}
        {rows.length === 0 && !error && (
          <div className="text-sm text-gray-600">
            No incidents yet. Add one in Supabase → Table Editor → <b>incidents</b> → Insert row, then refresh.
          </div>
        )}
      </section>
    </main>
  );
}
