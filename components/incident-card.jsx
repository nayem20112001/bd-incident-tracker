"use client"
import { useState } from "react"

export default function IncidentCard({ i }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="bg-white rounded-2xl shadow-sm border p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-accident text-white">
          {i.category || "unknown"}
        </span>
        <span className="text-xs text-gray-600 ml-auto">{i.event_date || ""}</span>
      </div>

      <div className="font-semibold line-clamp-2">{i.title || "Untitled incident"}</div>
      <div className="text-sm text-gray-600">{i.location || ""}</div>

      <div className="mt-2 text-sm">
        <span>Deaths: <b>{i.reported_dead ?? 0}</b></span>
        <span className="ml-3">Injuries: <b>{i.reported_injured ?? 0}</b></span>
      </div>
    </div>
  )
}
