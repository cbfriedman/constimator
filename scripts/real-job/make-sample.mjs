// Temporary — generates a synthetic-but-realistically-formatted bid schedule
// PDF plus the matching answer key, so the real pipeline can be exercised
// end to end without a customer document. Deliberately includes the things
// that trip transcription up: a quoted inch mark, wrapped descriptions,
// thousands separators, a dashed lump-sum quantity, an additive alternate,
// and bidder-priced columns the extractor is told to ignore.
import { writeFile, mkdir } from "node:fs/promises"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"

const ITEMS = [
  ["1", "Mobilization", "LS", "—", "00 72 00"],
  ["2", "Traffic Control System", "LS", "—", "12-4"],
  ["3", "Clearing and Grubbing", "AC", "12.4", "17-2"],
  ["4", "Roadway Excavation", "CY", "8,450", "19-2"],
  ["5", "Structure Excavation (Bridge)", "CY", "1,275", "19-3"],
  ["6", "Class 2 Aggregate Base", "TON", "6,200", "26-1"],
  ["7", "Hot Mix Asphalt (Type A)", "TON", "4,850", "39-2"],
  ["8", 'Cold Plane Asphalt Concrete Pavement (2" depth)', "SQYD", "12,300", "39-1"],
  ["9", '18" Reinforced Concrete Pipe, Class III', "LF", "655", "71-2"],
  ["10", 'Storm Drain Inlet, Type "GO"', "EA", "12", "71-3"],
  ["11", "Adjust Manhole Frame and Cover to Grade", "EA", "9", "71-4"],
  ["12", "Minor Concrete (Curb and Gutter, Type A2-6)", "LF", "2,150", "73-2"],
  ["13", "Thermoplastic Traffic Stripe (Details 21, 22, 27B)", "LF", "24,500", "84-2"],
  ["14", "Pavement Marking, Thermoplastic", "SQFT", "1,850", "84-2"],
  ["15", "Roadside Sign, One Post", "EA", "14", "56-2"],
  ["16", "Erosion Control (Hydroseed)", "SQFT", "45,000", "21-1"],
  ["17", "Temporary Construction Entrance", "EA", "3", "13-4"],
  ["A-1", "ALTERNATE: Chain Link Fence, 6 ft", "LF", "1,420", "80-4"],
]

const doc = new jsPDF({ unit: "pt", format: "letter" })

doc.setFontSize(13)
doc.text("SHASTA COUNTY DEPARTMENT OF PUBLIC WORKS", 306, 48, { align: "center" })
doc.setFontSize(11)
doc.text("BID SCHEDULE — SCHEDULE OF ITEMS", 306, 66, { align: "center" })
doc.setFontSize(9)
doc.text("Contract No. 24-118   |   Roadway Improvements, Deschutes Road", 306, 82, {
  align: "center",
})
doc.text(
  "Bidder shall enter a unit price and item total for each item listed below.",
  306,
  98,
  { align: "center" },
)

autoTable(doc, {
  startY: 116,
  head: [["Item\nNo.", "Item Description", "Unit", "Estimated\nQuantity", "Spec.\nSection", "Unit Price", "Item Total"]],
  body: ITEMS.map(([no, desc, unit, qty, spec]) => [no, desc, unit, qty, spec, "", ""]),
  styles: { fontSize: 8, cellPadding: 4, overflow: "linebreak" },
  headStyles: { fillColor: [230, 230, 230], textColor: 20, fontStyle: "bold" },
  columnStyles: {
    0: { cellWidth: 34, halign: "center" },
    1: { cellWidth: 190 },
    2: { cellWidth: 38, halign: "center" },
    3: { cellWidth: 58, halign: "right" },
    4: { cellWidth: 44, halign: "center" },
    5: { cellWidth: 62 },
    6: { cellWidth: 62 },
  },
  theme: "grid",
})

const endY = doc.lastAutoTable.finalY + 24
doc.setFontSize(9)
doc.text("TOTAL BASE BID (Items 1 through 17):  $ ______________________", 56, endY)
doc.text("Note: Items designated ALTERNATE are additive and are not included", 56, endY + 18)
doc.text("in the Total Base Bid.", 56, endY + 30)
doc.text("Bidder: ______________________________   Date: ______________", 56, endY + 60)

await mkdir("scripts/real-job/pdfs", { recursive: true })
await mkdir("scripts/real-job/expected", { recursive: true })
await writeFile("scripts/real-job/pdfs/sample-bid-schedule.pdf", Buffer.from(doc.output("arraybuffer")))

// Answer key, straight from the same source rows. Lump-sum dashes become 1,
// matching what the prompt tells the model to report.
const escape = (v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
const csv = [
  "item,description,unit,quantity,spec_section",
  ...ITEMS.map(([no, desc, unit, qty, spec]) =>
    [no, desc, unit, qty === "—" ? "1" : qty.replace(/,/g, ""), spec].map(escape).join(","),
  ),
].join("\n")
await writeFile("scripts/real-job/expected/sample-bid-schedule.csv", `${csv}\n`)

console.log(`Wrote scripts/real-job/pdfs/sample-bid-schedule.pdf (${ITEMS.length} items)`)
console.log("Wrote scripts/real-job/expected/sample-bid-schedule.csv")
