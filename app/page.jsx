// app/page.jsx  (plain JS version)

import { supabase } from "./lib/supabaseClient"      // file is at app/lib/supabaseClient.js
import IncidentCard from "../components/incident-card" // file is at components/incident-card.jsx


async function getIncidents() {
  const { data, error } = await supabase
    .from("incidents")
   .select("id, event_date, category, location, title, reported_dead, reported_injured")
.order("event_date", { ascending: false })
    .limit(24)

  return { error: error ? error.message : null, rows: data || [] }
}

export default async function HomePage() {
  const { error, rows } = await getIncidents()

  return (
    <div>
      <section className="mb-4">
        <h1 className="text-2xl font-bold mb-1">BD Incident Tracker</h1>
        <p className="text-sm text-gray-600">Phase C: basic list</p>
        {error && <p className="text-red-600 mt-2">Error: {error}</p>}
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {rows.map((i) => <IncidentCard key={i.id} i={i} />)}
        {rows.length === 0 && !error && (
          <div className="text-sm text-gray-600">
            No incidents yet. Add one in Supabase → Table Editor → <b>incidents</b> → Insert row, then refresh.
          </div>
        )}
      </div>
    </div>
  )
}
