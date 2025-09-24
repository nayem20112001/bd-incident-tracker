"use client";

import { useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function DownloadCsvButton({ label = "Download CSV" }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Build the CSV URL using current query params (if any)
  const csvUrl = useMemo(() => {
    // Keep all existing filters from the page URL
    const params = new URLSearchParams(searchParams?.toString() || "");
    // Construct absolute URL at runtime so it works on Vercel and locally
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    // API route path
    const apiPath = "/api/incidents.csv";
    const qs = params.toString();
    return origin + apiPath + (qs ? `?${qs}` : "");
  }, [searchParams, pathname]);

  const handleClick = () => {
    // Open in same tab to trigger a download
    window.location.href = csvUrl;
  };

  return (
    <button
      onClick={handleClick}
      className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-gray-50 active:scale-[0.99]"
      aria-label="Download incidents as CSV"
      title="Download incidents as CSV"
    >
      {label}
    </button>
  );
}
