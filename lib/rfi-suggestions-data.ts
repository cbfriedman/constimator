export type RfiSeverity = "high" | "medium" | "low"

export type RfiSuggestion = {
  id: string
  title: string
  severity: RfiSeverity
  source: string
  flag: string
  rfiText: string
}

// Hand-drafted for the Shasta County sample project — Risks & RFIs isn't a
// real extraction feature yet (see risks-tab.tsx), so this is fictional
// content gated to that one demo project, not a real capability applied to
// any other project. In the real product these would come from AI reading
// the uploaded plans/specs/geotech against the bid form, not from this file.
export const rfiSuggestions: RfiSuggestion[] = [
  {
    id: "rcp-storm-drain-qty",
    title: 'Quantity discrepancy: 18" RCP Storm Drain',
    severity: "medium",
    source: "Bid Item 8 · Official Bid Form vs. Sheet C-301",
    flag: 'The official bid form lists 640 LF of 18" RCP Class III. The storm drain profile on Sheet C-301 totals 655 LF across the three runs (SD-1: 220 LF, SD-2: 185 LF, SD-3: 250 LF). A 15 LF (2.3%) discrepancy.',
    rfiText:
      'Bid Item 8 (18" RCP Class III) lists a quantity of 640 LF on the official bid form. The storm drain profile on Sheet C-301 appears to total 655 LF across runs SD-1 through SD-3. Please confirm whether the bid quantity of 640 LF is correct, or whether it should be revised to reflect the plan profile. If 640 LF governs, please confirm whether the additional 15 LF (inlet connections) is incidental to another item.',
  },
  {
    id: "roadside-sign-count",
    title: "Plan conflict: Roadside Sign count",
    severity: "medium",
    source: "Bid Item 13 · Bid Form vs. Sign Schedule (Sheet C-602)",
    flag: "The official bid form lists 14 roadside signs (one post). The sign schedule on Sheet C-602 shows 15 signs. The 15th appears to be a relocated existing sign, which may or may not be included in this bid item.",
    rfiText:
      "Bid Item 13 (Roadside Sign, One Post) lists a quantity of 14 EA. The sign schedule on Sheet C-602 appears to show 15 signs, including one relocated existing sign. Please confirm whether the relocated sign is included in Bid Item 13, or whether sign relocation is a separate pay item or incidental.",
  },
  {
    id: "cold-plane-grind-depth",
    title: "Grind depth conflict: Cold Plane",
    severity: "low",
    source: "Bid Item 7 · Sheet C-201 vs. Detail on C-501",
    flag: 'Cold Plane AC quantities (12,300 SY) appear based on a 2" grind depth. However, the intersection detail on Sheet C-501 shows a 2.5" grind depth at intersections. This affects HMA overlay quantities and cost.',
    rfiText:
      "Cold Plane AC (Bid Item 7) quantities appear to be based on a 2-inch grind depth. The intersection detail on Sheet C-501 indicates a 2.5-inch grind depth at intersections. Please confirm the intended grind depth at intersections and whether the additional depth is reflected in the bid quantities for cold planing and HMA overlay.",
  },
  {
    id: "dewatering-missing-scope",
    title: "Missing scope / risk: Dewatering not in bid schedule",
    severity: "high",
    source: "Geotechnical Report p.22 vs. Bid Schedule",
    flag: 'The geotechnical report indicates groundwater at approximately 4 ft in the drainage improvement area. The 18" RCP trench depth (5–7 ft) would extend below groundwater, likely requiring dewatering — but no dewatering bid item exists on the official bid form.',
    rfiText:
      'The geotechnical report (p.22) indicates groundwater at approximately 4 feet in the area of the proposed storm drain improvements. The 18" RCP trench depth appears to extend below the groundwater elevation, which may require dewatering. No dewatering pay item is included in the bid schedule. Please confirm how dewatering, if required, should be addressed — whether incidental to the pipe items or added as a separate bid item by addendum.',
  },
  {
    id: "missing-information-note",
    title: "Missing information note",
    severity: "low",
    source: "Specifications review",
    flag: "Two items could not be located in the bid documents: (1) soil disposal site designation, and (2) utility potholing responsibility.",
    rfiText:
      "Please confirm (1) the designated disposal site for excess excavated material, and (2) responsibility for utility potholing/verification prior to construction, as these do not appear to be specified in the contract documents.",
  },
]
