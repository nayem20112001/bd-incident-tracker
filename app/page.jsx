// app/page.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabaseClient";
import CategoryStatCard from "../components/CategoryStatCard";
import CategoryLinks from "../components/CategoryLinks";

const CATEGORY_LABELS = {
  road_accident: "Road Accident",
  fire: "Fire",
  crime: "Crime",
  flood: "Flood",
  other: "Other"
};

const ORDER = ["road_accident", "fire", "crime", "flood", "other"];

export default function HomePage() {
  const [stats, setStats] = useState({});
  const [loadingStats, setLoadingStats] = useState(true);

  const [selected, setSelected] = useState(null); // category key
  const [links, setLinks] = useState([]);         // items for selected category
  const [loadingLinks, setLoadingLinks] = useState(false);

  // 1) Fetch up to 1000 incidents and aggregate on client (cheap + simple)
  useEffect(() => {
    let isMounted = true;
    (async () => {
      setLoadingStats(true);
      const { data, error } = await supabase
        .from("incidents")
        .select("id, category, reported_dead, reported_injured")
        .limit(1000);
      if (!isMounted) return;
      if (error) {
        console.error(error.message);
        setStats({});
        setLoadingStats(false);
        return;
      }
      const agg = {};
      for (const r of data || []) {
        const k = r.category || "other";
        if (!agg[k]) agg[k] = { incidents: 0, dead: 0, injured: 0 };
        agg[k].incidents += 1;
        agg[k].dead += Number(r.reported_dead || 0);
        agg[k].injured += Number(r.reported_injured || 0);
      }
      setStats(agg);
      setLoadingStats(false);
    })();
    return () => { isMounted = false; };
  }, []);

  const orderedKeys = useMemo(
    () => ORDER.filter(k => stats[k]).concat(
      Object.keys(stats).filter(k => !ORDER.includes(k))
    ),
    [stats]
  );

  // 2) When a category is selected, fetch its links (title + link only)
  useEffect(() => {
    if (!selected) return;
    let isMounted = true;
    (async () => {
      setLoadingLinks(true);
      const { data, error } = await supabase
        .from("incidents")
        .select("id, title, link, event_date, district")
        .eq("category", selected)
        .not("link", "is", null)
        .order("event_date", { ascending: false })
        .limit(50);
      if (!isMounted) return;
      if (error) {
        console.error(error.message);
        setLinks([]);
        setLoadingLinks(false);
        return;
      }
      setLinks(data || []);
      setLoadingLinks(false);
    })();
    return () => { isMounted = false; };
  }, [selected]);

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-1">BD Incident Tracker</h1>
      <p className="text-sm text-gray-600 mb-4">Category overview. Click a block to see links.</p>

      {/* Desktop: 2-col layout (blocks left, links right). Mobile: single column. */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* LEFT: category blocks (spans 2 cols on desktop) */}
        <section className="md:col-span-2 space-y-4">
          {loadingStats ? (
            <p className="text-sm text-gray-500">Loading categories…</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {orderedKeys.map(k => {
                const s = stats[k];
                const title = CATEGORY_LABELS[k] || k;
                const isSel = selected === k;
                return (
                  <div key={k} className="space-y-3">
                    <CategoryStatCard
                      title={title}
                      incidents={s.incidents}
                      dead={s.dead}
                      injured={s.injured}
                      selected={isSel}
                      onClick={() => setSelected(isSel ? null : k)}
                    />
                    {/* Mobile: show links under the block */}
                    {isSel && (
                      <div className="md:hidden">
                        {loadingLinks ? (
                          <div className="text-sm text-gray-500">Loading links…</div>
                        ) : (
                          <CategoryLinks title={`${title} — Links`} items={links} />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* RIGHT: desktop side pane for links */}
        <aside className="hidden md:block">
          {!selected ? (
            <div className="rounded-xl border p-3 text-sm text-gray-500">
              Click a category to see links.
            </div>
          ) : loadingLinks ? (
            <div className="rounded-xl border p-3 text-sm text-gray-500">Loading links…</div>
          ) : (
            <CategoryLinks
              title={`${CATEGORY_LABELS[selected] || selected} — Links`}
              items={links}
            />
          )}
        </aside>
      </div>
    </main>
  );
}
